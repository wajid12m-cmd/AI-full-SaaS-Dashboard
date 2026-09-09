// Deno port of services/projectService.js.
import sql from "../../db.ts";
import { joinComma } from "../../sqlHelpers.ts";

// deno-lint-ignore no-explicit-any
type Project = any;

export async function createProjectService(
  userId: number,
  name: string,
  description: string | undefined
): Promise<Project> {
  const [project] = await sql`
    INSERT INTO "Project" ("name", "description", "userId")
    VALUES (${name}, ${description ?? null}, ${userId})
    RETURNING *
  `;
  return project;
}

export async function getProjectsService(userId: number, page = 1, limit = 6) {
  const skip = (page - 1) * limit;

  const [projects, [{ count }]] = await Promise.all([
    sql`
      SELECT * FROM "Project" WHERE "userId" = ${userId}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `,
    sql`SELECT COUNT(*)::int AS count FROM "Project" WHERE "userId" = ${userId}`,
  ]);

  return {
    projects,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

export async function getProjectByIdService(userId: number, id: string): Promise<Project> {
  const [project] = await sql`
    SELECT * FROM "Project" WHERE "id" = ${Number(id)} AND "userId" = ${userId}
  `;

  if (!project) {
    throw new Error("Project not found");
  }

  return project;
}

interface ProjectUpdateData {
  name?: string;
  description?: string;
  status?: string;
}

export async function updateProjectService(userId: number, id: string, data: ProjectUpdateData): Promise<Project> {
  const projectId = Number(id);

  const [existing] = await sql`
    SELECT "id" FROM "Project" WHERE "id" = ${projectId} AND "userId" = ${userId}
  `;

  if (!existing) {
    throw new Error("Project not found");
  }

  const fragments = [];
  if (data.name !== undefined) fragments.push(sql`"name" = ${data.name}`);
  if (data.description !== undefined) fragments.push(sql`"description" = ${data.description}`);
  if (data.status !== undefined) fragments.push(sql`"status" = ${data.status}`);
  // "updatedAt" @updatedAt in Prisma bumped this on every write automatically
  // — replicate that here regardless of which fields changed.
  fragments.push(sql`"updatedAt" = now()`);

  const [project] = await sql`
    UPDATE "Project" SET ${joinComma(fragments)} WHERE "id" = ${projectId}
    RETURNING *
  `;

  return project;
}

export async function deleteProjectService(userId: number, id: string): Promise<void> {
  const projectId = Number(id);

  const [existing] = await sql`
    SELECT "id" FROM "Project" WHERE "id" = ${projectId} AND "userId" = ${userId}
  `;

  if (!existing) {
    throw new Error("Project not found");
  }

  await sql`DELETE FROM "Project" WHERE "id" = ${projectId}`;
}
