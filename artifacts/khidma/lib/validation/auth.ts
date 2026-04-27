import { z } from "zod";

export const RoleSchema = z.enum(["client", "freelancer"]);

export const SignupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  role: RoleSchema,
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required").max(128),
});
