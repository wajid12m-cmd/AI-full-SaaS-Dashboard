// Deno port of services/integrationService.js. Connecting an integration
// here just flips a status flag in our own DB — not a real OAuth
// handshake with these services.
import sql from "../../db.ts";

// deno-lint-ignore no-explicit-any
type Integration = any;

// The catalog every user starts with.
const DEFAULT_CATALOG = [
  { name: "Slack", description: "Get alerts and notifications" },
  { name: "Google Drive", description: "Store and sync reports" },
  { name: "Notion", description: "Sync documents and knowledge" },
  { name: "Zapier", description: "Automate workflows" },
  { name: "Mailchimp", description: "Sync audiences and campaigns" },
  { name: "Salesforce", description: "Sync CRM data" },
];

export async function getIntegrationsService(userId: number): Promise<Integration[]> {
  const existing = await sql`SELECT * FROM "Integration" WHERE "userId" = ${userId} ORDER BY "id" ASC`;

  if (existing.length > 0) {
    return existing;
  }

  // First time this user loads the page — provision the default catalog,
  // all disconnected. This only runs once per new user (a handful of
  // rows), so a straightforward loop of individual INSERTs is used here
  // instead of a bulk-insert helper — it's guaranteed-correct SQL rather
  // than relying on a less-common postgres.js API surface for a
  // one-time, low-volume operation.
  for (const item of DEFAULT_CATALOG) {
    await sql`
      INSERT INTO "Integration" ("name", "description", "userId")
      VALUES (${item.name}, ${item.description}, ${userId})
    `;
  }

  return await sql`SELECT * FROM "Integration" WHERE "userId" = ${userId} ORDER BY "id" ASC`;
}

export async function updateIntegrationService(
  userId: number,
  integrationId: number,
  status: string
): Promise<Integration> {
  const [integration] = await sql`
    SELECT * FROM "Integration" WHERE "id" = ${integrationId} AND "userId" = ${userId}
  `;

  if (!integration) {
    throw new Error("Integration not found");
  }

  const connectedOn = status === "connected" ? new Date() : null;

  const [updated] = await sql`
    UPDATE "Integration" SET "status" = ${status}, "connectedOn" = ${connectedOn}
    WHERE "id" = ${integrationId}
    RETURNING *
  `;

  return updated;
}
