import { z } from "zod";

const PackageSchema = z.object({
  tier: z.enum(["basic", "standard", "premium"]),
  name: z.string().min(1).max(40),
  price: z.number().positive("Price must be > 0"),
  deliveryDays: z.number().int().min(1).max(60),
  revisions: z.number().int().min(0).max(20),
  features: z.array(z.string().max(80)).max(10),
});

export const ServiceSchema = z.object({
  title: z.string().min(8).max(120),
  titleAr: z.string().min(4).max(120),
  description: z.string().min(20).max(2000),
  descriptionAr: z.string().min(10).max(2000),
  category: z.enum([
    "shopify",
    "salla",
    "ads",
    "seo",
    "branding",
    "photography",
    "content",
  ]),
  packages: z.array(PackageSchema).length(3),
  tags: z.array(z.string().max(24)).max(10).optional(),
});
