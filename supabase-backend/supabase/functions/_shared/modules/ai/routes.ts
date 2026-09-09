// Deno port of routes/aiRoutes.js.
import Router from "../../router.ts";
import { authMiddleware, validateBody } from "../../authMiddleware.ts";
import { aiRateLimiter } from "../../rateLimiter.ts";
import * as controller from "./controller.ts";
import * as v from "./validator.ts";

export default function registerAiRoutes(router: Router): void {
  router.post("/ai/chat", authMiddleware, aiRateLimiter, validateBody(v.chatSchema), controller.generateContent);
  router.post(
    "/ai/chat/stream",
    authMiddleware,
    aiRateLimiter,
    validateBody(v.chatSchema),
    controller.generateContentStream
  );
  router.get("/ai/history", authMiddleware, controller.getHistory);
  router.delete("/ai/history", authMiddleware, controller.clearHistory);
  router.get("/ai/usage", authMiddleware, controller.getUsage);
}
