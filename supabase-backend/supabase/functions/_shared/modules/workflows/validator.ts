import { z } from "npm:zod@4.4.3";

const TRIGGERS = ["New Lead", "New Ticket", "New Customer", "New Invoice", "New File", "Schedule"] as const;

export const createWorkflowSchema = z.object({
  name: z.string().trim().min(1, "Workflow name is required").max(80),
  description: z.string().trim().min(1, "Description is required").max(300),
  trigger: z.enum(TRIGGERS, { message: `Trigger must be one of: ${TRIGGERS.join(", ")}` }),
});

export const updateWorkflowSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().min(1).max(300).optional(),
  trigger: z.enum(TRIGGERS).optional(),
  status: z.enum(["active", "paused", "draft"]).optional(),
});
