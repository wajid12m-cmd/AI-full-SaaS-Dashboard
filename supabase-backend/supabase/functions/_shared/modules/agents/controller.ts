// Deno port of controllers/agentController.js.
import { successResponse, errorResponse } from "../../response.ts";
import type { RouteContext } from "../../router.ts";
import * as agentService from "./service.ts";

// Derived fields (successRate, avgResponseMs) computed here rather than
// stored — they're always consistent with requestCount/successCount/
// totalResponseMs instead of risking drift from a separately-stored value.
// deno-lint-ignore no-explicit-any
function withStats(agent: any) {
  return {
    ...agent,
    successRate:
      agent.requestCount > 0 ? Math.round((agent.successCount / agent.requestCount) * 1000) / 10 : null,
    avgResponseMs: agent.successCount > 0 ? Math.round(agent.totalResponseMs / agent.successCount) : null,
  };
}

export async function getAgents(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const agents = await agentService.getAgentsService(ctx.user.id);
    return successResponse(agents.map(withStats), "Agents fetched");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to fetch agents", 500);
  }
}

export async function createAgent(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const agent = await agentService.createAgentService(ctx.user.id, ctx.body);
    return successResponse(withStats(agent), "Agent created", 201);
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to create agent", 500);
  }
}

export async function updateAgent(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const id = Number(ctx.params.id);
    if (isNaN(id)) return errorResponse("Invalid agent ID", 400);

    const agent = await agentService.updateAgentService(ctx.user.id, id, ctx.body);
    return successResponse(withStats(agent), "Agent updated");
  } catch (err) {
    console.error(err);
    const message = (err as Error).message;
    return errorResponse(message, message === "Agent not found" ? 404 : 500);
  }
}

export async function deleteAgent(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const id = Number(ctx.params.id);
    if (isNaN(id)) return errorResponse("Invalid agent ID", 400);

    await agentService.deleteAgentService(ctx.user.id, id);
    return successResponse(null, "Agent deleted");
  } catch (err) {
    console.error(err);
    const message = (err as Error).message;
    return errorResponse(message, message === "Agent not found" ? 404 : 500);
  }
}

export async function chatWithAgent(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const id = Number(ctx.params.id);
    if (isNaN(id)) return errorResponse("Invalid agent ID", 400);

    const response = await agentService.chatWithAgentService(ctx.user.id, id, ctx.body.message);
    return successResponse({ response }, "Response generated");
  } catch (err) {
    console.error(err);
    const message = (err as Error).message;
    const status = message === "Agent not found" ? 404 : 400;
    return errorResponse(message, status);
  }
}
