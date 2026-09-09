import { z } from "npm:zod@4.4.3";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export const updatePreferencesSchema = z.object({
  avatarUrl: z.string().trim().url("Enter a valid URL").nullable().optional().or(z.literal("")),
  notifyWeeklyReports: z.boolean().optional(),
  notifySecurityAlerts: z.boolean().optional(),
  notifyProductUpdates: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
});
