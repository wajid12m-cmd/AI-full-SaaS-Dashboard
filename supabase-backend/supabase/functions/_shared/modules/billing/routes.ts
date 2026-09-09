// Deno port of routes/billingRoutes.js. The webhook route
// (POST /billing/webhook) is intentionally NOT here — see api/index.ts
// for why it's handled before this router even runs.
import Router from "../../router.ts";
import { authMiddleware } from "../../authMiddleware.ts";
import * as controller from "./controller.ts";

export default function registerBillingRoutes(router: Router): void {
  router.post("/billing/create-checkout-session", authMiddleware, controller.createCheckoutSession);
  router.get("/billing/subscription", authMiddleware, controller.getSubscriptionStatus);
  router.get("/billing/invoices", authMiddleware, controller.getInvoices);
  router.get("/billing/invoices/:id/pdf", authMiddleware, controller.getInvoicePdf);
}
