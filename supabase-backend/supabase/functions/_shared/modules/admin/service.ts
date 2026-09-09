// Deno port of controllers/adminController.js's data-fetching logic.
import sql from "../../db.ts";

// deno-lint-ignore no-explicit-any
type Row = any;

interface Pagination {
  page: number;
  limit: number;
}

export function parsePagination(url: URL): Pagination & { skip: number } {
  const page = Math.max(parseInt(url.searchParams.get("page") || "") || 1, 1);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "") || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

export async function getAllUsersService(page: number, limit: number, skip: number) {
  const [users, [{ count }]] = await Promise.all([
    sql`
      SELECT
        u."id", u."name", u."email", u."role", u."createdAt",
        s."plan" AS "subscriptionPlan", s."status" AS "subscriptionStatus"
      FROM "User" u
      LEFT JOIN "Subscription" s ON s."userId" = u."id"
      ORDER BY u."createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `,
    sql`SELECT COUNT(*)::int AS count FROM "User"`,
  ]);

  // Reshape the flat join back into Prisma's original nested
  // `{ ...user, subscription: { plan, status } | null }` shape, so the
  // frontend (which reads user.subscription?.plan) doesn't need to change.
  const shaped = users.map((u: Row) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    subscription:
      u.subscriptionPlan != null ? { plan: u.subscriptionPlan, status: u.subscriptionStatus } : null,
  }));

  return { users: shaped, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } };
}

export async function getAllProjectsService(page: number, limit: number, skip: number) {
  const [projects, [{ count }]] = await Promise.all([
    sql`
      SELECT
        p.*, u."name" AS "userName", u."email" AS "userEmail"
      FROM "Project" p
      JOIN "User" u ON u."id" = p."userId"
      ORDER BY p."createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `,
    sql`SELECT COUNT(*)::int AS count FROM "Project"`,
  ]);

  const shaped = projects.map((p: Row) => {
    const { userName, userEmail, ...rest } = p;
    return { ...rest, user: { name: userName, email: userEmail } };
  });

  return { projects: shaped, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } };
}

export async function getAdminStatsService() {
  const [[{ count: totalUsers }], [{ count: totalProjects }], [{ count: totalAiRequests }], subscriptions]: [
    Row[],
    Row[],
    Row[],
    Row[],
  ] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM "User"`,
    sql`SELECT COUNT(*)::int AS count FROM "Project"`,
    sql`SELECT COUNT(*)::int AS count FROM "AiHistory"`,
    sql`SELECT * FROM "Subscription" WHERE "plan" = 'pro' AND "status" = 'active'`,
  ]);

  // Real revenue from what Stripe actually charged (amountCents, set by
  // the checkout.session.completed webhook), not a hardcoded price.
  const totalRevenue = subscriptions.reduce((sum, s) => sum + (s.amountCents || 0), 0) / 100;

  const recentPayments = subscriptions.slice(0, 5).map((s) => ({
    plan: s.plan,
    status: s.status,
    amount: s.amountCents != null ? s.amountCents / 100 : null,
    currency: s.currency,
    date: s.updatedAt,
  }));

  return {
    totalUsers,
    totalProjects,
    totalAiRequests,
    totalActiveSubscriptions: subscriptions.length,
    totalRevenue,
    recentPayments,
  };
}
