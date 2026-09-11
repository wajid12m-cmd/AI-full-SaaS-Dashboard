import { z } from "npm:zod@4.4.3";

export const chatSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required").max(2000, "Prompt is too long (max 2000 characters)"),
  conversationId: z.coerce.number().int().positive().optional(),
});

export const createConversationSchema = z.object({
  title: z.string().trim().max(200, "Title is too long").optional(),
});

export const updateConversationSchema = z.object({
  title: z.string().trim().min(1).max(200, "Title is too long").optional(),
  pinned: z.boolean().optional(),
});

export const imageSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required").max(500, "Prompt is too long (max 500 characters)"),
  conversationId: z.coerce.number().int().positive().optional(),
  count: z.coerce.number().int().min(1).max(4).optional(),
});
