import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuthContext } from "@/server/auth/session";
import { WorkspaceHeader } from "@/modules/wedding/components/workspace-header";
import { WeddingCard } from "@/modules/wedding/components/wedding-card";
export const metadata = {
  title: "Your wedding workspace",
  robots: { index: false, follow: false },
};
export default async function DashboardPage() {
  const { user, wedding, membership } = await requireAuthContext();
  if (!wedding || !membership) redirect("/onboarding");
  return (
    <>
    <WorkspaceHeader />
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <p className="text-xs font-bold tracking-widest text-gold-dark">
          YOUR PRIVATE WORKSPACE
        </p>
        <h1 className="mt-4 font-serif text-4xl text-accent">
          {wedding.brideName} & {wedding.groomName}
        </h1>
        <p className="mt-5 text-sm leading-7 text-muted">
          Welcome back, {user.name}. Your role is{" "}
          {membership.role === "ADMIN" ? "Admin" : "Manager"}.
        </p>
        <p className="mt-4 text-sm text-muted">
          Your planning features will appear here as we build them.
        </p>
        <div className="mt-8 max-w-lg"><WeddingCard {...wedding} /></div>
        {/* Start a document navigation so browser Back runs the edit form's
            native beforeunload guard, including browsers without Navigation API. */}
        <a href="/app/wedding/edit" className="mt-6 inline-flex rounded-lg bg-accent px-5 py-3 font-semibold text-white hover:bg-forest">Edit wedding</a>
        <Link href="/app/members" className="mt-4 inline-flex rounded-lg border border-line px-5 py-3 font-semibold text-accent hover:bg-sage sm:ml-4">Wedding members</Link>
        <p className="mt-6 text-sm text-muted">{wedding.website.isPublished ? "Your wedding website is published." : "Your wedding website is not published yet."}</p>
      </section>
    </main>
    </>
  );
}
