// Deno port of routes/agentRoutes.js.
import Router from "../../router.ts";
import { authMiddleware, validateBody } from "../../authMiddleware.ts";
import { aiRateLimiter } from "../../rateLimiter.ts";
import * as controller from "./controller.ts";
import * as v from "./validator.ts";

export default function registerAgentRoutes(router: Router): void {
  router.get("/agents", authMiddleware, controller.getAgents);
  router.post("/agents", authMiddleware, validateBody(v.createAgentSchema), controller.createAgent);
  router.put("/agents/:id", authMiddleware, validateBody(v.updateAgentSchema), controller.updateAgent);
  router.delete("/agents/:id", authMiddleware, controller.deleteAgent);
  // Same rate limiter as the main AI chat — this hits the same Groq budget.
  router.post(
    "/agents/:id/chat",
    authMiddleware,
    aiRateLimiter,
    validateBody(v.chatWithAgentSchema),
    controller.chatWithAgent
  );
}
