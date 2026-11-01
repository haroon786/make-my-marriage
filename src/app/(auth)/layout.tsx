import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Icon } from "@/components/home/icon";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-svh lg:grid lg:grid-cols-[0.95fr_1.05fr]">
      <aside className="relative hidden min-h-svh overflow-hidden bg-forest p-12 text-white lg:flex lg:flex-col xl:p-16">
        <Image
          src="/images/home/wedding.jpg"
          alt=""
          fill
          sizes="50vw"
          className="object-cover opacity-30"
          priority
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-forest/70 via-forest/20 to-forest"
        />
        <Link
          href="/"
          className="relative flex w-fit items-center gap-3 font-serif text-xl focus-visible:outline-gold-light"
        >
          <span className="rounded-lg border border-gold/40 p-2">
            <Icon name="heart" className="size-5 text-gold" />
          </span>
          Make My Marriage
        </Link>
        <div className="relative my-auto max-w-md py-20">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-light">
            ONE WEDDING. EVERYONE TOGETHER.
          </p>
          <h2 className="mt-6 font-serif text-5xl leading-tight xl:text-6xl">
            The plans.
            <br />
            The people.
            <br />
            <em className="font-medium text-gold-light">The beginning.</em>
          </h2>
          <p className="mt-7 max-w-sm text-sm leading-8 text-white/80">
            A shared space for the little details and the big moments. Made for
            you and the people who make your day.
          </p>
        </div>
        <p className="relative text-xs text-white/60">
          Plan with love. Celebrate together.
        </p>
      </aside>
      <div className="flex min-h-svh flex-col px-6 py-7 sm:px-12">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="font-serif text-lg font-semibold text-accent lg:hidden"
          >
            Make My Marriage
          </Link>
          <Link
            href="/"
            className="ml-auto text-xs font-semibold text-muted hover:text-accent"
          >
            ← Back to home
          </Link>
        </header>
        <div className="mx-auto my-auto w-full max-w-md py-10 sm:py-14">
          {children}
        </div>
        <p className="text-center text-[11px] leading-6 text-muted">
          For couples and their planning team.
          <br />
          Invited guests don’t need an account.
        </p>
      </div>
    </main>
  );
}
