// Same `jsonwebtoken` package as the original utils/jwt.js — Deno's Edge
// Runtime supports npm packages and Node built-ins natively now, so this
// is close to a verbatim port (unlike bcrypt, jsonwebtoken has no native
// binary dependency, so it just works via the `npm:` specifier).
import jwt from "npm:jsonwebtoken@9.0.2";

const ACCESS_TOKEN_EXPIRY = Deno.env.get("ACCESS_TOKEN_EXPIRY") || "15m";
const REFRESH_TOKEN_EXPIRY = Deno.env.get("REFRESH_TOKEN_EXPIRY") || "30d";

function getAccessSecret(): string {
  const secret = Deno.env.get("ACCESS_TOKEN_SECRET");
  if (!secret) throw new Error("ACCESS_TOKEN_SECRET is not set");
  return secret;
}

function getRefreshSecret(): string {
  const secret = Deno.env.get("REFRESH_TOKEN_SECRET");
  if (!secret) throw new Error("REFRESH_TOKEN_SECRET is not set");
  return secret;
}

interface AccessTokenPayload {
  id: number;
  email: string;
  role: string;
}

interface RefreshTokenPayload {
  id: number;
  tokenVersion: number;
}

export function generateAccessToken({ id, email, role }: AccessTokenPayload): string {
  return jwt.sign({ id, email, role, type: "access" }, getAccessSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function generateRefreshToken({ id, tokenVersion }: RefreshTokenPayload): string {
  return jwt.sign({ id, tokenVersion, type: "refresh" }, getRefreshSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

// deno-lint-ignore no-explicit-any
export function verifyAccessToken(token: string): any {
  const decoded = jwt.verify(token, getAccessSecret());
  if (typeof decoded !== "object" || decoded.type !== "access") {
    throw new Error("Invalid token type");
  }
  return decoded;
}

// deno-lint-ignore no-explicit-any
export function verifyRefreshToken(token: string): any {
  const decoded = jwt.verify(token, getRefreshSecret());
  if (typeof decoded !== "object" || decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }
  return decoded;
}
