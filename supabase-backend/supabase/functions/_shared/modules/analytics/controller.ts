// Deno port of controllers/analyticsController.js.
import { successResponse, errorResponse } from "../../response.ts";
import type { RouteContext } from "../../router.ts";
import { getAnalyticsService } from "./service.ts";

export async function getAnalytics(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const analytics = await getAnalyticsService(ctx.user.id);
    return successResponse(analytics, "Analytics fetched successfully");
  } catch (err) {
    console.error(err);
    return errorResponse((err as Error).message, 500);
  }
}
