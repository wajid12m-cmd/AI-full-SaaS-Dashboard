import { z } from "npm:zod@4.4.3";

export const updateIntegrationSchema = z.object({
  status: z.enum(["connected", "disconnected"]),
});
