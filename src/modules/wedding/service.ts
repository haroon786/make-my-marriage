import "server-only";
import { Types } from "mongoose";
import { connectDatabase } from "@/server/db/connection";

// This summary is used only after membership lookup, never directly from client input.
export async function getWeddingSummary(weddingId: string) {
  if (!Types.ObjectId.isValid(weddingId)) return null;
  const db = await connectDatabase();
  const wedding = await db.connection
    .collection("weddings")
    .findOne(
      { _id: new Types.ObjectId(weddingId), deletedAt: null },
      { projection: { brideName: 1, groomName: 1, weddingDate: 1 } },
    );
  return wedding
    ? {
        id: String(wedding._id),
        brideName: wedding.brideName as string,
        groomName: wedding.groomName as string,
        weddingDate: wedding.weddingDate,
      }
    : null;
}
