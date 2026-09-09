// Deno port of controllers/adminController.js. Unlike every other module
// in this rewrite, the original admin controller routed errors through
// `next(error)` to Express's global errorHandler.js instead of catching
// them locally — which hides raw error messages in production and maps
// Postgres's unique-violation to a clean 409. That behavior is
// reproduced here in handleError() below, since there's no Deno
// equivalent of Express's global error middleware chain to fall back on.
import { successResponse, errorResponse } from "../../response.ts";
import type { RouteContext } from "../../router.ts";
import * as adminService from "./service.ts";

function handleError(err: unknown): Response {
  const e = err as { code?: string; message?: string; statusCode?: number };
  console.error(e);

  // Postgres unique_violation — same case the original's errorHandler.js
  // mapped from Prisma's "P2002".
  if (e.code === "23505") {
    return errorResponse("This record already exists (duplicate entry).", 409);
  }

  const statusCode = e.statusCode || 500;
  const isProd = Deno.env.get("NODE_ENV") === "production";
  const message = isProd ? "Something went wrong. Please try again later." : e.message || "Internal Server Error";

  return errorResponse(message, statusCode);
}

export async function getAllUsers(req: Request, _ctx: RouteContext): Promise<Response> {
  try {
    const { page, limit, skip } = adminService.parsePagination(new URL(req.url));
    const result = await adminService.getAllUsersService(page, limit, skip);
    return successResponse(result, "OK");
  } catch (err) {
    return handleError(err);
  }
}

export async function getAllProjects(req: Request, _ctx: RouteContext): Promise<Response> {
  try {
    const { page, limit, skip } = adminService.parsePagination(new URL(req.url));
    const result = await adminService.getAllProjectsService(page, limit, skip);
    return successResponse(result, "OK");
  } catch (err) {
    return handleError(err);
  }
}

export async function getAdminStats(): Promise<Response> {
  try {
    const stats = await adminService.getAdminStatsService();
    return successResponse(stats, "OK");
  } catch (err) {
    return handleError(err);
  }
}
