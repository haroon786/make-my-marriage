export default function HomePage() {
  return (
    <main className="flex min-h-svh flex-col bg-[radial-gradient(ellipse_at_95%_35%,var(--color-blush)_0,transparent_55%)] px-[clamp(1.5rem,7vw,7rem)] py-10">
      <header className="text-[0.8rem] font-bold tracking-[0.16em] text-accent">
        MAKE MY MARRIAGE
        <span className="mt-[0.65rem] block text-xs font-normal tracking-[0.02em] text-muted">
          Made for your together.
        </span>
      </header>
      <section className="my-auto max-w-[55rem] py-20" aria-labelledby="welcome-title">
        <p className="my-[1em] text-[0.72rem] leading-[1.8] tracking-[0.18em] text-accent">
          ONE WEDDING. EVERYONE TOGETHER.
        </p>
        <h1 id="welcome-title" className="my-6 font-serif text-[clamp(2.8rem,6vw,5.5rem)] leading-[1.08] font-normal tracking-[-0.04em]">
          Your celebration.<br /><em className="font-normal text-accent">A shared beginning.</em>
        </h1>
        <p className="my-[1em] max-w-[33rem] text-[1.1rem] leading-[1.8] text-muted">
          A place for you and your family to plan the moments, bring everyone together, and keep the memories.
        </p>
        <p className="mt-8 mb-[1em] max-w-[34rem] border-l-2 border-rose-border pl-4 text-[0.9rem] leading-[1.7] text-muted">
          We’re getting things ready. Wedding planning features are coming soon.
        </p>
      </section>
      <footer className="text-[0.8rem] text-muted">Plan with love. Celebrate together.</footer>
    </main>
  );
}

