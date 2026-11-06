import { z } from "zod";
export const invitationSchema = z.strictObject({
  email: z.string().trim().email("Enter a valid email address.").max(254).transform(value => value.toLowerCase()),
  role: z.literal("MANAGER").default("MANAGER"),
});
export const memberIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid identifier.");
export const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Invalid invitation link.");
// Deliberately allow only invitation return paths, never arbitrary redirect URLs.
export function invitationReturnPath(value: unknown): string | undefined {
  return typeof value === "string" && /^\/member-invitations\/[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
}
