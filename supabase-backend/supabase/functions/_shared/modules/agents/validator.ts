import { z } from "npm:zod@4.4.3";

export const createAgentSchema = z.object({
  name: z.string().trim().min(1, "Agent name is required").max(80, "Name is too long"),
  description: z.string().trim().min(1, "Description is required").max(300, "Description is too long"),
  systemPrompt: z
    .string()
    .trim()
    .min(10, "System prompt should describe how this agent behaves")
    .max(2000, "System prompt is too long"),
  modelLabel: z.string().trim().max(50).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().min(1).max(300).optional(),
  systemPrompt: z.string().trim().min(10).max(2000).optional(),
  modelLabel: z.string().trim().max(50).optional(),
  status: z.enum(["active", "idle"]).optional(),
});

export const chatWithAgentSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000, "Message is too long"),
});
