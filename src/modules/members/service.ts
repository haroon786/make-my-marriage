import "server-only";
import { Types } from "mongoose";
import { connectDatabase } from "@/server/db/connection";
import { getWeddingSummary } from "@/modules/wedding/service";

// Read-only boundary for auth. Membership creation belongs to the onboarding feature.
export async function getMembershipContext(userId: string) {
  const db = await connectDatabase();
  const membership = await db.connection
    .collection("wedding_memberships")
    .findOne({ userId: new Types.ObjectId(userId) });
  if (!membership || !["ADMIN", "MANAGER"].includes(membership.role))
    return { membership: null, wedding: null };
  const wedding = await getWeddingSummary(String(membership.weddingId));
  if (!wedding) return { membership: null, wedding: null };
  return {
    membership: { role: membership.role as "ADMIN" | "MANAGER" },
    wedding,
  };
}
