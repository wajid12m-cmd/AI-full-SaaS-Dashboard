# Supabase Edge Functions backend — migration status: COMPLETE

This backend was rewritten from an original Express + Prisma app to run
on Supabase Edge Functions (Deno) instead of a Node server, since
Supabase Edge Functions were specifically requested over a traditional
Node host (Render/Railway would have needed zero rewriting — this
version exists because Deno-on-Supabase was the explicit goal). The
Express version isn't included in this package.

**All 10 route modules are done and tested** — every route from the
original Express app (`app.js`'s 10 `app.use("/api/...")` mounts, plus
the root `/`, `/health`, and the Stripe webhook) has a working Deno
equivalent. See the module table below for what "tested" means for each.

## Why this isn't a small "deploy config" change

Prisma's query engine is a native binary and does not run inside Deno-based
Edge Functions (confirmed via Prisma's own tracking issue — Edge support
is currently limited to Cloudflare Workers and Vercel Edge). Every Prisma
call had to be rewritten as raw parameterized SQL using `postgres.js`. On
top of that: Express's `req`/`res` become the Fetch API's `Request`/
`Response`, cookies are hand-built headers instead of `res.cookie()`,
Nodemailer (Node-only) was replaced with the Resend HTTP API, and
`express-rate-limit`'s in-memory store was replaced with a Postgres table
(Edge Functions have no shared memory between invocations).

## What's done so far

| Module | Status | Routes |
|---|---|---|
| **Auth** | ✅ Done, tested | register, login, logout, refresh, me, forgot-password, reset-password, verify-email, resend-verification |
| **Users** | ✅ Done, tested | list (admin), get/update by id, change password, update preferences, delete own account, admin create/delete |
| **Projects** | ✅ Done, tested | full CRUD + pagination |
| **AI Agents** | ✅ Done, tested | CRUD + real Groq chat (transactional counter updates) |
| **Automation Workflows** | ✅ Done, tested | CRUD + "Run Now" (manual demo trigger) |
| **Integrations** | ✅ Done, tested | list (with lazy default-catalog provisioning) + connect/disconnect |
| **Billing / Stripe** | ✅ Done, tested | checkout session, subscription status, invoices + PDF download, webhook (signature verification tested with a real valid Stripe test signature) |
| **AI Assistant / Groq streaming chat** | ✅ Done, tested | chat, streaming chat, history, usage — streaming mechanics verified with a synthetic ReadableStream test (no live Groq call possible in this sandbox — see note below) |
| **Analytics** | ✅ Done, tested | dashboard stats, monthly charts, recent activity |
| **Admin** | ✅ Done, tested | platform-wide user/project lists + stats, admin-only (role check tested), production error-message hiding verified |

"Tested" means: type-checked with `deno check`, linted with `deno lint`,
and smoke-tested against a real running Deno server (routing, CORS,
validation, auth/admin middleware, error handling, and — for
billing/streaming specifically — the actual signature-verification and
chunk-delivery mechanics). **Not** tested against a real Supabase
Postgres database or a real Groq/Stripe API call — do that before
trusting this in production (see Testing section below).

## Project layout

```
supabase-backend/
├── supabase/
│   ├── functions/
│   │   ├── api/
│   │   │   ├── index.ts        ← entry point (Deno.serve, routing, CORS, webhook bypass)
│   │   │   └── deno.json
│   │   └── _shared/
│   │       ├── db.ts           ← postgres.js client
│   │       ├── cors.ts
│   │       ├── response.ts     ← successResponse/errorResponse helpers
│   │       ├── cookies.ts      ← Set-Cookie / Cookie header handling
│   │       ├── jwt.ts          ← jsonwebtoken via npm: specifier
│   │       ├── hash.ts         ← bcryptjs via npm: specifier
│   │       ├── email.ts        ← Resend API
│   │       ├── router.ts       ← minimal express.Router() equivalent
│   │       ├── authMiddleware.ts   ← authMiddleware, adminMiddleware, validateBody
│   │       ├── rateLimiter.ts  ← Postgres-backed fixed-window limiter
│   │       ├── sqlHelpers.ts   ← dynamic partial-UPDATE helper
│   │       ├── quota.ts        ← shared by Agents chat + AI Assistant
│   │       ├── groq.ts         ← Groq client (npm: specifier)
│   │       ├── stripe.ts       ← Stripe client (fetch-based HTTP client for Deno)
│   │       ├── pdf.ts          ← dependency-free invoice PDF writer
│   │       └── modules/
│   │           ├── auth/       ← service.ts, validator.ts, controller.ts, routes.ts
│   │           ├── users/
│   │           ├── projects/
│   │           ├── agents/
│   │           ├── workflows/
│   │           ├── integrations/
│   │           ├── billing/    ← + webhook.ts (bypasses the normal router)
│   │           ├── ai/
│   │           ├── analytics/
│   │           └── admin/
│   ├── migrations/
│   │   └── 20260902000000_rate_limit_entry.sql   ← new table, Edge-only
│   └── config.toml             ← verify_jwt = false (see below)
└── README-DENO-MIGRATION.md (this file)
```

