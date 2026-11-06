import { InvitationResponse } from "@/modules/members/components/invitation-response";
import { invitationTokenSchema } from "@/modules/members/schemas";
export const metadata = { title: "Wedding invitation", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!invitationTokenSchema.safeParse(token).success) return <main className="mx-auto max-w-xl p-8"><h1 className="font-serif text-3xl text-accent">Invalid invitation link</h1><p className="mt-4">Ask the wedding Admin for a new invitation.</p></main>;
  return <InvitationResponse token={token} />;
}
