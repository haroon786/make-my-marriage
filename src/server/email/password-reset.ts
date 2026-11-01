import "server-only";
import { getAppOrigin, getEmailEnvironment } from "@/server/config/env";

export async function sendPasswordReset(email: string, token: string) {
  const { RESEND_API_KEY, EMAIL_FROM } = getEmailEnvironment();
  const link = new URL("/reset-password", getAppOrigin());
  link.searchParams.set("token", token);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [email],
      subject: "Reset your Make My Marriage password",
      text: `Use this link to choose a new password:\n\n${link.toString()}\n\nThis link expires in 30 minutes and can be used once. If you didn’t request this, you can ignore this email.`,
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Reset email delivery failed.");
}
