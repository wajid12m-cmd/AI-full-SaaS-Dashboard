// Deno port of controllers/aiController.js + controllers/aiHistoryController.js
// (both live under /ai/* in routes/aiRoutes.js in the original, so they're
// combined here too).
import { successResponse, errorResponse } from "../../response.ts";
import type { RouteContext } from "../../router.ts";
import { getUsageService, checkQuota } from "../../quota.ts";
import * as aiService from "./service.ts";

export async function generateContent(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const { prompt } = ctx.body;
    const response = await aiService.generateAIResponseService(ctx.user.id, prompt);
    return successResponse({ response }, "AI response generated successfully");
  } catch (err) {
    console.error(err);
    return errorResponse((err as Error).message, 400);
  }
}

export async function generateContentStream(_req: Request, ctx: RouteContext): Promise<Response> {
  const { prompt } = ctx.body;

  // Checked here, BEFORE the streaming Response is constructed, so a
  // quota rejection comes back as a normal JSON 400 — once the
  // ReadableStream below is handed to `new Response(...)`, headers go out
  // immediately and there's no going back to a JSON error shape.
  try {
    await checkQuota(ctx.user.id);
  } catch (err) {
    return errorResponse((err as Error).message, 400);
  }

  const stream = aiService.createChatStream(ctx.user.id, prompt);

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function getUsage(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const usage = await getUsageService(ctx.user.id);
    return successResponse(usage, "Usage fetched successfully");
  } catch (err) {
    console.error(err);
    return errorResponse((err as Error).message, 400);
  }
}

export async function getHistory(req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "") || 1;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "") || 20, 100);

    const result = await aiService.getHistoryService(ctx.user.id, page, limit);
    return successResponse(result, "History fetched successfully");
  } catch (err) {
    console.error(err);
    return errorResponse("Internal Server Error", 500);
  }
}

export async function clearHistory(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    await aiService.clearHistoryService(ctx.user.id);
    return successResponse(null, "History cleared successfully");
  } catch (err) {
    console.error(err);
    return errorResponse("Internal Server Error", 500);
  }
}
