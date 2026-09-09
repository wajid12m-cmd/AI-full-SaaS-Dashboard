-- Backs supabase/functions/_shared/rateLimiter.ts. Not part of the
-- original Prisma schema — Edge Functions have no shared in-memory store
-- across invocations, so the rate-limit counters live here instead.
-- Run this once against your Supabase database (SQL Editor, or `psql`),
-- in addition to the existing prisma/migrations/*/migration.sql files
-- (those still apply as-is — the table/column layout for the app's own
-- data doesn't change, only the query layer talking to it does).

CREATE TABLE IF NOT EXISTS "RateLimitEntry" (
  "key"         TEXT PRIMARY KEY,
  "count"       INTEGER NOT NULL DEFAULT 0,
  "windowStart" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rows older than a day are never a "current window" for any limiter this
-- project defines (longest window is 15 minutes) — safe to sweep
-- periodically so the table doesn't grow forever. Optional: run this from
-- a scheduled Supabase cron job (pg_cron) if you want automatic cleanup.
-- DELETE FROM "RateLimitEntry" WHERE "windowStart" < now() - interval '1 day';
