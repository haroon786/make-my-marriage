import "server-only";
import { Types } from "mongoose";
import { connectDatabase } from "@/server/db/connection";
import { createToken, hashToken } from "@/server/security/credentials";
import { createWeddingSchema } from "./schemas";
import { insertWeddingWithAdmin } from "./repository";

export async function createWedding(userId: string, input: unknown) {
  const data = createWeddingSchema.parse(input);
  const names = `${data.brideName}-${data.groomName}`.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "wedding";
  const slug = `${names}-${data.weddingDate}-${new Types.ObjectId()}`;
  const id = await insertWeddingWithAdmin(userId, data, slug, hashToken(createToken()));
  return getWeddingSummary(id);
}

// This summary is used only after membership lookup, never directly from client input.
export async function getWeddingSummary(weddingId: string) {
  if (!Types.ObjectId.isValid(weddingId)) return null;
  const db = await connectDatabase();
  const wedding = await db.connection
    .collection("weddings")
    .findOne(
      { _id: new Types.ObjectId(weddingId), deletedAt: null },
      { projection: { brideName: 1, groomName: 1, weddingDate: 1, timeZone: 1, title: 1, description: 1, location: 1, "website.slug": 1, "website.isPublished": 1 } },
    );
  return wedding
    ? {
        id: String(wedding._id),
        brideName: wedding.brideName as string,
        groomName: wedding.groomName as string,
        weddingDate: wedding.weddingDate as string,
        timeZone: (wedding.timeZone as string) || "Asia/Kolkata",
        title: (wedding.title as string) || "",
        description: (wedding.description as string) || "",
        location: { formattedAddress: (wedding.location?.formattedAddress as string) || "" },
        website: { slug: (wedding.website?.slug as string) || "", isPublished: wedding.website?.isPublished === true },
      }
    : null;
}
