import "server-only";
import mongoose from "mongoose";
import { connectDatabase } from "@/server/db/connection";
import { WeddingMembership } from "@/modules/members/models";
import { Wedding } from "./models";
import type { CreateWeddingInput } from "./schemas";
import { AppError } from "@/server/http/errors";

let indexes: Promise<unknown> | undefined;
export async function weddingDatabase() {
  await connectDatabase();
  indexes ??= Promise.all([Wedding.createIndexes(), WeddingMembership.createIndexes()]).catch((error) => {
    indexes = undefined;
    throw error;
  });
  await indexes;
}
export function alreadyHasWedding() {
  return new AppError("ALREADY_HAS_WEDDING", "You already belong to a wedding. Open your workspace to continue.", 409);
}
export async function insertWeddingWithAdmin(userId: string, input: CreateWeddingInput, slug: string, tokenHash: string) {
  await weddingDatabase();
  try {
    return await mongoose.connection.transaction(async (session) => {
      if (await WeddingMembership.exists({ userId }).session(session)) throw alreadyHasWedding();
      const [wedding] = await Wedding.create([{
        ...input, createdByUserId: userId,
        website: { slug, theme: "royal-heritage", isPublished: false },
        gallery: { tokenHash, isEnabled: true, guestUploadsEnabled: true },
      }], { session });
      // Sequential operations: MongoDB transactions do not support parallel writes.
      await WeddingMembership.create([{ userId, weddingId: wedding._id, role: "ADMIN" }], { session });
      return String(wedding._id);
    });
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000 && await WeddingMembership.exists({ userId })) throw alreadyHasWedding();
    throw error;
  }
}
