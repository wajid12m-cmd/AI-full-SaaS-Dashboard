// Deno port of services/agentService.js. Every agent runs on the same
// configured Groq model under the hood (modelLabel is a display string,
// not a second provider integration) — its system prompt is what actually
// makes each agent behave differently.
import sql from "../../db.ts";
import { joinComma } from "../../sqlHelpers.ts";
import groq from "../../groq.ts";
import { checkQuota } from "../../quota.ts";

// deno-lint-ignore no-explicit-any
type Agent = any;

const MAX_OUTPUT_TOKENS = 1024;

export async function getAgentsService(userId: number): Promise<Agent[]> {
  return await sql`SELECT * FROM "Agent" WHERE "userId" = ${userId} ORDER BY "createdAt" ASC`;
}

interface CreateAgentData {
  name: string;
  description: string;
  systemPrompt: string;
  modelLabel?: string;
}

export async function createAgentService(userId: number, data: CreateAgentData): Promise<Agent> {
  const [agent] = await sql`
    INSERT INTO "Agent" ("userId", "name", "description", "systemPrompt", "modelLabel")
    VALUES (
      ${userId}, ${data.name}, ${data.description}, ${data.systemPrompt},
      ${data.modelLabel || "Groq Llama 3.3"}
    )
    RETURNING *
  `;
  return agent;
}

async function getOwnedAgent(userId: number, agentId: number): Promise<Agent> {
  const [agent] = await sql`SELECT * FROM "Agent" WHERE "id" = ${agentId} AND "userId" = ${userId}`;
  if (!agent) {
    throw new Error("Agent not found");
  }
  return agent;
}

interface UpdateAgentData {
  name?: string;
  description?: string;
  systemPrompt?: string;
  modelLabel?: string;
  status?: string;
}

export async function updateAgentService(userId: number, agentId: number, data: UpdateAgentData): Promise<Agent> {
  await getOwnedAgent(userId, agentId);

  const fragments = [];
  if (data.name !== undefined) fragments.push(sql`"name" = ${data.name}`);
  if (data.description !== undefined) fragments.push(sql`"description" = ${data.description}`);
  if (data.systemPrompt !== undefined) fragments.push(sql`"systemPrompt" = ${data.systemPrompt}`);
  if (data.modelLabel !== undefined) fragments.push(sql`"modelLabel" = ${data.modelLabel}`);
  if (data.status !== undefined) fragments.push(sql`"status" = ${data.status}`);

  if (fragments.length === 0) {
    return await getOwnedAgent(userId, agentId);
  }

  const [agent] = await sql`
    UPDATE "Agent" SET ${joinComma(fragments)} WHERE "id" = ${agentId}
    RETURNING *
  `;
  return agent;
}

export async function deleteAgentService(userId: number, agentId: number): Promise<void> {
  await getOwnedAgent(userId, agentId);
  await sql`DELETE FROM "Agent" WHERE "id" = ${agentId}`;
}

// A real call to Groq using the agent's own system prompt.
export async function chatWithAgentService(userId: number, agentId: number, message: string): Promise<string> {
  const agent = await getOwnedAgent(userId, agentId);

  // Deliberately outside the try/catch below, same as the original —
  // a quota rejection isn't a failed "request" to the agent (it never
  // reached Groq), so it shouldn't bump requestCount or get replaced
  // with the generic "Failed to generate a response" message.
  await checkQuota(userId);

  const startedAt = Date.now();

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: agent.systemPrompt },
        { role: "user", content: message },
      ],
      model: "openai/gpt-oss-120b",
      max_tokens: MAX_OUTPUT_TOKENS,
    });

    const response = completion.choices[0]?.message?.content || "";
    const elapsedMs = Date.now() - startedAt;

    // Atomic like the original prisma.$transaction([...]) — the history
    // row and the counter bump either both land or neither does.
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO "AiHistory" ("prompt", "response", "userId")
        VALUES (${`[${agent.name}] ${message}`}, ${response}, ${userId})
      `;
      await tx`
        UPDATE "Agent" SET
          "requestCount" = "requestCount" + 1,
          "successCount" = "successCount" + 1,
          "totalResponseMs" = "totalResponseMs" + ${elapsedMs},
          "lastActivityAt" = now()
        WHERE "id" = ${agentId}
      `;
    });

    return response;
  } catch (err) {
    console.error(`========== AGENT "${agent.name}" ERROR ==========`);
    console.error(err);

    // A failed call still counts as a request (for an honest success
    // rate) but not a success.
    await sql`
      UPDATE "Agent" SET "requestCount" = "requestCount" + 1, "lastActivityAt" = now()
      WHERE "id" = ${agentId}
    `;

    throw new Error("Failed to generate a response from this agent");
  }
}
