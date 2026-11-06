import "server-only";
import { getAppOrigin, getEmailEnvironment } from "@/server/config/env";
export async function sendMemberInvitation(email: string, token: string, weddingNames: string, attemptKey: string) {
  const { RESEND_API_KEY, EMAIL_FROM } = getEmailEnvironment();
  const url = new URL(`/member-invitations/${token}`, getAppOrigin());
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": attemptKey },
    body: JSON.stringify({ from: EMAIL_FROM, to: [email], subject: "You're invited to help plan a wedding", text: `You have been invited to help plan ${weddingNames} on Make My Marriage as a Manager.\n\nOpen this link to accept or decline:\n${url}\n\nSign in or create an account with this email address. This link expires in 7 days. If a new invitation is sent, use the newest link. You can ignore this message if you were not expecting it.` }),
    signal: AbortSignal.timeout(10000), cache: "no-store",
  });
  if (!response.ok) throw new Error("Invitation email send failed");
}
