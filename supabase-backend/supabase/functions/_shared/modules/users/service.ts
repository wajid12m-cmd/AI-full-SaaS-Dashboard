// Deno port of services/userService.js. Every function returns the same
// "safe" shape (no password field) as the original's `safeUserSelect`.
import sql from "../../db.ts";
import { joinComma } from "../../sqlHelpers.ts";
import { hashPassword, comparePassword } from "../../hash.ts";

// deno-lint-ignore no-explicit-any
type User = any;

const SAFE_USER_COLUMNS = sql`
  "id", "name", "email", "role", "createdAt", "avatarUrl",
  "notifyWeeklyReports", "notifySecurityAlerts", "notifyProductUpdates",
  "twoFactorEnabled"
`;

export async function createUserService(name: string, email: string): Promise<User> {
  try {
    const [user] = await sql`
      INSERT INTO "User" ("name", "email")
      VALUES (${name}, ${email})
      RETURNING ${SAFE_USER_COLUMNS}
    `;
    return user;
  } catch (err) {
    // Postgres unique_violation — same case the original caught via
    // Prisma's translated "P2002" error code. Relying on the database
    // constraint itself (rather than a separate SELECT-then-INSERT check)
    // avoids a race between two concurrent signups for the same email.
    if ((err as { code?: string }).code === "23505") {
      const conflictErr = new Error("Email already exists") as Error & { statusCode: number };
      conflictErr.statusCode = 409;
      throw conflictErr;
    }
    throw err;
  }
}

export async function getUsersService(): Promise<User[]> {
  return await sql`SELECT ${SAFE_USER_COLUMNS} FROM "User" ORDER BY "id" ASC`;
}

export async function getUserByIdService(id: number): Promise<User | null> {
  const [user] = await sql`SELECT ${SAFE_USER_COLUMNS} FROM "User" WHERE "id" = ${id}`;
  return user || null;
}

export async function updateUserService(id: number, name: string | undefined, email: string | undefined): Promise<User> {
  const fragments = [];
  if (name !== undefined) fragments.push(sql`"name" = ${name}`);
  if (email !== undefined) fragments.push(sql`"email" = ${email}`);

  if (fragments.length === 0) {
    const [user] = await sql`SELECT ${SAFE_USER_COLUMNS} FROM "User" WHERE "id" = ${id}`;
    return user;
  }

  try {
    const [user] = await sql`
      UPDATE "User" SET ${joinComma(fragments)} WHERE "id" = ${id}
      RETURNING ${SAFE_USER_COLUMNS}
    `;
    return user;
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      const conflictErr = new Error("Email already exists") as Error & { statusCode: number };
      conflictErr.statusCode = 409;
      throw conflictErr;
    }
    throw err;
  }
}

export async function deleteUserService(id: number): Promise<void> {
  await sql`DELETE FROM "User" WHERE "id" = ${id}`;
}

// Change Password (self-service) — verifies the current password first so
// a stolen/left-open session can't silently take over the account.
export async function changePasswordService(id: number, currentPassword: string, newPassword: string): Promise<void> {
  const [user] = await sql`SELECT * FROM "User" WHERE "id" = ${id}`;
  if (!user) {
    const err = new Error("User not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  const isMatch = await comparePassword(currentPassword, user.password);
  if (!isMatch) {
    const err = new Error("Current password is incorrect") as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }

  const hashed = await hashPassword(newPassword);

  // Bump tokenVersion so any other active session's refresh token stops
  // working — same "logout everywhere" behavior used by password reset.
  await sql`
    UPDATE "User" SET "password" = ${hashed}, "tokenVersion" = "tokenVersion" + 1
    WHERE "id" = ${id}
  `;
}

interface PreferencesUpdate {
  avatarUrl?: string | null;
  notifyWeeklyReports?: boolean;
  notifySecurityAlerts?: boolean;
  notifyProductUpdates?: boolean;
  twoFactorEnabled?: boolean;
}

// Update Preferences (avatar, notification toggles, 2FA preference)
export async function updatePreferencesService(id: number, data: PreferencesUpdate): Promise<User> {
  const fragments = [];
  if (data.avatarUrl !== undefined) fragments.push(sql`"avatarUrl" = ${data.avatarUrl}`);
  if (data.notifyWeeklyReports !== undefined) fragments.push(sql`"notifyWeeklyReports" = ${data.notifyWeeklyReports}`);
  if (data.notifySecurityAlerts !== undefined) fragments.push(sql`"notifySecurityAlerts" = ${data.notifySecurityAlerts}`);
  if (data.notifyProductUpdates !== undefined) fragments.push(sql`"notifyProductUpdates" = ${data.notifyProductUpdates}`);
  if (data.twoFactorEnabled !== undefined) fragments.push(sql`"twoFactorEnabled" = ${data.twoFactorEnabled}`);

  if (fragments.length === 0) {
    const [user] = await sql`SELECT ${SAFE_USER_COLUMNS} FROM "User" WHERE "id" = ${id}`;
    return user;
  }

  const [user] = await sql`
    UPDATE "User" SET ${joinComma(fragments)} WHERE "id" = ${id}
    RETURNING ${SAFE_USER_COLUMNS}
  `;
  return user;
}
