// Deno port of services/aiService.js's chat functions (getUsageService /
// checkQuota already live in _shared/quota.ts, shared with the Agents
// module — not duplicated here).
import sql from "../../db.ts";
import groq from "../../groq.ts";
import { checkQuota } from "../../quota.ts";

const MAX_OUTPUT_TOKENS = 1024;

export async function generateAIResponseService(userId: number, prompt: string): Promise<string> {
  await checkQuota(userId);

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "openai/gpt-oss-120b",
      max_tokens: MAX_OUTPUT_TOKENS,
    });

    const response = completion.choices[0]?.message?.content || "";

    await sql`INSERT INTO "AiHistory" ("prompt", "response", "userId") VALUES (${prompt}, ${response}, ${userId})`;

    return response;
  } catch (err) {
    console.error("========== GROQ ERROR ==========");
    console.error(err);
    throw new Error("Failed to generate AI response");
  }
}

// Quota is deliberately checked by the CALLER (controller) before this is
// invoked, not inside here — see controller.ts's generateContentStream
// for why: a quota rejection needs to come back as a clean JSON 400
// *before* any streaming Response has been constructed, which is only
// possible if the check happens before this function (and its
// ReadableStream) is ever created.
export function createChatStream(userId: number, prompt: string): ReadableStream<Uint8Array> {
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
          INSERT INTO "AiHistory" ("prompt", "response", "userId") VALUES (${prompt}, ${fullResponse}, ${userId})
        `;
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
}
