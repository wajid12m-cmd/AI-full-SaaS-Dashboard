// Deno port of routes/adminRoutes.js — every route requires both auth
// AND admin role, matching the original's `router.use(authMiddleware)`
// followed by `router.use(adminMiddleware)`.
import Router from "../../router.ts";
import { authMiddleware, adminMiddleware } from "../../authMiddleware.ts";
import * as controller from "./controller.ts";

export default function registerAdminRoutes(router: Router): void {
  router.get("/admin/stats", authMiddleware, adminMiddleware, controller.getAdminStats);
  router.get("/admin/users", authMiddleware, adminMiddleware, controller.getAllUsers);
  router.get("/admin/projects", authMiddleware, adminMiddleware, controller.getAllProjects);
}
