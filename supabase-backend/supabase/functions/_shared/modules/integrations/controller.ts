// Deno port of controllers/integrationController.js.
import { successResponse, errorResponse } from "../../response.ts";
import type { RouteContext } from "../../router.ts";
import * as integrationService from "./service.ts";

export async function getIntegrations(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const integrations = await integrationService.getIntegrationsService(ctx.user.id);
    return successResponse(integrations, "Integrations fetched");
  } catch (err) {
    console.error(err);
    return errorResponse("Failed to fetch integrations", 500);
  }
}

export async function updateIntegration(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const id = Number(ctx.params.id);
    if (isNaN(id)) return errorResponse("Invalid integration ID", 400);

    const integration = await integrationService.updateIntegrationService(ctx.user.id, id, ctx.body.status);
    return successResponse(integration, "Integration updated");
  } catch (err) {
    console.error(err);
    const message = (err as Error).message;
    const status = message === "Integration not found" ? 404 : 500;
    return errorResponse(message, status);
  }
}
