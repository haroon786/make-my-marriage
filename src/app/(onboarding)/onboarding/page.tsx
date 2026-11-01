import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthContext } from "@/server/auth/session";
import { LogoutButton } from "@/modules/auth/components/logout-button";
import { Icon } from "@/components/home/icon";
export const metadata = {
  title: "Your wedding starts here",
  robots: { index: false, follow: false },
};
export default async function OnboardingPage() {
  const { user, wedding } = await requireAuthContext();
  if (wedding) redirect("/app");
  return (
    <main className="min-h-svh px-6 py-8">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link href="/" className="font-serif text-xl font-semibold text-accent">
          Make My Marriage
        </Link>
        <LogoutButton />
      </header>
      <section className="mx-auto mt-16 max-w-xl rounded-2xl border border-line bg-surface p-7 text-center shadow-sm sm:mt-24 sm:p-12">
        <Icon name="flower" className="mx-auto size-10 text-gold" />
        <p className="mt-6 text-xs font-bold tracking-widest text-gold-dark">
          YOUR ACCOUNT IS READY
        </p>
        <h1 className="mt-4 font-serif text-4xl text-accent">
          Welcome, {user.name}.
        </h1>
        <p className="mt-5 text-sm leading-7 text-muted">
          You’re signed in as {user.email}. Your next step will be creating your
          wedding or joining your family’s workspace.
        </p>
        <div className="mt-7 rounded-xl bg-blush p-5 text-sm leading-7 text-muted">
          Wedding setup is coming in the next feature. Your account is saved and
          ready for it.
        </div>
        <Link
          href="/"
          className="mt-7 inline-block text-sm font-semibold text-accent underline underline-offset-4"
        >
          Explore the homepage
        </Link>
      </section>
    </main>
  );
}
