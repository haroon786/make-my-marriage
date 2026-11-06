import { redirect } from "next/navigation";
import { requireAuthContext } from "@/server/auth/session";
import { OnboardingForm } from "@/modules/wedding/components/onboarding-form";
import { WorkspaceHeader } from "@/modules/wedding/components/workspace-header";
export const metadata = { title: "Edit wedding details", robots: { index: false, follow: false } };
export default async function EditWeddingPage() {
  const { wedding, membership } = await requireAuthContext();
  if (!wedding || !membership) redirect("/onboarding");
  const { brideName, groomName, weddingDate, timeZone, location, title, description } = wedding;
  return <><WorkspaceHeader dashboard /><main className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><OnboardingForm mode="edit" weddingId={wedding.id} initialValues={{ brideName, groomName, weddingDate, timeZone, location, title, description }} /></main></>;
}
