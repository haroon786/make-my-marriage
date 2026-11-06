import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const membershipSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, unique: true },
  weddingId: { type: Schema.Types.ObjectId, required: true, index: true },
  role: { type: String, enum: ["ADMIN", "MANAGER"], required: true },
  joinedAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true, collection: "wedding_memberships" });
membershipSchema.index({ weddingId: 1, userId: 1 }, { unique: true });
export const WeddingMembership = (mongoose.models.WeddingMembership as Model<InferSchemaType<typeof membershipSchema>>) || mongoose.model("WeddingMembership", membershipSchema);
