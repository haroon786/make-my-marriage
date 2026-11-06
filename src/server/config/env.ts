import "server-only";
import { z } from "zod";
import { AppError } from "@/server/http/errors";

const databaseEnvironment = z.object({
  MONGODB_URI: z
    .string()
    .trim()
    .min(1)
    .refine(
      (value) =>
        value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
    ),
});

export function getDatabaseEnvironment() {
  const result = databaseEnvironment.safeParse({
    MONGODB_URI: process.env.MONGODB_URI,
  });
  if (!result.success) {
    // Never include the submitted URI or Zod input in an error or log.
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Account services aren’t configured yet. Please try again later.",
      503,
    );
  }
  return result.data;
}

export function getAppOrigin() {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const parsed = z
    .url()
    .safeParse(
      configured ||
        (process.env.NODE_ENV !== "production"
          ? "http://localhost:3000"
          : undefined),
    );
  if (!parsed.success)
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Account services aren’t configured yet. Please try again later.",
      503,
    );
  const url = new URL(parsed.data);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (process.env.NODE_ENV === "production" && url.protocol !== "https:")
  ) {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Account services aren’t configured yet. Please try again later.",
      503,
    );
  }
  return url.origin;
}

export function getEmailEnvironment() {
  const result = z
    .object({
      RESEND_API_KEY: z.string().trim().min(1),
      EMAIL_FROM: z.string().trim().min(3),
    })
    .safeParse({
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM,
    });
  if (!result.success)
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Email sending isn’t configured yet. Please try again later.",
      503,
    );
  return result.data;
}
