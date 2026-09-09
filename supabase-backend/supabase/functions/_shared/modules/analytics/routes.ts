// Deno port of routes/analyticsRoutes.js.
import Router from "../../router.ts";
import { authMiddleware } from "../../authMiddleware.ts";
import * as controller from "./controller.ts";

export default function registerAnalyticsRoutes(router: Router): void {
  router.get("/analytics", authMiddleware, controller.getAnalytics);
}
