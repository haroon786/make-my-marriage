"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-svh content-center justify-items-start gap-4 p-8">
      <h1 className="my-6 font-serif text-[clamp(2rem,5vw,3rem)] leading-[1.08] font-normal tracking-[-0.04em]">Something went wrong</h1>
      <p className="my-[1em]">Please try again.</p>
      <button className="cursor-pointer rounded-[0.4rem] bg-accent px-[1.2rem] py-[0.8rem] text-white" onClick={reset}>Try again</button>
    </main>
  );
}
