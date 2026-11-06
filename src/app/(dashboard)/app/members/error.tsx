"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="mx-auto max-w-xl p-8"><h1 className="font-serif text-3xl text-accent">Couldn’t load wedding members</h1><p className="my-4">Your wedding details are safe. Please try again.</p><button onClick={reset} className="rounded-lg bg-accent px-5 py-3 text-white">Try again</button></div>; }
