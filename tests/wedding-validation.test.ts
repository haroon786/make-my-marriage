import { describe, expect, it } from "vitest";
import { createWeddingSchema, formatWeddingDate } from "@/modules/wedding/schemas";
const valid = { brideName: " Priya ", groomName: "Arjun", weddingDate: "2028-02-29", timeZone: "Asia/Kolkata", location: { formattedAddress: " Pune " } };
describe("wedding validation", () => {
  it("trims values and supplies optional defaults", () => {
    expect(createWeddingSchema.parse(valid)).toMatchObject({ brideName: "Priya", title: "", description: "", location: { formattedAddress: "Pune" } });
  });
  it.each(["2027-02-29", "2028-02-30", "2027-13-01", "0000-01-01", "2027-01-01T00:00:00Z", ""]) ("rejects invalid calendar date %s", weddingDate => {
    expect(createWeddingSchema.safeParse({ ...valid, weddingDate }).success).toBe(false);
  });
  it("requires location and a real named time zone", () => {
    for (const update of [{ location: { formattedAddress: "  " } }, { timeZone: "Moon/Base" }, { timeZone: "+05:30" }, { brideName: " " }, { groomName: "x".repeat(101) }, { description: "x".repeat(1001) }])
      expect(createWeddingSchema.safeParse({ ...valid, ...update }).success).toBe(false);
  });
  it("rejects ownership, roles, and publication fields from the caller", () => {
    for (const update of [{ userId: "other" }, { role: "ADMIN" }, { website: { isPublished: true } }, { weddingId: "other" }])
      expect(createWeddingSchema.safeParse({ ...valid, ...update }).success).toBe(false);
  });
  it("formats the date without shifting it across time zones", () => {
    expect(formatWeddingDate("2027-02-14")).toBe("14 February 2027");
  });
});
