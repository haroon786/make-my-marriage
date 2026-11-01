import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthContext } from "@/server/auth/session";
import { LogoutButton } from "@/modules/auth/components/logout-button";
export const metadata = {
  title: "Your wedding workspace",
  robots: { index: false, follow: false },
};
export default async function DashboardPage() {
  const { user, wedding, membership } = await requireAuthContext();
  if (!wedding || !membership) redirect("/onboarding");
  return (
    <main className="mx-auto min-h-svh max-w-5xl px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="font-serif text-xl text-accent">
          Make My Marriage
        </Link>
        <LogoutButton />
      </header>
      <section className="mt-16 rounded-2xl border border-line bg-surface p-8">
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
      </section>
    </main>
  );
}
