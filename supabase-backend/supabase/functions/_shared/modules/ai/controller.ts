// Deno port of controllers/aiController.js + controllers/aiHistoryController.js
// (both live under /ai/* in routes/aiRoutes.js in the original, so they're
// combined here too), extended with conversation CRUD + image generation.
import { successResponse, errorResponse } from "../../response.ts";
import type { RouteContext } from "../../router.ts";
import { getUsageService, checkQuota } from "../../quota.ts";
import * as aiService from "./service.ts";

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export async function generateContent(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const { prompt, conversationId } = ctx.body;
    const result = await aiService.generateAIResponseService(ctx.user.id, prompt, conversationId);
    return successResponse(result, "AI response generated successfully");
  } catch (err) {
    console.error(err);
    return errorResponse((err as Error).message, 400);
  }
}

export async function generateContentStream(_req: Request, ctx: RouteContext): Promise<Response> {
  const { prompt, conversationId } = ctx.body;

  // Checked here, BEFORE the streaming Response is constructed, so a
  // quota rejection (or an invalid/not-owned conversationId) comes back as
  // a normal JSON 400 — once the ReadableStream below is handed to
  // `new Response(...)`, headers go out immediately and there's no going
  // back to a JSON error shape.
  let convId: number;
  try {
    await checkQuota(ctx.user.id);
    convId = await aiService.ensureConversation(ctx.user.id, conversationId, prompt);
  } catch (err) {
    return errorResponse((err as Error).message, 400);
  }

  const stream = aiService.createChatStream(ctx.user.id, convId, prompt);

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      // Lets the frontend learn which conversation this turn landed in
      // (relevant the first time, when none was passed and a new one was
      // just created) without needing a separate round trip.
      "X-Conversation-Id": String(convId),
      "Access-Control-Expose-Headers": "X-Conversation-Id",
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

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

export async function generateImage(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const { prompt, conversationId, count } = ctx.body;
    const result = await aiService.generateImagesService(ctx.user.id, prompt, count ?? 3, conversationId);
    return successResponse(result, "Images generated successfully");
  } catch (err) {
    console.error(err);
    return errorResponse((err as Error).message, 400);
  }
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function listConversations(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const conversations = await aiService.listConversationsService(ctx.user.id);
    return successResponse(conversations, "Conversations fetched successfully");
  } catch (err) {
    console.error(err);
    return errorResponse("Internal Server Error", 500);
  }
}

export async function createConversation(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const { title } = ctx.body;
    const conversation = await aiService.createConversationService(ctx.user.id, title);
    return successResponse(conversation, "Conversation created successfully");
  } catch (err) {
    console.error(err);
    return errorResponse((err as Error).message, 400);
  }
}

export async function getConversationMessages(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const conversationId = parseInt(ctx.params.id, 10);
    const messages = await aiService.getConversationMessagesService(ctx.user.id, conversationId);
    return successResponse(messages, "Messages fetched successfully");
  } catch (err) {
    console.error(err);
    return errorResponse((err as Error).message, 404);
  }
}

export async function updateConversation(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const conversationId = parseInt(ctx.params.id, 10);
    const { title, pinned } = ctx.body;

    let conversation;
    if (title !== undefined) {
      conversation = await aiService.renameConversationService(ctx.user.id, conversationId, title);
    }
    if (pinned !== undefined) {
      conversation = await aiService.setConversationPinService(ctx.user.id, conversationId, pinned);
    }

    return successResponse(conversation, "Conversation updated successfully");
  } catch (err) {
    console.error(err);
    return errorResponse((err as Error).message, 400);
  }
}

export async function deleteConversation(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const conversationId = parseInt(ctx.params.id, 10);
    await aiService.deleteConversationService(ctx.user.id, conversationId);
    return successResponse(null, "Conversation deleted successfully");
  } catch (err) {
    console.error(err);
    return errorResponse((err as Error).message, 400);
  }
}

// ---------------------------------------------------------------------------
// Legacy flat history (kept for backwards compatibility)
// ---------------------------------------------------------------------------

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
