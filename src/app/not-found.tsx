import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-svh content-center justify-items-start gap-4 p-8">
      <h1 className="my-6 font-serif text-[clamp(2rem,5vw,3rem)] leading-[1.08] font-normal tracking-[-0.04em]">Page not found</h1>
      <p className="my-[1em]">This page is unavailable.</p>
      <Link className="text-accent underline underline-offset-[0.2em]" href="/">Back to home</Link>
    </main>
  );
}
