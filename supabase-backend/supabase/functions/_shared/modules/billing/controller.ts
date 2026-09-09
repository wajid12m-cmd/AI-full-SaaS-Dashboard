// Deno port of the non-webhook handlers from controllers/billingController.js.
// The webhook itself lives in api/index.ts, not here — see the comment
// there for why it needs to bypass the normal router/JSON-body pipeline.
import { successResponse, errorResponse } from "../../response.ts";
import type { RouteContext } from "../../router.ts";
import * as billingService from "./service.ts";

export async function createCheckoutSession(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const url = await billingService.createCheckoutSessionService(ctx.user.id, ctx.user.email);
    return successResponse({ url }, "Checkout session created");
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return errorResponse("Failed to create checkout session", 500);
  }
}

export async function getSubscriptionStatus(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const subscription = await billingService.getSubscriptionStatusService(ctx.user.id);
    return successResponse(subscription, "OK");
  } catch (err) {
    console.error("Get subscription error:", err);
    return errorResponse("Failed to fetch subscription", 500);
  }
}

export async function getInvoices(req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const url = new URL(req.url);
    const page = Math.max(parseInt(url.searchParams.get("page") || "") || 1, 1);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "") || 10, 1), 50);

    const result = await billingService.getInvoicesService(ctx.user.id, page, limit);
    return successResponse(result, "OK");
  } catch (err) {
    console.error("Get invoices error:", err);
    return errorResponse("Failed to fetch invoices", 500);
  }
}

export async function getInvoicePdf(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const id = Number(ctx.params.id);
    if (isNaN(id)) return errorResponse("Invalid invoice ID", 400);

    const { bytes, filename } = await billingService.getInvoicePdfService(ctx.user.id, id);

    return new Response(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Invoice PDF error:", err);
    const message = (err as Error).message;
    const status = message === "Invoice not found" ? 404 : 500;
    return errorResponse(status === 404 ? message : "Failed to generate invoice PDF", status);
  }
}
