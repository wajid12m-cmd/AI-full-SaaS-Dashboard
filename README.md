# AI SaaS Dashboard — Frontend + Backend

This zip has both halves of the app:

```
client/               ← Next.js frontend (deploys to Vercel)
supabase-backend/      ← Deno/Supabase Edge Functions backend + database migrations
```

Read `supabase-backend/README-DENO-MIGRATION.md` for full backend detail
(what each module does, known limitations, etc). This file is the
"how do I actually run this" guide for both halves together.

> **If you're using VS Code:** open `client/` and `supabase-backend/` as
> two separate windows/workspaces, not both folders in one window.
> They're two different runtimes (Node vs Deno) with incompatible
> TypeScript setups — opening them together makes the editor show false
> errors in both (`Cannot find module 'next'` in one direction,
> `Cannot find name 'Deno'` in the other). `supabase-backend/.vscode/
> settings.json` already turns on Deno mode for that folder once it's
> its own workspace — you'll just need the "Deno" extension (by
> denoland) installed.

---

## Option A — Run everything locally (development)

You'll need: **Node.js 20+**, **Docker Desktop** (running), and the
**Supabase CLI** (`npm install -g supabase` or see
[supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli/getting-started)).

### 1. Start the local Supabase stack (database + functions)

```bash
cd supabase-backend
supabase start
```

First run downloads Docker images and can take a few minutes. This
starts a local Postgres, applies every file in `supabase/migrations/`
automatically, and gives you a block of output with local URLs and keys
— keep it open.

### 2. Set your local secrets

Create `supabase-backend/supabase/functions/.env` (this file is
git-ignored / not meant to be committed):
```
ACCESS_TOKEN_SECRET=dev-only-secret-change-me
REFRESH_TOKEN_SECRET=dev-only-secret-change-me-too
NODE_ENV=development
FRONTEND_URL=http://localhost:3003
ALLOWED_ORIGINS=http://localhost:3003
GROQ_API_KEY=your-real-groq-key
RESEND_API_KEY=your-real-resend-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```
`DATABASE_URL` doesn't need to be in this file — `supabase start` already
points local functions at the local database automatically.

### 3. Serve the functions (in a new terminal, keep step 1's terminal open)

```bash
cd supabase-backend
supabase functions serve --env-file ./supabase/functions/.env
```

You should see it listening on
`http://127.0.0.1:54321/functions/v1/api`. Leave this running — it
hot-reloads when you edit code. If it complains about missing
authorization on every request, add `--no-verify-jwt` to the command
(`supabase/config.toml` already sets this permanently, but pass the flag
too if your CLI version isn't picking that up).

### 4. Run the frontend

```bash
cd client
cp .env.example .env.local     # already points at the local URL above
npm install
npm run dev
```

Open `http://localhost:3003`. Register a new account, verify the email
(it'll print the verification link to the `functions serve` terminal
since Resend isn't hit for real unless you set a working
`RESEND_API_KEY`), and log in.

---

## Option B — Deploy to production (Vercel + Supabase)

### 1. Create the Supabase project

```bash
cd supabase-backend
supabase login
supabase link --project-ref YOUR_PROJECT_REF   # from your project's dashboard URL
supabase db push                                # applies every migrations/*.sql file
```

### 2. Set production secrets

```bash
supabase secrets set ACCESS_TOKEN_SECRET=$(openssl rand -hex 32)
supabase secrets set REFRESH_TOKEN_SECRET=$(openssl rand -hex 32)
supabase secrets set NODE_ENV=production
supabase secrets set FRONTEND_URL=https://your-app.vercel.app
supabase secrets set ALLOWED_ORIGINS=https://your-app.vercel.app
supabase secrets set GROQ_API_KEY=your-real-groq-key
supabase secrets set RESEND_API_KEY=your-real-resend-key
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_ID=price_...
```
(`FRONTEND_URL`/`ALLOWED_ORIGINS` won't be right yet on this first pass —
you don't have the Vercel URL until step 4. Come back and update these
after deploying the frontend, then redeploy the function.)

### 3. Deploy the function

```bash
supabase functions deploy api
```
Your API is now live at
`https://YOUR_PROJECT_REF.supabase.co/functions/v1/api`.

### 4. Deploy the frontend to Vercel

Push `client/` to a GitHub repo, import it in Vercel, and set one
environment variable before deploying:
```
NEXT_PUBLIC_API_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/api
```

### 5. Close the loop

Now that you have the real Vercel URL, go back and update the two
secrets that needed it, then redeploy the function so the new CORS
origin takes effect:
```bash
supabase secrets set FRONTEND_URL=https://your-actual-app.vercel.app
supabase secrets set ALLOWED_ORIGINS=https://your-actual-app.vercel.app
supabase functions deploy api
```

### 6. Stripe webhook

Stripe Dashboard → Developers → Webhooks → Add endpoint:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/api/billing/webhook
```
Copy the signing secret it gives you into `STRIPE_WEBHOOK_SECRET` (step 2)
if you haven't already, and redeploy.

### 7. Walk through it once, end to end

Register → verify email → log in → create a project → create an agent
and chat with it → create + run a workflow → connect an integration →
send an AI Assistant message → upgrade to Pro via checkout → confirm the
webhook marked the subscription active (Supabase dashboard → Edge
Functions → api → Logs) → download an invoice PDF → check Analytics →
log in as an admin and check the admin pages.
