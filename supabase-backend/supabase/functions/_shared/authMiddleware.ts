// Deno port of middleware/authMiddleware.js + middleware/validate.js.
// Lives in _shared/ (not modules/auth/) because every future module
// (projects, agents, billing, ...) needs the same "is this request
// authenticated" and "does this body pass its schema" checks — same as
// how the original Express app reused these two middlewares across every
// route file, not just authRoutes.js.
//
// Express attaches things to `req.user` / `req.body`; here middlewares
// write onto the shared `ctx` object instead (see router.ts).
import { z } from "npm:zod@4.4.3";
import { verifyAccessToken } from "./jwt.ts";
import { ACCESS_COOKIE_NAME, parseCookies } from "./cookies.ts";
import { errorResponse } from "./response.ts";
import type { Middleware, RouteContext } from "./router.ts";

export const authMiddleware: Middleware = (req: Request, ctx: RouteContext) => {
  try {
    const cookies = parseCookies(req);
    let token = cookies[ACCESS_COOKIE_NAME];

    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return Promise.resolve(errorResponse("No token provided", 401));
    }

    ctx.user = verifyAccessToken(token);
    return Promise.resolve(null); // continue to the next middleware / handler
  } catch (err) {
    console.error("JWT Verify Error:", (err as Error).message);
    return Promise.resolve(errorResponse("Invalid or expired token", 401));
  }
};

// middleware/adminMiddleware.js port — must run AFTER authMiddleware in
// a route's middleware chain, since it reads ctx.user.
export const adminMiddleware: Middleware = (_req: Request, ctx: RouteContext) => {
  if (ctx.user?.role !== "admin") {
    return Promise.resolve(errorResponse("Access denied. Admins only.", 403));
  }
  return Promise.resolve(null);
};

// Reads + validates the JSON body ONCE (a Request body can only be
// consumed a single time) and stores the cleaned result on ctx.body for
// the controller to use — mirrors validate.js writing back onto
// `req.body`.
// deno-lint-ignore no-explicit-any
export function validateBody(schema: z.ZodType<any>): Middleware {
  return async (req: Request, ctx: RouteContext) => {
    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const result = schema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      return errorResponse(firstError?.message || "Invalid input", 400);
    }

    ctx.body = result.data;
    return null;
  };
}
