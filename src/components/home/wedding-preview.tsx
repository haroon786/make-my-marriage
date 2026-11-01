"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { Icon } from "./icon";
import { ceremonies } from "./preview-data";
import { primaryButton, secondaryButton } from "./styles";

export function WeddingPreview() {
  const [view, setView] = useState<"events" | "photos">("events");
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_15px_50px_-30px_#604b3340]">
      <div className="relative overflow-hidden bg-blush/50 px-6 py-12 text-center sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 -left-12 size-60 rounded-full border border-gold/15 p-5"
        >
          <div className="size-full rounded-full border border-gold/20 p-5">
            <div className="size-full rounded-full border border-gold/20" />
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -bottom-12 size-60 rounded-full border border-gold/15 p-5"
        >
          <div className="size-full rounded-full border border-gold/20 p-5">
            <div className="size-full rounded-full border border-gold/20" />
          </div>
        </div>
        <Icon name="flower" className="mx-auto mb-5 size-8 text-gold" />
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold-dark">
          Together with our families
        </p>
        <h3 className="mt-4 font-serif text-5xl font-medium text-accent sm:text-6xl">
          Ashu <span className="font-normal italic text-gold-dark">&</span>{" "}
          Priya
        </h3>
        <p className="mt-4 font-serif text-lg italic text-muted">
          Two families. One beautiful beginning.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted">
          <span className="flex items-center gap-2">
            <Icon name="calendar" className="size-3.5" />
            15–17 December 2027
          </span>
          <span className="flex items-center gap-2">
            <Icon name="pin" className="size-3.5" />
            Ayodhya, Uttar Pradesh
          </span>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            className={primaryButton}
            onClick={() => dialog.current?.showModal()}
          >
            <Icon name="mail" className="size-4" />
            Preview invitation
          </button>
          <a className={secondaryButton} href="#sample-celebrations">
            View celebrations <Icon name="arrow" className="size-4" />
          </a>
        </div>
        <p className="mt-5 text-[10px] text-muted">
          A fictional wedding, made to inspire yours.
        </p>
      </div>
      <div id="sample-celebrations" className="p-5 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h4 className="font-serif text-2xl text-accent">
            {view === "events" ? "Our celebrations" : "Moments to keep forever"}
          </h4>
          <div
            className="flex rounded-lg bg-blush p-1"
            aria-label="Wedding preview content"
          >
            {(["events", "photos"] as const).map((item) => (
              <button
                type="button"
                key={item}
                aria-pressed={view === item}
                onClick={() => setView(item)}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${view === item ? "bg-white text-accent shadow-sm" : "text-muted hover:text-accent"}`}
              >
                <Icon
                  name={item === "events" ? "calendar" : "image"}
                  className="size-3.5"
                />
                {item === "events" ? "Events" : "Photos"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ceremonies.map((event) => (
            <article
              key={event.name}
              className="group overflow-hidden rounded-xl border border-line bg-surface"
            >
              <div
                className={`relative overflow-hidden ${view === "photos" ? "aspect-[4/5]" : "aspect-[4/3]"}`}
              >
                <Image
                  src={event.image}
                  alt={event.alt}
                  fill
                  sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 260px"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                {view === "events" && (
                  <span className="absolute top-3 left-3 rounded bg-surface/95 px-2 py-1 text-[9px] font-bold tracking-wider text-accent">
                    {event.date}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h5 className="font-serif text-lg text-accent">{event.name}</h5>
                {view === "events" ? (
                  <>
                    <p className="mt-2 text-xs font-semibold text-gold-dark">
                      {event.time}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                      <Icon name="pin" className="size-3" />
                      {event.venue}
                    </p>
                    <p className="mt-3 border-t border-line pt-3 text-[10px] text-muted">
                      Dress code: {event.dress}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-muted">{event.subtitle}</p>
                )}
              </div>
            </article>
          ))}
        </div>
        {view === "photos" && (
          <p className="mt-4 text-xs leading-6 text-muted">
            Illustrative photos for this demo. Your wedding’s private gallery
            will use a separate sharing link.
          </p>
        )}
      </div>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-md overflow-auto rounded-2xl border border-line bg-paper p-7 text-ink shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gold-dark">
            Sample invitation
          </span>
          <button
            type="button"
            aria-label="Close invitation"
            className="rounded-lg p-2 hover:bg-blush"
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <Icon name="flower" className="mx-auto mt-4 size-8 text-gold" />
        <h2
          id={titleId}
          className="mt-5 text-center font-serif text-3xl text-accent"
        >
          Dear Rajesh & family,
        </h2>
        <p className="mt-4 text-center text-sm leading-7 text-muted">
          Join Ashu & Priya as they begin their next chapter. We’ve saved a
          place for you.
        </p>
        <div className="my-6 rounded-xl border border-line bg-white p-4 text-sm">
          <p className="font-semibold text-accent">Wedding ceremony</p>
          <p className="mt-2 text-muted">17 December 2027 · 11:00 AM</p>
          <p className="mt-2 text-muted">Riverside Mandap, Ayodhya</p>
          <p className="mt-3 border-t border-line pt-3 text-xs">
            Invitation for up to 4 guests.
          </p>
        </div>
        <p className="text-xs leading-6 text-muted">
          This preview doesn’t collect an RSVP. In the finished app, each guest
          group will receive its own private link to confirm attendance.
        </p>
        <button
          type="button"
          className={`${primaryButton} mt-5 w-full`}
          onClick={() => dialog.current?.close()}
        >
          Back to the wedding
        </button>
      </dialog>
    </div>
  );
}
