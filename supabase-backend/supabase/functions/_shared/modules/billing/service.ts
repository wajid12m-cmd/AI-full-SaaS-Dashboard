// Deno port of controllers/billingController.js's business logic. Split
// into a service file (unlike the original, which put DB/Stripe calls
// directly in the controller) to stay consistent with every other module
// in this rewrite.
import sql from "../../db.ts";
import { joinComma } from "../../sqlHelpers.ts";
import stripe from "../../stripe.ts";
import { SimplePdf, PAGE_WIDTH } from "../../pdf.ts";

// deno-lint-ignore no-explicit-any
type Subscription = any;
// deno-lint-ignore no-explicit-any
type Invoice = any;

export async function createCheckoutSessionService(userId: number, userEmail: string): Promise<string> {
  const frontendUrl = Deno.env.get("FRONTEND_URL");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: userEmail,
    line_items: [{ price: Deno.env.get("STRIPE_PRICE_ID"), quantity: 1 }],
    success_url: `${frontendUrl}/dashboard/billing?success=true`,
    cancel_url: `${frontendUrl}/dashboard/billing?canceled=true`,
    metadata: { userId: userId.toString() },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return session.url;
}

export async function getSubscriptionStatusService(userId: number): Promise<Subscription> {
  const [subscription] = await sql`SELECT * FROM "Subscription" WHERE "userId" = ${userId}`;
  return subscription || { plan: "free", status: "inactive" };
}

export async function getInvoicesService(userId: number, page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [invoices, [{ count }]] = await Promise.all([
    sql`
      SELECT * FROM "Invoice" WHERE "userId" = ${userId}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `,
    sql`SELECT COUNT(*)::int AS count FROM "Invoice" WHERE "userId" = ${userId}`,
  ]);

  return {
    invoices,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

// GET /billing/invoices/:id/pdf — generates a simple real PDF on the fly
// (nothing pre-stored) so the "Download" button in the Billing page
// actually produces a file instead of being a dead click target.
export async function getInvoicePdfService(
  userId: number,
  invoiceId: number
): Promise<{ bytes: Uint8Array; filename: string }> {
  const [invoice]: Invoice[] = await sql`
    SELECT i.*, u."name" AS "userName", u."email" AS "userEmail"
    FROM "Invoice" i
    JOIN "User" u ON u."id" = i."userId"
    WHERE i."id" = ${invoiceId} AND i."userId" = ${userId}
  `;

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const createdAt = new Date(invoice.createdAt);
  const invoiceNumber = `INV-${createdAt.getFullYear()}-${String(invoice.id).padStart(4, "0")}`;
  const amount = (invoice.amountCents / 100).toFixed(2);
  const rightEdge = PAGE_WIDTH - 50; // matches pdfkit's default 50pt margin

  const doc = new SimplePdf();
  doc.text(rightEdge, 70, 20, "Invoice", { align: "right" });
  doc.text(rightEdge, 92, 10, invoiceNumber, { align: "right", gray: 0.4 });

  doc.text(50, 150, 12, "Billed to:");
  doc.text(50, 168, 10, invoice.userName);
  doc.text(50, 182, 10, invoice.userEmail);

  doc.text(50, 214, 10, `Date: ${createdAt.toDateString()}`);
  doc.text(50, 228, 10, `Status: ${invoice.status.toUpperCase()}`);

  doc.text(50, 264, 12, "Description");
  doc.text(rightEdge, 264, 12, "Amount", { align: "right" });
  doc.line(50, 272, rightEdge, 272);

  doc.text(50, 294, 10, "Pro Plan - monthly subscription");
  doc.text(rightEdge, 294, 10, `$${amount} ${invoice.currency.toUpperCase()}`, { align: "right" });

  doc.text(rightEdge, 336, 12, `Total: $${amount} ${invoice.currency.toUpperCase()}`, { align: "right" });

  return { bytes: doc.build(), filename: `${invoiceNumber}.pdf` };
}

// Stripe's subscription.status has more granularity than our simple
// active/inactive/past_due; collapse it down to values the rest of the
// app already knows how to display.
function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "inactive";
    default:
      return stripeStatus; // e.g. "incomplete", "paused" — surfaced as-is
  }
}

interface CheckoutSessionData {
  customer: string | null;
  subscription: string | null;
  amount_total: number | null;
  currency: string | null;
  invoice: string | null;
  id: string;
  metadata: { userId?: string } | null;
}

async function upsertProSubscription(userId: number, session: CheckoutSessionData): Promise<void> {
  const [existing] = await sql`SELECT "userId" FROM "Subscription" WHERE "userId" = ${userId}`;

  if (!existing) {
    try {
      await sql`
        INSERT INTO "Subscription"
          ("userId", "plan", "status", "stripeCustomerId", "stripeSubscriptionId", "amountCents", "currency")
        VALUES (
          ${userId}, 'pro', 'active', ${session.customer}, ${session.subscription},
          ${session.amount_total ?? null}, ${session.currency ?? "usd"}
        )
      `;
      return;
    } catch (err) {
      // Unique-violation on userId — another webhook delivery for the
      // same event won the race and inserted first. Fall through to the
      // UPDATE branch below, same end state either way.
      if ((err as { code?: string }).code !== "23505") throw err;
    }
  }

  const fragments = [
    sql`"plan" = 'pro'`,
    sql`"status" = 'active'`,
    sql`"stripeCustomerId" = ${session.customer}`,
    sql`"stripeSubscriptionId" = ${session.subscription}`,
  ];
  // Only touch amountCents/currency if this event actually carried a
  // value — mirrors the original's `session.amount_total ?? undefined`
  // (Prisma skips `undefined` fields; here that means "no fragment").
  if (session.amount_total !== null && session.amount_total !== undefined) {
    fragments.push(sql`"amountCents" = ${session.amount_total}`);
  }
  if (session.currency) {
    fragments.push(sql`"currency" = ${session.currency}`);
  }

  await sql`UPDATE "Subscription" SET ${joinComma(fragments)} WHERE "userId" = ${userId}`;
}

// deno-lint-ignore no-explicit-any
export async function processStripeEvent(event: any): Promise<void> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as CheckoutSessionData;
    const userId = parseInt(session.metadata?.userId || "");

    if (!Number.isFinite(userId)) {
      console.error("checkout.session.completed with no/invalid metadata.userId");
      return;
    }

    await upsertProSubscription(userId, session);

    // One Invoice row per completed payment — this is what the Billing
    // page's history table actually reads, so it grows for real as
    // renewals happen instead of only ever showing the seeded demo rows.
    if (session.amount_total != null) {
      await sql`
        INSERT INTO "Invoice" ("userId", "amountCents", "currency", "status", "stripeInvoiceId")
        VALUES (
          ${userId}, ${session.amount_total}, ${session.currency || "usd"}, 'paid',
          ${session.invoice || session.id}
        )
      `;
    }
  }

  // Payment failures, plan changes, trial-ending, pause/resume — anything
  // that isn't a brand-new subscription or a full cancellation. Without
  // this, a card that starts failing leaves the DB saying "active"
  // forever until Stripe eventually cancels the subscription outright.
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object;
    const status = mapStripeStatus(subscription.status);

    await sql`
      UPDATE "Subscription" SET "status" = ${status}, "plan" = ${status === "inactive" ? "free" : "pro"}
      WHERE "stripeSubscriptionId" = ${subscription.id}
    `;
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    await sql`
      UPDATE "Subscription" SET "plan" = 'free', "status" = 'inactive'
      WHERE "stripeSubscriptionId" = ${subscription.id}
    `;
  }
}
