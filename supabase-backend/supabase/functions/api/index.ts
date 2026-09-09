// Entry point for the whole API — equivalent of app.js + server.js
// combined. Deno.serve() replaces app.listen(); everything downstream
// (routing, CORS, error handling) is wired up by hand instead of through
// Express middleware.
//
// The browser/client calls the FULL external URL:
//   https://<project-ref>.supabase.co/functions/v1/api/<anything>
// but Supabase's own platform gateway strips the "/functions/v1" part
// before this code ever sees the request — confirmed by testing against
// a real deployed function, where a 404's error body echoed back
// "/api/auth/register" (not "/functions/v1/api/auth/register") as the
// path it tried to match. So Router.handle() only needs to strip "/api"
// (the function's own slug) here, not the fuller path someone might
// naively assume from the external URL. Every route definition below
// reads exactly like the old Express routes did (e.g. "/auth/login",
// matching what used to be app.use("/api/auth", authRoutes) +
// router.post("/login", ...)).
import Router from "../_shared/router.ts";
import { corsHeaders } from "../_shared/cors.ts";
import registerAuthRoutes from "../_shared/modules/auth/routes.ts";
import registerUserRoutes from "../_shared/modules/users/routes.ts";
import registerProjectRoutes from "../_shared/modules/projects/routes.ts";
import registerAgentRoutes from "../_shared/modules/agents/routes.ts";
import registerWorkflowRoutes from "../_shared/modules/workflows/routes.ts";
import registerIntegrationRoutes from "../_shared/modules/integrations/routes.ts";
import registerBillingRoutes from "../_shared/modules/billing/routes.ts";
import { handleStripeWebhook } from "../_shared/modules/billing/webhook.ts";
import registerAiRoutes from "../_shared/modules/ai/routes.ts";
import registerAnalyticsRoutes from "../_shared/modules/analytics/routes.ts";
import registerAdminRoutes from "../_shared/modules/admin/routes.ts";

const BASE_PATH = "/api";
const FUNCTION_STARTED_AT = Date.now();

const router = new Router();
registerAuthRoutes(router);
registerUserRoutes(router);
registerProjectRoutes(router);
registerAgentRoutes(router);
registerWorkflowRoutes(router);
registerIntegrationRoutes(router);
registerBillingRoutes(router);
registerAiRoutes(router);
registerAnalyticsRoutes(router);
registerAdminRoutes(router);

// Meant for a human opening it in a browser, not automated polling —
// same as the original's `app.get("/", ...)`.
router.get("/", () => {
  return Promise.resolve(new Response("🚀 AI SaaS Backend Running..."));
});

// Dedicated machine-readable health check for uptime monitors / load
// balancers. `uptime` here is "seconds since this function instance last
// cold-started", not the original's Node process uptime — the closest
// meaningful equivalent in an environment where instances come and go
// per Supabase's own scaling, not a single long-lived server process.
router.get("/health", () => {
  return Promise.resolve(
    new Response(
      JSON.stringify({
        status: "ok",
        uptime: (Date.now() - FUNCTION_STARTED_AT) / 1000,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  );
});

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const cors = corsHeaders(origin);

  // Preflight — the browser sends this before any cross-origin request
  // that includes credentials or non-simple headers.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  // Stripe webhook — bypasses the normal router entirely, same reason
  // the original registered it before app.use(express.json()): the
  // signature check needs the exact raw bytes Stripe sent, untouched by
  // any JSON parsing. Checked by exact pathname, not through Router.handle
  // (which is JSON-body-oriented), and Stripe's server-to-server calls
  // don't need CORS headers on the response either.
  const url = new URL(req.url);
  if (req.method === "POST" && url.pathname === `${BASE_PATH}/billing/webhook`) {
    return await handleStripeWebhook(req);
  }

  let response: Response | null;

  try {
    response = await router.handle(req, BASE_PATH);
  } catch (err) {
    console.error("Unhandled error:", err);
    response = new Response(JSON.stringify({ success: false, message: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!response) {
    const url = new URL(req.url);
    response = new Response(
      JSON.stringify({ success: false, message: `Route ${req.method} ${url.pathname} not found.` }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Merge CORS headers onto whatever the router produced. Using a fresh
  // Headers object copied from `response.headers` preserves multiple
  // Set-Cookie entries (login sets two cookies at once) — Headers.set()
  // on a single key never clobbers a *different* key's values.
  const mergedHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(cors)) {
    mergedHeaders.set(key, value);
  }

  return new Response(response.body, { status: response.status, headers: mergedHeaders });
});
