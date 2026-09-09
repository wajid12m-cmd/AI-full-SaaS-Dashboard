// Deno port of routes/workflowRoutes.js.
import Router from "../../router.ts";
import { authMiddleware, validateBody } from "../../authMiddleware.ts";
import * as controller from "./controller.ts";
import * as v from "./validator.ts";

export default function registerWorkflowRoutes(router: Router): void {
  router.get("/workflows", authMiddleware, controller.getWorkflows);
  router.post("/workflows", authMiddleware, validateBody(v.createWorkflowSchema), controller.createWorkflow);
  router.put("/workflows/:id", authMiddleware, validateBody(v.updateWorkflowSchema), controller.updateWorkflow);
  router.delete("/workflows/:id", authMiddleware, controller.deleteWorkflow);
  router.post("/workflows/:id/run", authMiddleware, controller.runWorkflow);
}
