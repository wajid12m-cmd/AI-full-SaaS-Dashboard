// Deno port of controllers/userController.js. Two routes here
// (createUser, updateUser) intentionally have NO validateBody middleware
// in front of them — same as the original, which read req.body directly
// without a zod schema — so this controller parses the JSON body itself
// instead of reading it off ctx.body.
import { successResponse, errorResponse } from "../../response.ts";
import type { RouteContext } from "../../router.ts";
import * as userService from "./service.ts";

async function parseJsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function statusFromError(err: unknown): number | undefined {
  return (err as { statusCode?: number }).statusCode;
}

export async function createUser(req: Request): Promise<Response> {
  try {
    const body = await parseJsonBody(req);
    const name = body.name as string | undefined;
    const email = body.email as string | undefined;

    if (!name || !email) {
      return errorResponse("Name and Email are required", 400);
    }

    const user = await userService.createUserService(name, email);
    return successResponse(user, "User created successfully", 201);
  } catch (err) {
    const status = statusFromError(err);
    if (status) return errorResponse((err as Error).message, status);
    console.error(err);
    return errorResponse("Internal Server Error", 500);
  }
}

export async function getUsers(): Promise<Response> {
  try {
    const users = await userService.getUsersService();
    return successResponse(users, "Users fetched successfully");
  } catch (err) {
    console.error(err);
    return errorResponse("Internal Server Error", 500);
  }
}

export async function getUserById(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const id = Number(ctx.params.id);
    if (isNaN(id)) return errorResponse("Invalid User ID", 400);

    // Sirf admin ya khud user hi ye profile dekh sakta hai
    if (ctx.user.role !== "admin" && ctx.user.id !== id) {
      return errorResponse("Access denied", 403);
    }

    const user = await userService.getUserByIdService(id);
    if (!user) return errorResponse("User not found", 404);

    return successResponse(user, "User fetched successfully");
  } catch (err) {
    console.error(err);
    return errorResponse("Internal Server Error", 500);
  }
}

export async function updateUser(req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const id = Number(ctx.params.id);
    if (isNaN(id)) return errorResponse("Invalid User ID", 400);

    // Sirf admin ya khud user hi ye profile update kar sakta hai
    if (ctx.user.role !== "admin" && ctx.user.id !== id) {
      return errorResponse("Access denied", 403);
    }

    const existingUser = await userService.getUserByIdService(id);
    if (!existingUser) return errorResponse("User not found", 404);

    const body = await parseJsonBody(req);
    const updatedUser = await userService.updateUserService(
      id,
      body.name as string | undefined,
      body.email as string | undefined
    );

    return successResponse(updatedUser, "User updated successfully");
  } catch (err) {
    const status = statusFromError(err);
    if (status) return errorResponse((err as Error).message, status);
    console.error(err);
    return errorResponse("Internal Server Error", 500);
  }
}

// Defense-in-depth: this handler is currently only wired up behind
// adminMiddleware (see routes.ts), but the check here doesn't rely on
// that alone — if a route ever changes, this still blocks a random
// logged-in user from deleting someone else's account.
export async function deleteUser(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const id = Number(ctx.params.id);
    if (isNaN(id)) return errorResponse("Invalid User ID", 400);

    if (ctx.user.role !== "admin" && ctx.user.id !== id) {
      return errorResponse("Access denied", 403);
    }

    const existingUser = await userService.getUserByIdService(id);
    if (!existingUser) return errorResponse("User not found", 404);

    await userService.deleteUserService(id);
    return successResponse(null, "User deleted successfully");
  } catch (err) {
    console.error(err);
    return errorResponse("Internal Server Error", 500);
  }
}

// Change Password (Settings page → Security tab). Always operates on the
// logged-in user's own account (ctx.user.id), never a param.
export async function changePassword(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const { currentPassword, newPassword } = ctx.body;
    await userService.changePasswordService(ctx.user.id, currentPassword, newPassword);
    return successResponse(null, "Password updated successfully");
  } catch (err) {
    const status = statusFromError(err);
    if (status) return errorResponse((err as Error).message, status);
    console.error(err);
    return errorResponse("Internal Server Error", 500);
  }
}

// Update Preferences (Settings page → Profile/Notifications/Preferences
// tabs): avatar URL, notification toggles, 2FA preference.
export async function updatePreferences(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    const updated = await userService.updatePreferencesService(ctx.user.id, ctx.body);
    return successResponse(updated, "Preferences updated successfully");
  } catch (err) {
    console.error(err);
    return errorResponse("Internal Server Error", 500);
  }
}

// Delete own account (Settings page → Danger Zone). Deliberately separate
// from the admin-only /:id route above — always targets ctx.user.id.
export async function deleteOwnAccount(_req: Request, ctx: RouteContext): Promise<Response> {
  try {
    await userService.deleteUserService(ctx.user.id);
    return successResponse(null, "Account deleted successfully");
  } catch (err) {
    console.error(err);
    return errorResponse("Internal Server Error", 500);
  }
}
