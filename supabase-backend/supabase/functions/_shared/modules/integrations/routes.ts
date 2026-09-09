// Deno port of routes/integrationRoutes.js.
import Router from "../../router.ts";
import { authMiddleware, validateBody } from "../../authMiddleware.ts";
import * as controller from "./controller.ts";
import * as v from "./validator.ts";

export default function registerIntegrationRoutes(router: Router): void {
  router.get("/integrations", authMiddleware, controller.getIntegrations);
  router.put(
    "/integrations/:id",
    authMiddleware,
    validateBody(v.updateIntegrationSchema),
    controller.updateIntegration
  );
}
