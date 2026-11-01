import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    emailNormalized: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    // Prevent a concurrent login from reviving a session after a password reset.
    authVersion: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, collection: "users" },
);
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    authVersion: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "sessions" },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const resetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "password_reset_tokens",
  },
);
resetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export type UserRecord = InferSchemaType<typeof userSchema>;
export const User =
  (mongoose.models.User as Model<UserRecord>) ||
  mongoose.model("User", userSchema);
export const Session =
  (mongoose.models.Session as Model<InferSchemaType<typeof sessionSchema>>) ||
  mongoose.model("Session", sessionSchema);
export const PasswordReset =
  (mongoose.models.PasswordReset as Model<
    InferSchemaType<typeof resetSchema>
  >) || mongoose.model("PasswordReset", resetSchema);
