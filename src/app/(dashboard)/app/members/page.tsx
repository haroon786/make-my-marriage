import { redirect } from "next/navigation";
import { requireAuthContext } from "@/server/auth/session";
import { listInvitations, listMembers } from "@/modules/members/invitations";
import { MemberManagement } from "@/modules/members/components/member-management";
import { WorkspaceHeader } from "@/modules/wedding/components/workspace-header";
export const metadata = { title: "Wedding members", robots: { index: false, follow: false } };
export default async function MembersPage() {
  const context = await requireAuthContext();
  if (!context.wedding || !context.membership) redirect("/onboarding");
  const admin = context.membership.role === "ADMIN";
  const [members, invitations] = await Promise.all([listMembers(context.wedding.id), admin ? listInvitations(context.wedding.id) : Promise.resolve([])]);
  return <><WorkspaceHeader dashboard /><main className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><MemberManagement weddingId={context.wedding.id} userId={context.user.id} admin={admin} initialMembers={members} initialInvitations={invitations} /></main></>;
}
