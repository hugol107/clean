import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(200)
    .regex(/[a-zA-Z]/, "Include at least one letter")
    .regex(/[0-9]/, "Include at least one number"),
  organizationName: z.string().trim().min(2, "Company name is too short").max(160),
});

export const magicLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
