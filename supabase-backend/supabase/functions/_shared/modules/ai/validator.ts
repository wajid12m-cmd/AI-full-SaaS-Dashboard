import { z } from "npm:zod@4.4.3";

export const chatSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required").max(2000, "Prompt is too long (max 2000 characters)"),
});
