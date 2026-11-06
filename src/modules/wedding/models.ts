import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const weddingSchema = new Schema({
  brideName: { type: String, required: true, maxlength: 100 },
  groomName: { type: String, required: true, maxlength: 100 },
  weddingDate: { type: String, required: true },
  timeZone: { type: String, required: true },
  title: { type: String, default: "", maxlength: 150 },
  description: { type: String, default: "", maxlength: 1000 },
  location: { formattedAddress: { type: String, required: true, maxlength: 300 } },
  website: {
    slug: { type: String, required: true },
    theme: { type: String, default: "royal-heritage" },
    isPublished: { type: Boolean, default: false },
  },
  gallery: {
    tokenHash: { type: String, required: true, select: false },
    isEnabled: { type: Boolean, default: true },
    guestUploadsEnabled: { type: Boolean, default: true },
  },
  livestream: { isEnabled: { type: Boolean, default: false } },
  createdByUserId: { type: Schema.Types.ObjectId, required: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: "weddings" });
weddingSchema.index({ "website.slug": 1 }, { unique: true });
weddingSchema.index({ "gallery.tokenHash": 1 }, { unique: true });
weddingSchema.index({ createdAt: 1 });
export const Wedding = (mongoose.models.Wedding as Model<InferSchemaType<typeof weddingSchema>>) || mongoose.model("Wedding", weddingSchema);
