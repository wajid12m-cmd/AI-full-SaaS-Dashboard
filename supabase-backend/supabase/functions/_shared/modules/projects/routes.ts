// Deno port of routes/projectRoutes.js — every route requires auth,
// matching the original's `router.use(authMiddleware)`.
import Router from "../../router.ts";
import { authMiddleware, validateBody } from "../../authMiddleware.ts";
import * as controller from "./controller.ts";
import * as v from "./validator.ts";

export default function registerProjectRoutes(router: Router): void {
  router.post("/projects", authMiddleware, validateBody(v.createProjectSchema), controller.createProject);
  router.get("/projects", authMiddleware, controller.getProjects);
  router.get("/projects/:id", authMiddleware, controller.getProjectById);
  router.put("/projects/:id", authMiddleware, validateBody(v.updateProjectSchema), controller.updateProject);
  router.delete("/projects/:id", authMiddleware, controller.deleteProject);
}
