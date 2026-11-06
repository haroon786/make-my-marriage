import "server-only";
import { Types } from "mongoose";
import { connectDatabase } from "@/server/db/connection";
import { getWeddingSummary } from "@/modules/wedding/service";

// Resolve the tenant from trusted membership, never a client-supplied wedding ID.
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
