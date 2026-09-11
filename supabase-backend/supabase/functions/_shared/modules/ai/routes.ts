// Deno port of routes/aiRoutes.js, extended with conversation CRUD +
// image generation routes.
import Router from "../../router.ts";
import { authMiddleware, validateBody } from "../../authMiddleware.ts";
import { aiRateLimiter } from "../../rateLimiter.ts";
import * as controller from "./controller.ts";
import * as v from "./validator.ts";

export default function registerAiRoutes(router: Router): void {
  // Chat
  router.post("/ai/chat", authMiddleware, aiRateLimiter, validateBody(v.chatSchema), controller.generateContent);
  router.post(
    "/ai/chat/stream",
    authMiddleware,
    aiRateLimiter,
    validateBody(v.chatSchema),
    controller.generateContentStream
  );

  // Image generation
  router.post("/ai/image", authMiddleware, aiRateLimiter, validateBody(v.imageSchema), controller.generateImage);

  // Conversations (real, isolated chat threads)
  router.get("/ai/conversations", authMiddleware, controller.listConversations);
  router.post(
    "/ai/conversations",
    authMiddleware,
    validateBody(v.createConversationSchema),
    controller.createConversation
  );
  router.get("/ai/conversations/:id/messages", authMiddleware, controller.getConversationMessages);
  router.patch(
    "/ai/conversations/:id",
    authMiddleware,
    validateBody(v.updateConversationSchema),
    controller.updateConversation
  );
  router.delete("/ai/conversations/:id", authMiddleware, controller.deleteConversation);

  // Legacy flat history + usage
  router.get("/ai/history", authMiddleware, controller.getHistory);
  router.delete("/ai/history", authMiddleware, controller.clearHistory);
  router.get("/ai/usage", authMiddleware, controller.getUsage);
}
