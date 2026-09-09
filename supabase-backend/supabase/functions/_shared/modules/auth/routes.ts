// Deno port of routes/authRoutes.js — same paths, same middleware order.
// GET /auth/me additionally requires authMiddleware, matching the
// original `router.get("/me", authMiddleware, getMe)`.
import Router from "../../router.ts";
import { authMiddleware, validateBody } from "../../authMiddleware.ts";
import { authRateLimiter } from "../../rateLimiter.ts";
import * as controller from "./controller.ts";
import * as v from "./validator.ts";

export default function registerAuthRoutes(router: Router): void {
  router.post("/auth/register", authRateLimiter, validateBody(v.registerSchema), controller.register);
  router.post("/auth/login", authRateLimiter, validateBody(v.loginSchema), controller.login);
  router.post("/auth/refresh", controller.refresh);
  router.post("/auth/logout", controller.logout);
  router.get("/auth/me", authMiddleware, controller.me);
  router.post(
    "/auth/forgot-password",
    authRateLimiter,
    validateBody(v.forgotPasswordSchema),
    controller.forgotPassword
  );
  router.post(
    "/auth/reset-password",
    authRateLimiter,
    validateBody(v.resetPasswordSchema),
    controller.resetPassword
  );
  router.post(
    "/auth/verify-email",
    authRateLimiter,
    validateBody(v.verifyEmailSchema),
    controller.verifyEmail
  );
  router.post(
    "/auth/resend-verification",
    authRateLimiter,
    validateBody(v.resendVerificationSchema),
    controller.resendVerification
  );
}
