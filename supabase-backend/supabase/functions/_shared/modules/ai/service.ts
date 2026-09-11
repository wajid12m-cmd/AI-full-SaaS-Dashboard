// Deno port of services/aiService.js's chat functions, extended with real
// "conversation" support (previously every prompt/response for a user sat
// in one flat, never-separated list) and free text-to-image generation.
import sql from "../../db.ts";
import groq from "../../groq.ts";
import { checkQuota } from "../../quota.ts";

const MAX_OUTPUT_TOKENS = 1024;

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
type Conversation = any;

export async function listConversationsService(userId: number): Promise<Conversation[]> {
  return await sql`
    SELECT "id", "title", "pinned", "createdAt", "updatedAt"
    FROM "Conversation"
    WHERE "userId" = ${userId}
    ORDER BY "pinned" DESC, "updatedAt" DESC
  `;
}

async function getOwnedConversation(userId: number, conversationId: number): Promise<Conversation> {
  const [conversation] = await sql`
    SELECT * FROM "Conversation" WHERE "id" = ${conversationId} AND "userId" = ${userId}
  `;
  if (!conversation) {
    throw new Error("Conversation not found");
  }
  return conversation;
}

export async function createConversationService(userId: number, title?: string): Promise<Conversation> {
  const [conversation] = await sql`
    INSERT INTO "Conversation" ("userId", "title")
    VALUES (${userId}, ${title && title.trim() ? title.trim() : "New chat"})
    RETURNING "id", "title", "pinned", "createdAt", "updatedAt"
  `;
  return conversation;
}

// Used by the chat/image controllers: reuses an existing (owned) conversation
// if a conversationId was passed, otherwise silently creates a new one
// titled after the first prompt — this is what makes "just start typing"
// behave like ChatGPT's implicit new-chat creation.
export async function ensureConversation(
  userId: number,
  conversationId: number | undefined | null,
  firstPrompt: string
): Promise<number> {
  if (conversationId) {
    const conversation = await getOwnedConversation(userId, conversationId);
    return conversation.id;
  }
  const title = firstPrompt.length > 60 ? `${firstPrompt.slice(0, 57)}...` : firstPrompt;
  const conversation = await createConversationService(userId, title);
  return conversation.id;
}

export async function getConversationMessagesService(userId: number, conversationId: number) {
  await getOwnedConversation(userId, conversationId);
  return await sql`
    SELECT "id", "prompt", "response", "imageUrls", "createdAt"
    FROM "AiHistory"
    WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
    ORDER BY "createdAt" ASC
  `;
}

export async function renameConversationService(
  userId: number,
  conversationId: number,
  title: string
): Promise<Conversation> {
  await getOwnedConversation(userId, conversationId);
  const [conversation] = await sql`
    UPDATE "Conversation" SET "title" = ${title}, "updatedAt" = now()
    WHERE "id" = ${conversationId}
    RETURNING "id", "title", "pinned", "createdAt", "updatedAt"
  `;
  return conversation;
}

export async function setConversationPinService(
  userId: number,
  conversationId: number,
  pinned: boolean
): Promise<Conversation> {
  await getOwnedConversation(userId, conversationId);
  const [conversation] = await sql`
    UPDATE "Conversation" SET "pinned" = ${pinned}
    WHERE "id" = ${conversationId}
    RETURNING "id", "title", "pinned", "createdAt", "updatedAt"
  `;
  return conversation;
}

export async function deleteConversationService(userId: number, conversationId: number): Promise<void> {
  await getOwnedConversation(userId, conversationId);
  await sql`DELETE FROM "Conversation" WHERE "id" = ${conversationId}`;
}

// ---------------------------------------------------------------------------
// Chat (text)
// ---------------------------------------------------------------------------

export async function generateAIResponseService(
  userId: number,
  prompt: string,
  conversationId?: number | null
): Promise<{ response: string; conversationId: number }> {
  await checkQuota(userId);
  const convId = await ensureConversation(userId, conversationId, prompt);

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "openai/gpt-oss-120b",
      max_tokens: MAX_OUTPUT_TOKENS,
    });

    const response = completion.choices[0]?.message?.content || "";

    await sql`
      INSERT INTO "AiHistory" ("prompt", "response", "userId", "conversationId")
      VALUES (${prompt}, ${response}, ${userId}, ${convId})
    `;
    await sql`UPDATE "Conversation" SET "updatedAt" = now() WHERE "id" = ${convId}`;

    return { response, conversationId: convId };
  } catch (err) {
    console.error("========== GROQ ERROR ==========");
    console.error(err);
    throw new Error("Failed to generate AI response");
  }
}

