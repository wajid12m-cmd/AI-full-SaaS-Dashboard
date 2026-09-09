// Deno port of services/analyticsService.js. Fetches the same raw rows
// the original did via Prisma, then does identical in-memory grouping —
// the aggregation logic itself is unchanged, only how the rows are
// fetched.
import sql from "../../db.ts";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// deno-lint-ignore no-explicit-any
type Row = any;

export async function getAnalyticsService(userId: number) {
  const [
    [{ count: totalUsers }],
    [{ count: totalProjects }],
    [{ count: totalAiRequests }],
    projects,
    aiHistory,
    allUsers,
    invoices,
  ]: [Row[], Row[], Row[], Row[], Row[], Row[], Row[]] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM "User"`,
    sql`SELECT COUNT(*)::int AS count FROM "Project" WHERE "userId" = ${userId}`,
    sql`SELECT COUNT(*)::int AS count FROM "AiHistory" WHERE "userId" = ${userId}`,
    sql`SELECT * FROM "Project" WHERE "userId" = ${userId} ORDER BY "updatedAt" DESC`,
    sql`SELECT * FROM "AiHistory" WHERE "userId" = ${userId} ORDER BY "createdAt" DESC LIMIT 200`,
    sql`SELECT "createdAt" FROM "User"`,
    // Platform-wide, like monthlyUsers below — this page is "how's the
    // business doing", not just one user's own invoices.
    sql`SELECT "amountCents", "createdAt" FROM "Invoice" WHERE "status" = 'paid'`,
  ]);

  // Last 6 months AI request counts
  const now = new Date();
  const months: { year: number; monthIndex: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), monthIndex: d.getMonth() });
  }

  const monthlyRequests = months.map(({ year, monthIndex }) => {
    const count = aiHistory.filter((item) => {
      const created = new Date(item.createdAt);
      return created.getFullYear() === year && created.getMonth() === monthIndex;
    }).length;
    return { month: MONTH_LABELS[monthIndex], count };
  });

  // New signups per month (platform-wide, real data from User.createdAt)
  const monthlyUsers = months.map(({ year, monthIndex }) => {
    const count = allUsers.filter((u) => {
      const created = new Date(u.createdAt);
      return created.getFullYear() === year && created.getMonth() === monthIndex;
    }).length;
    return { month: MONTH_LABELS[monthIndex], count };
  });

  // Real revenue from the Invoice table (populated by the Stripe webhook
  // on every completed checkout). revenueEnabled reflects whether any
  // paid invoice actually exists yet, so a genuinely fresh install still
  // shows an honest "no revenue yet" state rather than a chart full of
  // zeros pretending to be real data.
  const monthlyRevenue = months.map(({ year, monthIndex }) => {
    const amount = invoices
      .filter((inv) => {
        const created = new Date(inv.createdAt);
        return created.getFullYear() === year && created.getMonth() === monthIndex;
      })
      .reduce((sum, inv) => sum + inv.amountCents, 0);
    return { month: MONTH_LABELS[monthIndex], amount: amount / 100 };
  });
  const revenueEnabled = invoices.length > 0;

  // Project status breakdown
  const statusCounts: Record<string, number> = projects.reduce((acc, project) => {
    const status = project.status || "active";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const projectStatus = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Recent activity: merge recent projects + AI history, newest first
  const projectActivity = projects.slice(0, 5).map((p) => ({
    action: `Project "${p.name}" updated`,
    date: p.updatedAt,
  }));

  const aiActivity = aiHistory.slice(0, 5).map((h) => ({
    action: "AI request made",
    date: h.createdAt,
  }));

  const recentActivity = [...projectActivity, ...aiActivity]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return {
    totalUsers,
    totalProjects,
    totalAiRequests,
    monthlyRequests,
    monthlyUsers,
    monthlyRevenue,
    revenueEnabled,
    projectStatus,
    recentActivity,
  };
}
