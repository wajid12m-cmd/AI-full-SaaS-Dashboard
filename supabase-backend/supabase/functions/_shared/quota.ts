// Deno port of the getUsageService/checkQuota pair from services/
// aiService.js. Lives in _shared/ because both the Agents module (agent
// chat) and the future AI Assistant module hit the same monthly quota —
// same as how the original had agentService.js import checkQuota from
// aiService.js rather than duplicating the logic.
import sql from "./db.ts";

const FREE_PLAN_MONTHLY_LIMIT = 20;

function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export interface Usage {
  plan: "free" | "pro";
  used: number;
  limit: number | null;
}

export async function getUsageService(userId: number): Promise<Usage> {
  const [subscription] = await sql`SELECT * FROM "Subscription" WHERE "userId" = ${userId}`;

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";

  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM "AiHistory"
    WHERE "userId" = ${userId} AND "createdAt" >= ${getStartOfMonth()}
  `;

  return {
    plan: isPro ? "pro" : "free",
    used: count,
    limit: isPro ? null : FREE_PLAN_MONTHLY_LIMIT,
  };
}

export async function checkQuota(userId: number): Promise<void> {
  const usage = await getUsageService(userId);

  if (usage.limit !== null && usage.used >= usage.limit) {
    throw new Error(
      `Free plan limit (${usage.limit} AI requests/month) Upgrade to Pro for unlimited requests.`
    );
  }
}
