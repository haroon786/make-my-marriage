import "server-only";
import mongoose from "mongoose";
import { getMembershipContext } from "@/modules/members/service";
import { getAppOrigin, getEmailEnvironment } from "@/server/config/env";
import { sendPasswordReset } from "@/server/email/password-reset";
import { AppError } from "@/server/http/errors";
import {
  createToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "@/server/security/credentials";
import * as repository from "./repository";
import { normalizeEmail, type PublicUser } from "./schemas";

export const SESSION_SECONDS = 7 * 24 * 60 * 60;
function publicUser(user: {
  _id: unknown;
  name: string;
  email: string;
}): PublicUser {
  return { id: String(user._id), name: user.name, email: user.email };
}
export async function signup(input: {
  name: string;
  email: string;
  password: string;
}) {
  await repository.authDatabase();
  const token = createToken();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  try {
    const user = await repository.createAccount(
      {
        name: input.name,
        email: input.email.trim(),
        emailNormalized: normalizeEmail(input.email),
        passwordHash: await hashPassword(input.password),
      },
      { tokenHash: hashToken(token), expiresAt },
    );
    return {
      token,
      expiresAt,
      data: { user: publicUser(user), hasWedding: false },
    };
  } catch (error) {
    if (
      error instanceof mongoose.mongo.MongoServerError &&
      error.code === 11000
    )
      throw new AppError(
        "EMAIL_ALREADY_EXISTS",
        "An account with this email already exists. Log in instead.",
        409,
      );
    throw error;
  }
}
export async function login(input: { email: string; password: string }) {
  const user = await repository.findUser(normalizeEmail(input.email));
  const valid = await verifyPassword(input.password, user?.passwordHash);
  if (!user || !valid)
    throw new AppError(
      "INVALID_CREDENTIALS",
      "Invalid email or password.",
      401,
    );
  const context = await getMembershipContext(String(user._id));
  const token = createToken();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await repository.createSession(
    user._id,
    user.authVersion,
    hashToken(token),
    expiresAt,
  );
  return {
    token,
    expiresAt,
    data: { user: publicUser(user), hasWedding: Boolean(context.wedding) },
  };
}
export async function currentUser(token?: string) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const user = await repository.findSessionUser(hashToken(token));
  return user ? publicUser(user) : null;
}
export async function logout(token: string) {
  await repository.revokeSession(hashToken(token));
}
export async function forgotPassword(email: string) {
  // Validate provider configuration for both known and unknown accounts.
  getAppOrigin();
  getEmailEnvironment();
  const user = await repository.findUser(normalizeEmail(email));
  if (!user) return;
  const token = createToken();
  const tokenHash = hashToken(token);
  await repository.saveReset(
    user._id,
    tokenHash,
    new Date(Date.now() + 30 * 60 * 1000),
  );
  try {
    await sendPasswordReset(user.email, token);
  } catch {
    await repository.discardReset(tokenHash);
    // Never log the email address, provider payload or reset URL.
    console.error("auth.reset_email_delivery_failed");
    // Same outward result as an unknown account, even if the provider fails.
  }
}
export async function resetPassword(token: string, password: string) {
  await repository.replacePassword(
    hashToken(token),
    await hashPassword(password),
  );
}
export async function getCurrentContext(token?: string) {
  const user = await currentUser(token);
  return user ? { user, ...(await getMembershipContext(user.id)) } : null;
}
