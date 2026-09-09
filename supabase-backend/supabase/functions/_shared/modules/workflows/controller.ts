// Deno port of controllers/workflowController.js.
import { successResponse, errorResponse } from "../../response.ts";
import type { RouteContext } from "../../router.ts";
import * as workflowService from "./service.ts";

// deno-lint-ignore no-explicit-any
function withStats(workflow: any) {
  return {
    ...workflow,
    successRate:
      workflow.runCount > 0 ? Math.round((workflow.successCount / workflow.runCount) * 1000) / 10 : null,
  };
}

export async function getWorkflows(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const workflows = await workflowService.getWorkflowsService(ctx.user.id);
    return successResponse(workflows.map(withStats), "Workflows fetched");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to fetch workflows", 500);
  }
}

export async function createWorkflow(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const workflow = await workflowService.createWorkflowService(ctx.user.id, ctx.body);
    return successResponse(withStats(workflow), "Workflow created", 201);
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to create workflow", 500);
  }
}

export async function updateWorkflow(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const id = Number(ctx.params.id);
    if (isNaN(id)) return errorResponse("Invalid workflow ID", 400);

    const workflow = await workflowService.updateWorkflowService(ctx.user.id, id, ctx.body);
    return successResponse(withStats(workflow), "Workflow updated");
  } catch (err) {
    console.error(err);
    const message = (err as Error).message;
    return errorResponse(message, message === "Workflow not found" ? 404 : 500);
  }
}

export async function deleteWorkflow(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const id = Number(ctx.params.id);
    if (isNaN(id)) return errorResponse("Invalid workflow ID", 400);

    await workflowService.deleteWorkflowService(ctx.user.id, id);
    return successResponse(null, "Workflow deleted");
  } catch (err) {
    console.error(err);
    const message = (err as Error).message;
    return errorResponse(message, message === "Workflow not found" ? 404 : 500);
  }
}

export async function runWorkflow(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const id = Number(ctx.params.id);
    if (isNaN(id)) return errorResponse("Invalid workflow ID", 400);

    const workflow = await workflowService.runWorkflowService(ctx.user.id, id);
    return successResponse(withStats(workflow), "Workflow run recorded");
  } catch (err) {
    console.error(err);
    const message = (err as Error).message;
    const status = message === "Workflow not found" ? 404 : 400;
    return errorResponse(message, status);
  }
}
