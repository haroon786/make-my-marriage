import "server-only";
import { z } from "zod";

const databaseEnvironment = z.object({
  MONGODB_URI: z.string().trim().min(1).refine(
    (value) => value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
  ),
});

export function getDatabaseEnvironment() {
  const result = databaseEnvironment.safeParse({ MONGODB_URI: process.env.MONGODB_URI });
  if (!result.success) {
    // Never include the submitted URI or Zod input in an error or log.
    throw new Error("Configure a valid MONGODB_URI before using the database.");
  }
  return result.data;
}
