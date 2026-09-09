import { z } from "npm:zod@4.4.3";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(100, "Project name is too long"),
  description: z.string().trim().max(500, "Description is too long").optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(100).optional(),
  description: z.string().trim().max(500).optional(),
  status: z.enum(["active", "completed", "pending"]).optional(),
});
