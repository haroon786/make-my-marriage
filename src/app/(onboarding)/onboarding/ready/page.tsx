import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthContext } from "@/server/auth/session";
import { WeddingCard } from "@/modules/wedding/components/wedding-card";
import { WorkspaceHeader } from "@/modules/wedding/components/workspace-header";
export const metadata = { title: "Your wedding is ready", robots: { index: false, follow: false } };
export default async function WeddingReadyPage() {
  const { wedding, membership } = await requireAuthContext();
  if (!wedding || !membership) redirect("/onboarding");
  return <><WorkspaceHeader /><main className="mx-auto min-h-svh max-w-2xl px-5 py-12 text-center sm:px-8">
    <p className="text-xs font-bold tracking-widest text-gold-dark">A BEAUTIFUL BEGINNING</p>
    <h1 className="mt-4 font-serif text-4xl leading-tight text-accent sm:text-5xl">Your wedding workspace is ready</h1>
    <p className="mt-5 text-sm leading-7 text-muted">Your details are saved. This is where your celebration comes together.</p>
    <span className="my-6 inline-block rounded-full bg-accent px-4 py-2 text-xs font-bold text-white">{membership.role === "ADMIN" ? "Admin" : "Manager"}</span>
    <WeddingCard {...wedding} />
    <p className="my-6 text-sm leading-7 text-muted">{wedding.website.isPublished ? "Your wedding workspace is ready to open." : "Your wedding website is not published yet."} No invitations are sent during setup.</p>
    <Link href="/app" className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-accent px-6 py-4 font-semibold text-white hover:bg-forest">Go to dashboard →</Link>
  </main></>;
}
