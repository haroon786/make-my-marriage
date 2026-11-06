import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  weddingId: { type: Schema.Types.ObjectId, required: true },
  email: { type: String, required: true },
  emailNormalized: { type: String, required: true },
  role: { type: String, enum: ["MANAGER"], default: "MANAGER", required: true },
  tokenHash: { type: String, required: true, select: false },
  status: { type: String, enum: ["PENDING", "ACCEPTED", "DECLINED", "REVOKED"], default: "PENDING", required: true },
  invitedByUserId: { type: Schema.Types.ObjectId, required: true },
  acceptedByUserId: Schema.Types.ObjectId,
  expiresAt: { type: Date, required: true },
  acceptedAt: Date,
  sendAttemptAt: { type: Date, required: true },
  deliveryStatus: { type: String, enum: ["SENDING", "SENT", "FAILED"], default: "SENDING" },
}, { timestamps: true, collection: "wedding_member_invitations" });
schema.index({ tokenHash: 1 }, { unique: true });
schema.index({ weddingId: 1, emailNormalized: 1 }, { unique: true, partialFilterExpression: { status: "PENDING" } });
schema.index({ weddingId: 1, status: 1 });
export const MemberInvitation = (mongoose.models.MemberInvitation as Model<InferSchemaType<typeof schema>>) || mongoose.model("MemberInvitation", schema);
