import { z } from "zod";

export const weddingDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid wedding date.").refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return value.slice(0, 4) !== "0000" && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Choose a real calendar date.");
const name = z.string().trim().min(1, "Enter a name.").max(100, "Use 100 characters or fewer.");
export const createWeddingSchema = z.strictObject({
  brideName: name,
  groomName: name,
  weddingDate: weddingDateSchema,
  timeZone: z.string().trim().min(1, "Choose a time zone.").max(100).refine((value) => {
    try { new Intl.DateTimeFormat("en", { timeZone: value }); return !/^[+-]/.test(value); } catch { return false; }
  }, "Choose a valid IANA time zone, such as Asia/Kolkata."),
  location: z.strictObject({ formattedAddress: z.string().trim().min(1, "Enter the wedding city or venue address.").max(300, "Use 300 characters or fewer.") }),
  title: z.string().trim().max(150, "Use 150 characters or fewer.").optional().default(""),
  description: z.string().trim().max(1000, "Use 1,000 characters or fewer.").optional().default(""),
});
export type CreateWeddingInput = z.infer<typeof createWeddingSchema>;
export const updateWeddingSchema = createWeddingSchema.partial().extend({
  title: z.string().trim().max(150, "Use 150 characters or fewer.").optional(),
  description: z.string().trim().max(1000, "Use 1,000 characters or fewer.").optional(),
}).refine(
  (value) => Object.values(value).some((field) => field !== undefined),
  "Change at least one wedding detail.",
);

export function formatWeddingDate(value: string) {
  if (!weddingDateSchema.safeParse(value).success) return "Choose your date";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
