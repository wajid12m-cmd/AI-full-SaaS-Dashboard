// Deno port of config/stripe.js. Two Deno-specific things Stripe's own
// docs call out for Edge Functions (confirmed against Stripe's official
// Deno example and Supabase's own webhook guide):
//   1. `httpClient: Stripe.createFetchHttpClient()` — makes the SDK's own
//      API calls (checkout.sessions.create, etc.) use the Fetch API
//      instead of Node's `http` module.
//   2. A `subtleCryptoProvider`, used separately in the webhook handler
//      for constructEventAsync() — see modules/billing/service.ts.
import Stripe from "npm:stripe@22.3.1";

const apiKey = Deno.env.get("STRIPE_SECRET_KEY");
if (!apiKey) {
  console.warn("STRIPE_SECRET_KEY is not set — billing calls will fail until it is.");
}

// The Stripe SDK throws immediately at construction time if given an
// empty string (not just at first API call) — and because this module
// gets imported as soon as ANY route module loads (they all live in one
// Edge Function), that crash would take down the entire app, not just
// billing. A non-empty placeholder avoids that: real API calls still
// fail cleanly with a Stripe auth error (caught by billing's own
// try/catch) once STRIPE_SECRET_KEY is actually missing.
const stripe = new Stripe(apiKey || "sk_not_configured", {
  httpClient: Stripe.createFetchHttpClient(),
});

export default stripe;
