import "server-only";
import mongoose from "mongoose";
import { User } from "@/modules/auth/models";
import { normalizeEmail, type PublicUser } from "@/modules/auth/schemas";
import { Wedding } from "@/modules/wedding/models";
import { weddingDatabase, alreadyHasWedding } from "@/modules/wedding/repository";
import { createToken, hashToken } from "@/server/security/credentials";
import { sendMemberInvitation } from "@/server/email/member-invitation";
import { AppError } from "@/server/http/errors";
import { MemberInvitation } from "./invitation-model";
import { WeddingMembership } from "./models";
import { invitationTokenSchema, memberIdSchema } from "./schemas";

const lifetime = 7 * 24 * 60 * 60 * 1000;
let indexes: Promise<unknown> | undefined;
export async function memberDatabase() {
  await weddingDatabase();
  indexes ??= MemberInvitation.createIndexes().catch(error => { indexes = undefined; throw error; });
  await indexes;
}
const unavailable = () => new AppError("INVALID_INVITATION", "This invitation is expired, revoked, or no longer available. Ask the wedding Admin for a new invitation.", 410);
function summary(invite: { _id: unknown; email: string; role: string; status: string; expiresAt: Date; deliveryStatus?: string | null; sendAttemptAt: Date }) {
  return { id: String(invite._id), email: invite.email, role: invite.role, status: invite.expiresAt <= new Date() && invite.status === "PENDING" ? "EXPIRED" : invite.status, expiresAt: invite.expiresAt.toISOString(), deliveryStatus: invite.deliveryStatus || "FAILED", retryAfter: new Date(invite.sendAttemptAt.getTime() + 60000).toISOString() };
}
export async function listMembers(weddingId: string) {
  await memberDatabase();
  const rows = await WeddingMembership.find({ weddingId }).sort({ joinedAt: 1 }).lean();
  const users = await User.find({ _id: { $in: rows.map(row => row.userId) } }).select("name email").lean();
  return rows.map(row => { const user = users.find(user => String(user._id) === String(row.userId)); return { membershipId: String(row._id), user: { id: String(row.userId), name: user?.name || "Unavailable account", email: user?.email || "" }, role: row.role, joinedAt: row.joinedAt.toISOString() }; });
}
export async function listInvitations(weddingId: string) {
  await memberDatabase();
  return (await MemberInvitation.find({ weddingId, status: "PENDING" }).sort({ createdAt: -1 }).lean()).map(summary);
}
async function deliver(invite: NonNullable<Awaited<ReturnType<typeof MemberInvitation.findOne>>>, token: string, names: string) {
  let deliveryStatus = "SENT";
  try { await sendMemberInvitation(invite.email, token, names, `member-invite/${invite._id}/${hashToken(token)}`); }
  catch { deliveryStatus = "FAILED"; }
  // An old delivery response must never overwrite a newer send attempt.
  await MemberInvitation.updateOne({ _id: invite._id, tokenHash: hashToken(token), status: "PENDING" }, { $set: { deliveryStatus } });
  return { ...summary(invite), deliveryStatus };
}
export async function inviteMember(weddingId: string, userId: string, email: string, names: string) {
  await memberDatabase();
  const existingUser = await User.findOne({ emailNormalized: email }).select("_id").lean();
  if (existingUser && await WeddingMembership.exists({ weddingId, userId: existingUser._id })) throw new AppError("ALREADY_MEMBER", "This person already belongs to your wedding.", 409);
  const token = createToken();
  let invite;
  try { invite = await MemberInvitation.create({ weddingId, email, emailNormalized: email, invitedByUserId: userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + lifetime), sendAttemptAt: new Date() }); }
  catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) throw new AppError("INVITATION_EXISTS", "An invitation already exists for this email. Resend or revoke it from the list below.", 409);
    throw error;
  }
  return deliver(invite, token, names);
}
export async function resendInvitation(weddingId: string, id: string, names: string) {
  await memberDatabase(); memberIdSchema.parse(id);
  const token = createToken();
  const invite = await MemberInvitation.findOneAndUpdate({ _id: id, weddingId, status: "PENDING", sendAttemptAt: { $lte: new Date(Date.now() - 60000) } }, { $set: { tokenHash: hashToken(token), expiresAt: new Date(Date.now() + lifetime), sendAttemptAt: new Date(), deliveryStatus: "SENDING" } }, { returnDocument: "after" });
  if (!invite) {
    if (await MemberInvitation.exists({ _id: id, weddingId, status: "PENDING" })) throw new AppError("SEND_COOLDOWN", "Please wait one minute between invitation emails.", 409);
    throw unavailable();
  }
  return deliver(invite, token, names);
}
export async function revokeInvitation(weddingId: string, id: string) {
  await memberDatabase(); memberIdSchema.parse(id);
  const result = await MemberInvitation.updateOne({ _id: id, weddingId, status: "PENDING" }, { $set: { status: "REVOKED" } });
  if (!result.matchedCount) throw unavailable();
  return { revoked: true };
}
export async function removeMember(weddingId: string, id: string) {
  await memberDatabase(); memberIdSchema.parse(id);
  const member = await WeddingMembership.findOne({ _id: id, weddingId });
  if (!member) throw new AppError("NOT_FOUND", "This member is no longer in your wedding.", 404);
  if (member.role === "ADMIN") throw new AppError("LAST_ADMIN", "The wedding creator and Admin cannot be removed.", 409);
  await WeddingMembership.deleteOne({ _id: id, weddingId, role: "MANAGER" });
  return { removed: true };
}
export async function publicInvitation(token: string) {
  if (!invitationTokenSchema.safeParse(token).success) throw unavailable();
  await memberDatabase();
  const invite = await MemberInvitation.findOne({ tokenHash: hashToken(token), status: "PENDING", expiresAt: { $gt: new Date() } }).lean();
  if (!invite) throw unavailable();
  const wedding = await Wedding.findOne({ _id: invite.weddingId, deletedAt: null }).select("brideName groomName weddingDate").lean();
  if (!wedding) throw unavailable();
  return { email: invite.email, role: "MANAGER", wedding: { brideName: wedding.brideName, groomName: wedding.groomName, weddingDate: wedding.weddingDate }, expiresAt: invite.expiresAt.toISOString() };
}
export async function respondToInvitation(token: string, user: PublicUser, action: "accept" | "decline") {
  if (!invitationTokenSchema.safeParse(token).success) throw unavailable();
  await memberDatabase();
  try {
    return await mongoose.connection.transaction(async session => {
      const invite = await MemberInvitation.findOne({ tokenHash: hashToken(token) }).session(session);
      if (!invite) throw unavailable();
      if (normalizeEmail(user.email) !== invite.emailNormalized) throw new AppError("INVITATION_EMAIL_MISMATCH", "Sign in with the email address this invitation was sent to.", 403);
      if (action === "accept" && invite.status === "ACCEPTED" && String(invite.acceptedByUserId) === user.id && await WeddingMembership.exists({ weddingId: invite.weddingId, userId: user.id }).session(session)) return { accepted: true };
      if (action === "decline" && invite.status === "DECLINED") return { declined: true };
      if (invite.status !== "PENDING" || invite.expiresAt <= new Date() || !await Wedding.exists({ _id: invite.weddingId, deletedAt: null }).session(session)) throw unavailable();
      if (action === "accept" && await WeddingMembership.exists({ userId: user.id }).session(session)) throw alreadyHasWedding();
      // Updating the invitation in this transaction serializes accept/decline/revoke/resend races.
      invite.status = action === "accept" ? "ACCEPTED" : "DECLINED";
      if (action === "accept") { invite.acceptedByUserId = new mongoose.Types.ObjectId(user.id); invite.acceptedAt = new Date(); }
      await invite.save({ session });
      if (action === "accept") await WeddingMembership.create([{ userId: user.id, weddingId: invite.weddingId, role: "MANAGER" }], { session });
      return action === "accept" ? { accepted: true } : { declined: true };
    });
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) throw alreadyHasWedding();
    throw error;
  }
}
