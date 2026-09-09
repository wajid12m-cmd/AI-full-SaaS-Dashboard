// Direct port of services/authService.js. Business logic (lockout rules,
// token expiry windows, email-enumeration protection) is UNCHANGED —
// only the database calls moved from Prisma's query builder to raw
// parameterized SQL via postgres.js. Table/column names match the
// existing Prisma-generated schema exactly, so no migration is needed.
import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import sql from "../../db.ts";
import { hashPassword, comparePassword } from "../../hash.ts";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../jwt.ts";
import { sendResetEmail, sendVerificationEmail } from "../../email.ts";

// deno-lint-ignore no-explicit-any
type User = any;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// 6-digit numeric verification code (e.g. "042917") — easy to type
// manually, unlike the old link-based random hex token. Zero-padded so
// codes like "042917" don't lose their leading zero.
function generateVerificationCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

const VERIFICATION_CODE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

// Constant-time comparison — same rationale as the original: avoids
// leaking a valid token byte-by-byte via response-time measurement.
function safeTokenCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

// Exported (not just used internally by loginService) so verifyEmail's
// controller can issue the same cookie-pair for "verify → auto-login"
// without duplicating the token-generation logic.
export function issueTokenPair(user: User) {
  const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id, tokenVersion: user.tokenVersion });
  return { accessToken, refreshToken };
}

export async function registerService(name: string, email: string, password: string): Promise<User> {
  const [existingUser] = await sql`SELECT "id" FROM "User" WHERE "email" = ${email}`;

  if (existingUser) {
    throw new Error("Email already exists");
  }

  const hashedPassword = await hashPassword(password);
  const code = generateVerificationCode();
  const hashedToken = hashToken(code);
  const expiry = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MS);

  const [user] = await sql`
    INSERT INTO "User" ("name", "email", "password", "verifyToken", "verifyTokenExpiry")
    VALUES (${name}, ${email}, ${hashedPassword}, ${hashedToken}, ${expiry})
    RETURNING *
  `;

  await sendVerificationEmail(email, code);

  return user;
}

export async function loginService(
  email: string,
  password: string
): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const [user] = await sql`SELECT * FROM "User" WHERE "email" = ${email}`;

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 60000);
    throw new Error(`Too many failed attempts. Please try again in ${minutesLeft} minute(s).`);
  }

  const isMatch = await comparePassword(password, user.password);

  if (!isMatch) {
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;

    await sql`
      UPDATE "User" SET
        "failedLoginAttempts" = ${shouldLock ? 0 : attempts},
        "lockUntil" = ${shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null}
      WHERE "email" = ${email}
    `;

    throw new Error("Invalid email or password");
  }

  if (!user.isVerified) {
    throw new Error("Please verify your email before logging in. Check your inbox for the verification code.");
  }

  if (user.failedLoginAttempts > 0 || user.lockUntil) {
    await sql`
      UPDATE "User" SET "failedLoginAttempts" = 0, "lockUntil" = NULL WHERE "email" = ${email}
    `;
  }

  const { accessToken, refreshToken } = issueTokenPair(user);

  return { user, accessToken, refreshToken };
}

export async function refreshAccessTokenService(
  rawRefreshToken: string | undefined
): Promise<{ user: User; accessToken: string }> {
  if (!rawRefreshToken) {
    throw new Error("No refresh token provided");
  }

  // deno-lint-ignore no-explicit-any
  let decoded: any;
  try {
    decoded = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new Error("Invalid or expired session. Please log in again.");
  }

  const [user] = await sql`SELECT * FROM "User" WHERE "id" = ${decoded.id}`;

  if (!user) {
    throw new Error("Invalid or expired session. Please log in again.");
  }

  if (user.tokenVersion !== decoded.tokenVersion) {
    throw new Error("Session expired. Please log in again.");
  }

  const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });

  return { user, accessToken };
}

export async function getMeService(userId: number): Promise<User> {
  const [user] = await sql`SELECT * FROM "User" WHERE "id" = ${userId}`;

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function verifyEmailService(email: string, code: string): Promise<User> {
  const [user] = await sql`SELECT * FROM "User" WHERE "email" = ${email}`;

  if (!user || !user.verifyToken || !user.verifyTokenExpiry) {
    throw new Error("Invalid or expired verification code");
  }

  if (user.isVerified) {
    return user; // already verified, treat as success — still return the
    // user so the controller can log them in either way.
  }

  if (new Date(user.verifyTokenExpiry) < new Date()) {
    throw new Error("Verification code expired. Please request a new one.");
  }

  const hashedCode = hashToken(code);

  if (!safeTokenCompare(hashedCode, user.verifyToken)) {
    throw new Error("Incorrect verification code");
  }

  const [updated] = await sql`
    UPDATE "User" SET "isVerified" = true, "verifyToken" = NULL, "verifyTokenExpiry" = NULL
    WHERE "email" = ${email}
    RETURNING *
  `;

  return updated;
}

export async function resendVerificationService(email: string): Promise<void> {
  const [user] = await sql`SELECT * FROM "User" WHERE "email" = ${email}`;

  // Security: don't reveal whether the account exists or is already
  // verified (email enumeration protection) — same as the original.
  if (!user || user.isVerified) {
    return;
  }

  const code = generateVerificationCode();
  const hashedToken = hashToken(code);
  const expiry = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MS);

  await sql`
    UPDATE "User" SET "verifyToken" = ${hashedToken}, "verifyTokenExpiry" = ${expiry}
    WHERE "email" = ${email}
  `;

  await sendVerificationEmail(email, code);
}

export async function forgotPasswordService(email: string): Promise<void> {
  const [user] = await sql`SELECT * FROM "User" WHERE "email" = ${email}`;

  if (!user) {
    return; // email enumeration protection — same as the original
  }

  const code = generateVerificationCode();
  const hashedToken = hashToken(code);
  const expiry = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MS);

  await sql`
    UPDATE "User" SET "resetToken" = ${hashedToken}, "resetTokenExpiry" = ${expiry}
    WHERE "email" = ${email}
  `;

  await sendResetEmail(email, code);
}

export async function resetPasswordService(email: string, code: string, newPassword: string): Promise<void> {
  const [user] = await sql`SELECT * FROM "User" WHERE "email" = ${email}`;

  if (!user || !user.resetToken || !user.resetTokenExpiry) {
    throw new Error("Invalid or expired reset code");
  }

  if (new Date(user.resetTokenExpiry) < new Date()) {
    throw new Error("Reset code expired. Please request a new one.");
  }

  const hashedCode = hashToken(code);

  if (!safeTokenCompare(hashedCode, user.resetToken)) {
    throw new Error("Incorrect reset code");
  }

  const hashedPassword = await hashPassword(newPassword);

  await sql`
    UPDATE "User" SET
      "password" = ${hashedPassword},
      "resetToken" = NULL,
      "resetTokenExpiry" = NULL,
      "tokenVersion" = "tokenVersion" + 1,
      "failedLoginAttempts" = 0,
      "lockUntil" = NULL
    WHERE "email" = ${email}
  `;
}
