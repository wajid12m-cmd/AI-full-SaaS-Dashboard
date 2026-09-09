// Deno port of controllers/billingController.js's handleStripeWebhook.
// This does NOT go through router.ts / validateBody like every other
// route — Stripe's signature check needs the exact raw request bytes,
// and any JSON.parse() + re-stringify round-trip (even an accidental one
// via a shared middleware) would change the bytes enough to break
// verification. api/index.ts calls this directly, before handing the
// request to the router at all — mirroring the original Express app,
// which registered this route before `app.use(express.json())` for the
// same reason.
//
// `constructEventAsync` + `createSubtleCryptoProvider()` (rather than the
// sync `constructEvent`) is Stripe's own documented pattern for Deno/edge
// runtimes — the sync version depends on Node's `crypto` module in a way
// that isn't guaranteed across every edge runtime, while the async
// version uses the standard Web Crypto API.
import Stripe from "npm:stripe@22.3.1";
import stripe from "../../stripe.ts";
import { processStripeEvent } from "./service.ts";

const cryptoProvider = Stripe.createSubtleCryptoProvider();

export async function handleStripeWebhook(req: Request): Promise<Response> {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
  const rawBody = await req.text();

  // deno-lint-ignore no-explicit-any
  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature || "",
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", (err as Error).message);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  try {
    await processStripeEvent(event);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response(JSON.stringify({ received: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
