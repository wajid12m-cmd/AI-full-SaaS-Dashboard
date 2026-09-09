// Shared Postgres client for every Edge Function module. Uses postgres.js
// (pure JS, no native bindings) instead of Prisma — Prisma's query engine
// is a native binary and does not run inside Supabase's Deno-based Edge
// Functions (confirmed unresolved as of the official Prisma tracking
// issue: https://github.com/prisma/prisma/issues/23512 — Edge support is
// currently limited to Cloudflare Workers and Vercel Edge only).
//
// Table/column names below match the existing Prisma schema EXACTLY
// (Prisma quotes every identifier, so casing matters — e.g. "User", not
// "user"; "createdAt", not "created_at"). No database migration is
// needed for this switch — the Postgres schema itself doesn't change,
// only the client that talks to it.
import postgres from "npm:postgres@3.4.5";

const connectionString = Deno.env.get("DATABASE_URL");
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Edge Functions are short-lived per invocation — keep the pool small so
// we don't exhaust Supabase's Postgres connection limit under concurrent
// invocations. `prepare: false` avoids issues with connection poolers
// (e.g. Supavisor/PgBouncer in transaction mode) that don't support
// prepared statements across pooled connections.
const sql = postgres(connectionString, {
  ssl: "require",
  max: 5,
  prepare: false,
});

export default sql;