Every module follows the same 4-file pattern: service.ts (SQL),
validator.ts (zod, usually copy-pasted verbatim from the original),
controller.ts (Request/Response), routes.ts (wiring) — registered in
`api/index.ts`. Billing has a 5th file (webhook.ts) since that one route
needs to bypass the normal router entirely for raw-body signature
verification.

## Environment variables (Supabase secrets)

Set these with `supabase secrets set KEY=value`, or in the dashboard under
Edge Functions → Secrets. **Do not** put any of these in the frontend.

```
DATABASE_URL=              # Supabase Postgres connection string
ACCESS_TOKEN_SECRET=       # openssl rand -hex 32
REFRESH_TOKEN_SECRET=      # openssl rand -hex 32 (different value)
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=30d
NODE_ENV=production
FRONTEND_URL=              # your Vercel URL, e.g. https://your-app.vercel.app
ALLOWED_ORIGINS=           # same as FRONTEND_URL (comma-separated if more than one)
RESEND_API_KEY=            # from resend.com — replaces EMAIL_USER/EMAIL_PASS
RESEND_FROM_EMAIL=         # e.g. "Your App <onboarding@resend.dev>" (optional, has a default)
GROQ_API_KEY=               # used by both Agents chat and AI Assistant
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
```

## Database setup

Every migration this app needs — the original schema plus the one new
Edge-only table for rate limiting — lives in `supabase/migrations/` in
this folder, already in the correct chronological order (they're the
same SQL Prisma originally generated, just flattened out of their
per-migration subfolders into the flat-file layout the Supabase CLI
expects). This folder is self-contained — you don't need the old
`server-updated/` Express project for anything database-related anymore.

**Local development:**
```bash
supabase start        # spins up local Postgres + applies every migration automatically
```

**Production (a real Supabase project):** open the SQL Editor in the
Supabase dashboard and run each file in `supabase/migrations/` in
filename order, oldest timestamp first — or use the CLI:
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

No Prisma CLI involved — these are just plain `.sql` files.

## Deploying

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy api
```

Your function will be live at:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/api
```

Set this (with `/api` on the end) as `NEXT_PUBLIC_API_URL` in Vercel.

### Stripe webhook URL

In the Stripe Dashboard, under Developers → Webhooks, point the endpoint
at:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/api/billing/webhook
```
Stripe will give you a signing secret (`whsec_...`) at that point — that's
your `STRIPE_WEBHOOK_SECRET`.

### Important: `supabase/config.toml` disables Supabase's own JWT check

This app doesn't use Supabase Auth — it has its own custom JWT-in-cookie
system (same one the original Express app used). Supabase's platform
gateway normally rejects any request that doesn't carry a
Supabase-issued JWT or API key, which would block both real logged-in
users (their cookies aren't Supabase-shaped) and Stripe's webhook calls.
`supabase/config.toml` (included in this folder) sets `verify_jwt = false`
for the whole `api` function so this app's own `authMiddleware.ts` (and
the webhook's own Stripe-signature check) are the only things guarding
each route — exactly like the original Express app, which had no
built-in platform auth layer to begin with. Make sure this file is
present when you deploy.

## Testing locally before deploying

```bash
cd supabase-backend
supabase start          # local Supabase stack, or point DATABASE_URL at your real one
supabase functions serve api --env-file ./.env.local
```

Then hit `http://localhost:54321/functions/v1/api/health` — should return
`{"status":"ok",...}`.

## Known, deliberate behavior differences from the Express version

- **Email verification uses a 6-digit code, not a link.** The person
  registering types the code into a form on `/verify-email` instead of
  clicking a link. `verifyEmailSchema` now expects `{ email, code }`
  (6 digits) instead of `{ email, token }`. Codes expire in 15 minutes
  (shorter than the old link's 24 hours, appropriate for something
  short enough to type by hand) and reuse the same `verifyToken` /
  `verifyTokenExpiry` columns — no migration needed for this change.
- **A real bug found only after deploying to a real Supabase project**:
  `api/index.ts`'s `BASE_PATH` was originally set to `/functions/v1/api`,
  based on the (incorrect) assumption that the function sees the full
  external URL path. In reality, Supabase's own platform gateway strips
  the `/functions/v1` part before your code ever runs — confirmed by a
  real deployment's 404 response body echoing back `/api/auth/register`
  as the unmatched path, not `/functions/v1/api/auth/register`. Every
  route 404'd until this was corrected to `BASE_PATH = "/api"`. This
  couldn't be caught by local `deno run` testing (which only exercises
  code you write, not Supabase's own gateway behavior) — worth knowing if
  you ever restructure the routing.
