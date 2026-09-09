// Equivalent of the Express `cors({ origin, credentials: true })` config in
// app.js — Edge Functions don't have a CORS middleware, so headers are
// built by hand and merged onto every response in index.ts.
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "http://localhost:3003")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : "";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    // Tells caches/CDNs the response varies per Origin — without this a
    // shared cache could serve one user's CORS headers to another origin.
    Vary: "Origin",
  };
}
