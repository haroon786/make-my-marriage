import "server-only";
import mongoose, { type Types } from "mongoose";
import { connectDatabase } from "@/server/db/connection";
import { AppError } from "@/server/http/errors";
import { PasswordReset, Session, User } from "./models";

let indexes: Promise<unknown> | undefined;
export async function authDatabase() {
  await connectDatabase();
  // Unique and TTL indexes must exist before accepting writes (also in production).
  indexes ??= Promise.all([
    User.createIndexes(),
    Session.createIndexes(),
    PasswordReset.createIndexes(),
  ]).catch((error) => {
    indexes = undefined;
    throw error;
  });
  await indexes;
}
export async function findUser(emailNormalized: string) {
  await authDatabase();
  return User.findOne({ emailNormalized }).select("+passwordHash").lean();
}
export async function createAccount(
  data: {
    name: string;
    email: string;
    emailNormalized: string;
    passwordHash: string;
  },
  session: { tokenHash: string; expiresAt: Date },
) {
  await authDatabase();
  return mongoose.connection.transaction(async (transaction) => {
    const [user] = await User.create([data], { session: transaction });
    await Session.create(
      [{ ...session, userId: user._id, authVersion: user.authVersion }],
      { session: transaction },
    );
    return user;
  });
}
export async function createSession(
  userId: Types.ObjectId,
  authVersion: number,
  tokenHash: string,
  expiresAt: Date,
) {
  await authDatabase();
  await Session.create({ userId, authVersion, tokenHash, expiresAt });
}
export async function findSessionUser(tokenHash: string) {
  await authDatabase();
  // Never rely on asynchronous MongoDB TTL cleanup for authorization.
  const session = await Session.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) return null;
  return User.findOne({
    _id: session.userId,
    authVersion: session.authVersion,
  }).lean();
}
export async function revokeSession(tokenHash: string) {
  await authDatabase();
  await Session.deleteOne({ tokenHash });
}
export async function saveReset(
  userId: Types.ObjectId,
  tokenHash: string,
  expiresAt: Date,
) {
  await authDatabase();
  await PasswordReset.create({ userId, tokenHash, expiresAt });
}
export async function discardReset(tokenHash: string) {
  await PasswordReset.deleteOne({ tokenHash });
}
export async function replacePassword(tokenHash: string, passwordHash: string) {
  await authDatabase();
  await mongoose.connection.transaction(async (transaction) => {
    const reset = await PasswordReset.findOneAndUpdate(
      { tokenHash, usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
      { session: transaction, returnDocument: "after" },
    );
    if (!reset)
      throw new AppError(
        "INVALID_TOKEN",
        "This reset link is invalid or expired. Request a new one.",
        400,
      );
    const result = await User.updateOne(
      { _id: reset.userId },
      { $set: { passwordHash }, $inc: { authVersion: 1 } },
      { session: transaction },
    );
    if (!result.matchedCount)
      throw new AppError(
        "INVALID_TOKEN",
        "This reset link is invalid or expired. Request a new one.",
        400,
      );
    await Session.deleteMany(
      { userId: reset.userId },
      { session: transaction },
    );
    await PasswordReset.deleteMany(
      { userId: reset.userId },
      { session: transaction },
    );
  });
}
