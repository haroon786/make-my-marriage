"use client";
import { useState } from "react";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok && response.status !== 401) throw new Error();
      // REST cookie changes do not clear cached RSC payloads. Start a fresh document.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    } catch {
      setError("We couldn’t log you out. Please try again.");
      setPending(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={logout}
        className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-accent disabled:opacity-60"
      >
        {pending ? "Logging out…" : "Log out"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
