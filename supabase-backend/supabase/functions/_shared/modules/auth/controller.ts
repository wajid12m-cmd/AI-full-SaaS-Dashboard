// Deno port of controllers/authController.js. Each Express handler
// `(req, res) => {...}` becomes `(req, ctx) => Promise<Response>` — same
// control flow, same error messages, same response shape.
import { successResponse, errorResponse } from "../../response.ts";
import {
  setAuthCookies,
  setAccessCookie,
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
  parseCookies,
} from "../../cookies.ts";
import type { RouteContext } from "../../router.ts";
import * as authService from "./service.ts";

// deno-lint-ignore no-explicit-any
function sanitizeUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
}

export async function register(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const { name, email, password } = ctx.body;
    const user = await authService.registerService(name, email, password);
    return successResponse(
      sanitizeUser(user),
      "Registration successful. Please check your email to verify your account.",
      201
    );
  } catch (err) {
    console.error(err);
    return errorResponse((err as Error).message, 400);
  }
}

export async function login(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const { email, password } = ctx.body;
    const { user, accessToken, refreshToken } = await authService.loginService(email, password);

    const headers = new Headers();
    setAuthCookies(headers, { accessToken, refreshToken });

    return successResponse(sanitizeUser(user), "Login successful", 200, headers);
  } catch (err) {
    console.error(err);
    return errorResponse((err as Error).message, 400);
  }
}

// POST /auth/refresh — reads the refresh cookie, issues a fresh
// short-lived access cookie. Called automatically by the frontend's
// apiClient when an access-token request comes back 401.
export async function refresh(req: Request): Promise<Response> {
  try {
    const cookies = parseCookies(req);
    const rawRefreshToken = cookies[REFRESH_COOKIE_NAME];

    const { user, accessToken } = await authService.refreshAccessTokenService(rawRefreshToken);

    const headers = new Headers();
    setAccessCookie(headers, accessToken);

    return successResponse(sanitizeUser(user), "Token refreshed", 200, headers);
  } catch (err) {
    const headers = new Headers();
    clearAuthCookies(headers);
    return errorResponse((err as Error).message, 401, headers);
  }
}

// POST /auth/logout — clears both cookies. Does not need to touch the
// database (tokenVersion is only bumped on password reset / "logout
// everywhere", not a regular logout).
export function logout(): Promise<Response> {
  const headers = new Headers();
  clearAuthCookies(headers);
  return Promise.resolve(successResponse(null, "Logged out successfully", 200, headers));
}

export async function me(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const user = await authService.getMeService(ctx.user.id);
    return successResponse(sanitizeUser(user), "OK");
  } catch (err) {
    return errorResponse((err as Error).message, 404);
  }
}

export async function verifyEmail(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const { email, code } = ctx.body;
    const user = await authService.verifyEmailService(email, code);

    // Auto-login: the person just proved both their password (at signup)
    // and access to their inbox (this code) — no reason to make them
    // type their password a second time on a login screen right after.
    const { accessToken, refreshToken } = authService.issueTokenPair(user);
    const headers = new Headers();
    setAuthCookies(headers, { accessToken, refreshToken });

    return successResponse(sanitizeUser(user), "Email verified successfully.", 200, headers);
  } catch (err) {
    return errorResponse((err as Error).message, 400);
  }
}

export async function resendVerification(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const { email } = ctx.body;
    await authService.resendVerificationService(email);
    // Same email-enumeration-safe message regardless of whether the
    // account exists or was already verified.
    return successResponse(null, "If an account exists and isn't verified yet, a new link has been sent.");
  } catch (err) {
    console.error(err);
    return errorResponse("Something went wrong. Please try again.", 500);
  }
}

export async function forgotPassword(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const { email } = ctx.body;
    await authService.forgotPasswordService(email);
    return successResponse(null, "If an account exists with that email, a reset link has been sent.");
  } catch (err) {
    console.error(err);
    return errorResponse("Something went wrong. Please try again.", 500);
  }
}

export async function resetPassword(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const { email, code, newPassword } = ctx.body;
    await authService.resetPasswordService(email, code, newPassword);
    return successResponse(null, "Password reset successfully. Please log in with your new password.");
  } catch (err) {
    return errorResponse((err as Error).message, 400);
  }
}
