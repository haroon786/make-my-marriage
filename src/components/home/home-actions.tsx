"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "./icon";
import { primaryButton } from "./styles";

export function StartPlanningButton({
  className = primaryButton,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link href="/signup" className={className} onClick={onNavigate}>
      Start planning <Icon name="arrow" className="size-4" />
    </Link>
  );
}

const navigation = [
  ["Features", "#features"],
  ["How it works", "#how-it-works"],
  ["Family & guests", "#dual-experience"],
  ["Wedding demo", "#showcase"],
] as const;
export function HomeNavigation() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <nav
        aria-label="Main navigation"
        className="hidden items-center gap-6 text-[13px] font-medium text-muted lg:flex"
      >
        {navigation.map(([label, href]) => (
          <a key={href} href={href} className="transition hover:text-accent">
            {label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="hidden px-3 py-2 text-sm font-semibold text-accent sm:block"
        >
          Log in
        </Link>
        <span className="hidden sm:block">
          <StartPlanningButton className={`${primaryButton} px-4 py-2.5`} />
        </span>
        <button
          type="button"
          className="rounded-lg border border-line p-2.5 text-accent lg:hidden"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen(!open)}
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="absolute top-full right-0 left-0 border-b border-line bg-surface p-5 shadow-lg lg:hidden"
        >
          {navigation.map(([label, href]) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm hover:bg-blush"
            >
              {label}
            </a>
          ))}
          <div className="mt-3">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mb-3 block rounded-lg px-4 py-3 text-sm font-semibold text-accent"
            >
              Log in
            </Link>
            <StartPlanningButton
              className={`${primaryButton} w-full`}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </nav>
      )}
    </>
  );
}
