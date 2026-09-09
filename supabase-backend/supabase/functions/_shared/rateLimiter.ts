// The original middleware/rateLimiter.js used `express-rate-limit`'s
// default in-memory store — that only works because a traditional Node
// server is one long-running process with shared memory. Each Edge
// Function invocation is its own isolated instance (possibly on a
// different machine even a few requests apart), so counters need to live
// somewhere shared: this table in Postgres.
//
// Requires the "RateLimitEntry" table — see
// supabase/migrations/20260902000000_rate_limit_entry.sql
import sql from "./db.ts";
import type { Middleware } from "./router.ts";

function getClientIp(req: Request): string {
  // Supabase's edge proxy sets this like any other reverse proxy would.
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

interface RateLimiterOptions {
  windowSeconds: number;
  max: number;
  message: string;
}

// Fixed-window counter with an atomic upsert, so two concurrent requests
// from the same key can't both read "count=4" and both proceed past a
// max of 5 — the UPDATE happens inside Postgres, not in application code.
export function rateLimiter({ windowSeconds, max, message }: RateLimiterOptions): Middleware {
  return async (req: Request): Promise<Response | null> => {
    const ip = getClientIp(req);
    const url = new URL(req.url);
    const key = `${url.pathname}:${ip}`;

    try {
      const [row] = await sql`
        INSERT INTO "RateLimitEntry" ("key", "count", "windowStart")
        VALUES (${key}, 1, now())
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE
            WHEN "RateLimitEntry"."windowStart" < now() - make_interval(secs => ${windowSeconds})
            THEN 1
            ELSE "RateLimitEntry"."count" + 1
          END,
          "windowStart" = CASE
            WHEN "RateLimitEntry"."windowStart" < now() - make_interval(secs => ${windowSeconds})
            THEN now()
            ELSE "RateLimitEntry"."windowStart"
          END
        RETURNING "count"
      `;

      if (row.count > max) {
        return new Response(JSON.stringify({ success: false, message }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      return null;
    } catch (err) {
      // A rate-limiter outage should never take the whole API down with
      // it — log and let the request through, same fail-open posture as
      // most rate-limiter libraries' default error handling.
      console.error("Rate limiter error:", err);
      return null;
    }
  };
}

export const authRateLimiter = rateLimiter({
  windowSeconds: 15 * 60,
  max: 20,
  message: "Too many attempts. Please try again in 15 minutes.",
});

export const aiRateLimiter = rateLimiter({
  windowSeconds: 60,
  max: 10,
  message: "Too many requests. Please try again in 1 minute.",
});
