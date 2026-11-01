import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .max(254)
  .email("Enter a valid email address.");
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use no more than 128 characters.");
export const tokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "This reset link is invalid.");
export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(100),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();
export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "Enter your password.").max(128),
  })
  .strict();
export const forgotPasswordSchema = z.object({ email: emailSchema }).strict();
export const resetPasswordSchema = z
  .object({ token: tokenSchema, password: passwordSchema })
  .strict();
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export type PublicUser = { id: string; name: string; email: string };
export type AuthMode =
  "signup" | "login" | "forgot-password" | "reset-password";
