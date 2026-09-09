// Deno port of controllers/projectController.js.
import { successResponse, errorResponse } from "../../response.ts";
import type { RouteContext } from "../../router.ts";
import * as projectService from "./service.ts";

export async function createProject(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const { name, description } = ctx.body;
    const project = await projectService.createProjectService(ctx.user.id, name, description);
    return successResponse(project, "Project created successfully", 201);
  } catch (err) {
    console.error(err);
    return errorResponse((err as Error).message, 400);
  }
}

export async function getProjects(req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "") || 1;
    const limit = parseInt(url.searchParams.get("limit") || "") || 6;

    const result = await projectService.getProjectsService(ctx.user.id, page, limit);
    return successResponse(result, "Projects fetched successfully");
  } catch (err) {
    console.error(err);
    return errorResponse((err as Error).message, 400);
  }
}

export async function getProjectById(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const project = await projectService.getProjectByIdService(ctx.user.id, ctx.params.id);
    return successResponse(project, "Project fetched successfully");
  } catch (err) {
    console.error(err);
    return errorResponse((err as Error).message, 404);
  }
}

export async function updateProject(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const { name, description, status } = ctx.body;
    const project = await projectService.updateProjectService(ctx.user.id, ctx.params.id, {
      name,
      description,
      status,
    });
    return successResponse(project, "Project updated successfully");
  } catch (err) {
    console.error(err);
    return errorResponse((err as Error).message, 400);
  }
}

export async function deleteProject(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    await projectService.deleteProjectService(ctx.user.id, ctx.params.id);
    return successResponse(null, "Project deleted successfully");
  } catch (err) {
    console.error(err);
    return errorResponse((err as Error).message, 400);
  }
}