// Quota + conversation resolution are deliberately done by the CALLER
// (controller) before this is invoked — see controller.ts's
// generateContentStream for why: both need to happen *before* any
// streaming Response has been constructed, since headers go out with the
// first chunk and there's no going back to a clean JSON error/response after.
export function createChatStream(userId: number, conversationId: number, prompt: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullResponse = "";

      try {
        const stream = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "openai/gpt-oss-120b",
          max_tokens: MAX_OUTPUT_TOKENS,
          stream: true,
        });

        for await (const part of stream) {
          const content = part.choices[0]?.delta?.content || "";
          if (content) {
            fullResponse += content;
            controller.enqueue(encoder.encode(content));
          }
        }

        // Poora response mil jane ke baad database mein save karo
        await sql`
          INSERT INTO "AiHistory" ("prompt", "response", "userId", "conversationId")
          VALUES (${prompt}, ${fullResponse}, ${userId}, ${conversationId})
        `;
        await sql`UPDATE "Conversation" SET "updatedAt" = now() WHERE "id" = ${conversationId}`;
        controller.close();
      } catch (err) {
        console.error("========== GROQ STREAM ERROR ==========");
        console.error(err);
        // Headers are already sent by this point (the Response with this
        // stream as its body went out as soon as the first chunk did) —
        // same reason the original wrote the error into the stream body
        // instead of switching to a JSON error response.
        controller.enqueue(encoder.encode(`\n\n[ERROR]: Failed to generate AI response`));
        controller.close();
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------
// Uses Pollinations.ai's free, keyless image endpoint (no account/billing
// needed). It's a plain GET URL that returns an image, so the frontend can
// render it directly in an <img> tag — no proxying/binary handling needed
// here. We just build the URLs, persist them against the conversation, and
// hand them back.
const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

function buildImageUrl(prompt: string, seed: number): string {
  const encoded = encodeURIComponent(prompt);
  return `${POLLINATIONS_BASE}/${encoded}?width=512&height=512&seed=${seed}&nologo=true`;
}

export async function generateImagesService(
  userId: number,
  prompt: string,
  count: number,
  conversationId?: number | null
): Promise<{ imageUrls: string[]; conversationId: number }> {
  await checkQuota(userId);
  const convId = await ensureConversation(userId, conversationId, `🖼️ ${prompt}`);

  const safeCount = Math.min(Math.max(count || 3, 1), 4);
  const baseSeed = Math.floor(Math.random() * 1_000_000);
  const imageUrls = Array.from({ length: safeCount }, (_, i) => buildImageUrl(prompt, baseSeed + i));

  await sql`
    INSERT INTO "AiHistory" ("prompt", "response", "userId", "conversationId", "imageUrls")
    VALUES (${prompt}, ${`Generated ${safeCount} image(s).`}, ${userId}, ${convId}, ${JSON.stringify(imageUrls)})
  `;
  await sql`UPDATE "Conversation" SET "updatedAt" = now() WHERE "id" = ${convId}`;

  return { imageUrls, conversationId: convId };
}

// ---------------------------------------------------------------------------
// Legacy flat history (kept so /ai/usage-style callers & the old endpoint
// still work; the frontend now prefers the per-conversation endpoints above)
// ---------------------------------------------------------------------------

export async function getHistoryService(userId: number, page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [history, [{ count }]] = await Promise.all([
    sql`
      SELECT * FROM "AiHistory" WHERE "userId" = ${userId}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `,
    sql`SELECT COUNT(*)::int AS count FROM "AiHistory" WHERE "userId" = ${userId}`,
  ]);

  return {
    history,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

export async function clearHistoryService(userId: number): Promise<void> {
  await sql`DELETE FROM "AiHistory" WHERE "userId" = ${userId}`;
  await sql`DELETE FROM "Conversation" WHERE "userId" = ${userId}`;
}