- **A real bug found only after deploying**: `auth/service.ts`'s
  `safeTokenCompare()` (used for both the email-verification code and the
  password-reset token) used the global `Buffer` without importing it.
  This happened to not error during local `deno run` testing, but crashed
  with "Buffer is not defined" on the real Supabase Edge Runtime. Fixed
  by explicitly `import { Buffer } from "node:buffer"` — a reminder that
  Deno's Node-compat globals aren't 100% consistent across every runtime
  context (local CLI vs. deployed Edge Runtime).
- **A real bug was caught and fixed during testing**: the Stripe SDK
  throws immediately at construction time if given an empty string as
  the API key — and because `_shared/stripe.ts` gets imported as soon as
  ANY route module loads (every module lives in one Edge Function), a
  missing `STRIPE_SECRET_KEY` would have crashed the *entire* app, not
  just billing. Fixed with a non-empty placeholder so only actual Stripe
  API calls fail (cleanly, inside billing's own try/catch) if the key is
  missing — everything else keeps working.

- **Refresh cookie is scoped to `Path=/` instead of `Path=/api/auth`.**
  The function's real URL is `/functions/v1/api/...`, not `/api/...`, so
  the old path scoping would have silently broken (the cookie would never
  be sent back). This is a minor request-size cost, not a new security
  hole — the cookie is still `httpOnly`.
- **Email sends via Resend's HTTP API, not Gmail SMTP.** Nodemailer
  doesn't run reliably on Deno. Resend has a generous free tier; sign up
  and get an API key at resend.com.
- **Rate limiting is Postgres-backed and fails open.** If the
  `RateLimitEntry` table is unreachable, requests are allowed through
  rather than blocked — same posture as most rate-limiter libraries'
  default error handling, but worth knowing.
- **Raw internal error messages are still returned to the client on
  unexpected errors** (e.g. a database connection failure). This is
  copied faithfully from the original Express controllers, which did the
  same (`errorResponse(res, 400, error.message)`) — not something this
  rewrite introduced, but worth fixing regardless of which backend you
  end up running.
- **Invoice PDFs are generated by a small hand-written PDF writer, not
  `pdfkit`.** `pdfkit` depends on Node's `fs` module to load font files —
  too risky to trust inside a sandboxed Edge Function without a live
  deployment to test against. The replacement (`_shared/pdf.ts`) was
  verified in this sandbox with `pdfinfo`/`pdftotext`/`pypdf` and produces
  a real, valid single-page PDF using a built-in font (no embedding
  needed) — but it only renders plain ASCII correctly (an em dash "—"
  would come out garbled, for example). All invoice text this app
  generates is already plain ASCII, so this hasn't been an issue, but
  keep it in mind if you add new fields to the invoice PDF later.
- **AI chat streaming was verified structurally, not against a live Groq
  call.** `api.groq.com` isn't reachable from the sandbox this was built
  in, so the actual Groq SDK streaming call couldn't be exercised
  end-to-end here. What WAS verified: (1) a quota rejection returns a
  clean JSON error *before* any streaming response starts, matching the
  original's behavior exactly; (2) the `ReadableStream` → `Response` →
  CORS-header-merge pipeline in `api/index.ts` genuinely streams chunks
  as they're enqueued rather than buffering the whole response (tested
  with a synthetic timed stream through the exact same code path). The
  Groq SDK itself is the same `npm:groq-sdk` package the Agents module
  already uses successfully for non-streaming calls — test the first real
  streamed message carefully after deploying.

## Go-live checklist

All 10 modules are built and individually tested against a real Deno
server, but never against a real Supabase project end-to-end. Before
pointing real users at this:

1. Create the Supabase project, run every `prisma/migrations/*/migration.sql`
   file plus `supabase/migrations/20260902000000_rate_limit_entry.sql`
   against it (see Database setup above).
2. Set every environment variable listed above as a Supabase secret.
3. Deploy with `supabase functions deploy api` — `supabase/config.toml`
   (already in this folder) takes care of `verify_jwt = false`.
4. Point `NEXT_PUBLIC_API_URL` (Vercel) at
   `https://YOUR_PROJECT_REF.supabase.co/functions/v1/api`.
5. Walk through the app manually in this order, since each step depends
   on the last actually working: register → verify email → log in →
   create a project → create an agent and chat with it → create a
   workflow and run it → connect/disconnect an integration → send an AI
   Assistant message (both non-streaming and streaming) → upgrade to Pro
   via Stripe checkout → confirm the webhook actually marked the
   subscription active (check the Supabase function logs for it) →
   download an invoice PDF → view Analytics → log in as an admin and
   check `/admin/stats`, `/admin/users`, `/admin/projects`.
6. Point the real Stripe webhook URL at your deployed function (see
   above) and send a real test event from the Stripe Dashboard.
