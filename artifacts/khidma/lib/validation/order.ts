import { z } from "zod";

export const OrderInputSchema = z.object({
  serviceId: z.string().uuid().or(z.string().min(1)),
  tier: z.enum(["basic", "standard", "premium"]),
  requirements: z.string().max(2000).optional(),
});

export const OrderStatusSchema = z.enum([
  "pending",
  "in_progress",
  "review",
  "completed",
  "cancelled",
]);

export const QuoteRequestSchema = z.object({
  freelancerId: z.string().optional().nullable(),
  serviceId: z.string().optional().nullable(),
  title: z.string().min(4).max(120),
  description: z.string().min(20).max(2000),
  budget: z.number().positive().optional().nullable(),
});
