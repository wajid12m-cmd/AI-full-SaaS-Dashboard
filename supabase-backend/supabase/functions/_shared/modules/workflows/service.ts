// Deno port of services/workflowService.js. runWorkflowService is a
// manual "Run Now" demo action (logs a run, rolls a realistic-ish
// outcome) — not a real scheduler executing workflows in the background.
import sql from "../../db.ts";
import { joinComma } from "../../sqlHelpers.ts";

// deno-lint-ignore no-explicit-any
type Workflow = any;

export async function getWorkflowsService(userId: number): Promise<Workflow[]> {
  return await sql`SELECT * FROM "Workflow" WHERE "userId" = ${userId} ORDER BY "createdAt" ASC`;
}

interface CreateWorkflowData {
  name: string;
  description: string;
  trigger: string;
}

export async function createWorkflowService(userId: number, data: CreateWorkflowData): Promise<Workflow> {
  const [workflow] = await sql`
    INSERT INTO "Workflow" ("userId", "name", "description", "trigger")
    VALUES (${userId}, ${data.name}, ${data.description}, ${data.trigger})
    RETURNING *
  `;
  return workflow;
}

async function getOwnedWorkflow(userId: number, workflowId: number): Promise<Workflow> {
  const [workflow] = await sql`SELECT * FROM "Workflow" WHERE "id" = ${workflowId} AND "userId" = ${userId}`;
  if (!workflow) {
    throw new Error("Workflow not found");
  }
  return workflow;
}

interface UpdateWorkflowData {
  name?: string;
  description?: string;
  trigger?: string;
  status?: string;
}

export async function updateWorkflowService(
  userId: number,
  workflowId: number,
  data: UpdateWorkflowData
): Promise<Workflow> {
  await getOwnedWorkflow(userId, workflowId);

  const fragments = [];
  if (data.name !== undefined) fragments.push(sql`"name" = ${data.name}`);
  if (data.description !== undefined) fragments.push(sql`"description" = ${data.description}`);
  if (data.trigger !== undefined) fragments.push(sql`"trigger" = ${data.trigger}`);
  if (data.status !== undefined) fragments.push(sql`"status" = ${data.status}`);

  if (fragments.length === 0) {
    return await getOwnedWorkflow(userId, workflowId);
  }

  const [workflow] = await sql`
    UPDATE "Workflow" SET ${joinComma(fragments)} WHERE "id" = ${workflowId}
    RETURNING *
  `;
  return workflow;
}

export async function deleteWorkflowService(userId: number, workflowId: number): Promise<void> {
  await getOwnedWorkflow(userId, workflowId);
  await sql`DELETE FROM "Workflow" WHERE "id" = ${workflowId}`;
}

export async function runWorkflowService(userId: number, workflowId: number): Promise<Workflow> {
  const workflow = await getOwnedWorkflow(userId, workflowId);

  if (workflow.status !== "active") {
    throw new Error("Only active workflows can be run");
  }

  const succeeded = Math.random() < 0.95;

  // successCount only bumps on a "successful" run — mirrors the original
  // Prisma `successCount: succeeded ? { increment: 1 } : undefined`.
  const [updated] = succeeded
    ? await sql`
        UPDATE "Workflow" SET
          "runCount" = "runCount" + 1,
          "successCount" = "successCount" + 1,
          "lastRunAt" = now()
        WHERE "id" = ${workflowId}
        RETURNING *
      `
    : await sql`
        UPDATE "Workflow" SET "runCount" = "runCount" + 1, "lastRunAt" = now()
        WHERE "id" = ${workflowId}
        RETURNING *
      `;

  return updated;
}
