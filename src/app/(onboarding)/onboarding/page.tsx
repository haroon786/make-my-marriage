import { redirect } from "next/navigation";
import { requireAuthContext } from "@/server/auth/session";
import { OnboardingForm } from "@/modules/wedding/components/onboarding-form";
import { WorkspaceHeader } from "@/modules/wedding/components/workspace-header";
export const metadata = { title: "Your wedding starts here", robots: { index: false, follow: false } };
export default async function OnboardingPage() {
  const { wedding } = await requireAuthContext();
  if (wedding) redirect("/app");
  return <><WorkspaceHeader /><main className="mx-auto min-h-svh max-w-6xl px-5 py-8 sm:px-8 sm:py-12"><OnboardingForm /></main></>;
}
