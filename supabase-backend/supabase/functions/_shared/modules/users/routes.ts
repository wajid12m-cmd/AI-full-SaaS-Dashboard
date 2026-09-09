// Deno port of routes/userRoutes.js. Express applied `router.use
// (authMiddleware)` once at the top of the file so every route below it
// required login automatically — here that's written out explicitly on
// each route instead, since this router has no sub-router "use for
// everything below" concept.
import Router from "../../router.ts";
import { authMiddleware, adminMiddleware, validateBody } from "../../authMiddleware.ts";
import * as controller from "./controller.ts";
import * as v from "./validator.ts";

export default function registerUserRoutes(router: Router): void {
  // Sirf admin hi sab users ki list dekh sakta hai
  router.get("/users", authMiddleware, adminMiddleware, controller.getUsers);

  // Settings page: apna khud ka password/preferences/account — sirf
  // ctx.user.id par operate karte hain, koi :id param nahi, is liye
  // adminMiddleware ki zaroorat nahi.
  router.put("/users/me/password", authMiddleware, validateBody(v.changePasswordSchema), controller.changePassword);
  router.put(
    "/users/me/preferences",
    authMiddleware,
    validateBody(v.updatePreferencesSchema),
    controller.updatePreferences
  );
  router.delete("/users/me/account", authMiddleware, controller.deleteOwnAccount);

  // Har logged-in user apna khud ka profile dekh sakta hai
  router.get("/users/:id", authMiddleware, controller.getUserById);
  router.put("/users/:id", authMiddleware, controller.updateUser);

  // Sirf admin hi user create/delete kar sakta hai
  router.post("/users", authMiddleware, adminMiddleware, controller.createUser);
  router.delete("/users/:id", authMiddleware, adminMiddleware, controller.deleteUser);
}
