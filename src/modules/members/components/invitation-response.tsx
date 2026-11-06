"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatWeddingDate } from "@/modules/wedding/schemas";

type Invite = { email: string; role: string; wedding: { brideName: string; groomName: string; weddingDate: string }; expiresAt: string };
type Context = { user: { email: string }; wedding: unknown } | null;
export function InvitationResponse({ token }: { token: string }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [context, setContext] = useState<Context>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [completed, setCompleted] = useState<"accept" | "decline" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(false);
  const returnPath = `/member-invitations/${token}`;
  const next = `?next=${encodeURIComponent(returnPath)}`;
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;
    async function load() {
      try {
        const [response, auth] = await Promise.all([fetch(`/api/public/member-invitations/${token}`, { cache: "no-store", signal: controller.signal }), fetch("/api/auth/me", { cache: "no-store", signal: controller.signal })]);
        const data = await response.json();
        if (!active) return;
        if (!response.ok) { setInvalid(response.status === 410 || response.status === 400); throw new Error(data.error?.message || "Could not load this invitation."); }
        if (!auth.ok && auth.status !== 401) throw new Error("Could not check your account. Please try again.");
        const account = auth.ok ? (await auth.json()).data : null;
        if (active) { setInvite(data.data); setContext(account); }
      } catch (failure) { if (active) setError(failure instanceof Error && failure.name !== "AbortError" ? failure.message : "Could not load the invitation. Please try again."); }
      finally { clearTimeout(timeout); if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [token, attempt]);
  async function respond(action: "accept" | "decline") {
    if (busy.current) return;
    busy.current = true; setPending(true); setError("");
    try {
      const response = await fetch(`/api/member-invitations/${token}/${action}`, { method: "POST", signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok) { if (response.status === 401) setContext(null); throw new Error(result.error?.message || "Could not complete the request."); }
      setCompleted(action);
    } catch (failure) { setError(failure instanceof Error && failure.name !== "TypeError" && failure.name !== "TimeoutError" ? failure.message : "We couldn’t confirm the result. Please try again; accepting twice won’t create duplicate membership."); }
    finally { busy.current = false; setPending(false); }
  }
  async function switchAccount() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError("");
    try { const response = await fetch("/api/auth/logout", { method: "POST", signal: AbortSignal.timeout(15000) }); if (!response.ok && response.status !== 401) throw new Error(); setContext(null); }
    catch { setError("Could not log out. Please try again."); }
    finally { busy.current = false; setPending(false); }
  }
  const mismatch = context && invite && context.user.email.trim().toLowerCase() !== invite.email.trim().toLowerCase();
  const button = "rounded-lg bg-accent px-5 py-3 text-center font-semibold text-white disabled:cursor-wait disabled:opacity-60";
  return <main className="mx-auto max-w-2xl px-5 py-12 sm:py-20"><Link href="/" className="font-serif text-xl text-accent">Make My Marriage</Link><section className="mt-8 rounded-2xl border border-line bg-surface p-6 sm:p-10"><p className="text-xs font-semibold tracking-widest text-gold-dark">PLAN SOMETHING BEAUTIFUL TOGETHER</p><h1 className="mt-4 font-serif text-3xl text-accent">{completed === "accept" ? "You’re part of the wedding team" : completed === "decline" ? "Invitation declined" : "You’re invited to help plan"}</h1>
    {loading ? <p role="status" className="mt-6">Loading your invitation…</p> : <>
      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-900">{error}</p>}
      {completed ? <div className="mt-6" role="status"><p className="mb-6 text-muted">{completed === "accept" ? "You joined as a Manager. You can now help manage the wedding." : "You have not joined this wedding. Your account is unchanged."}</p><Link href={completed === "accept" ? "/app" : "/"} className={button}>{completed === "accept" ? "Go to dashboard" : "Back to home"}</Link></div> : invalid ? <p className="mt-5 text-muted">Ask the wedding Admin to send a new invitation, then use the newest email link.</p> : !invite ? <button className={`${button} mt-6`} onClick={() => { setLoading(true); setError(""); setAttempt(value => value + 1); }}>Try again</button> : <>
        <div className="my-6 rounded-xl border border-line bg-blush p-5"><h2 className="break-words font-serif text-2xl text-accent">{invite.wedding.brideName} &amp; {invite.wedding.groomName}</h2><p className="mt-2 text-sm text-muted">{formatWeddingDate(invite.wedding.weddingDate)}</p><p className="mt-4 break-all text-sm">Invited email: <strong>{invite.email}</strong></p><p className="mt-2 text-sm">Role: <strong>Manager</strong> — help manage wedding planning.</p></div>
        {!context ? <><p className="mb-5 text-sm text-muted">Log in or create an account using the invited email address. You’ll return here to accept or decline.</p><div className="flex flex-wrap gap-3"><Link href={`/login${next}`} className={button}>Log in to respond</Link><Link href={`/signup${next}`} className="rounded-lg border border-line px-5 py-3 font-semibold text-accent">Create an account</Link></div></> : mismatch ? <><p role="alert" className="mb-5 text-sm text-red-900">You’re signed in with a different email. Switch to the invited account to respond.</p><button disabled={pending} onClick={switchAccount} className={button}>Log out to switch account</button></> : <>
          {Boolean(context.wedding) && <p className="mb-5 text-sm text-muted">You already belong to a wedding. Each account can belong to only one wedding, so you cannot accept this invitation.</p>}
          <div className="flex flex-wrap gap-3"><button disabled={pending || Boolean(context.wedding)} onClick={() => void respond("accept")} className={button}>{pending ? "Updating…" : "Accept invitation"}</button><button disabled={pending} onClick={() => void respond("decline")} className="rounded-lg border border-line px-5 py-3 font-semibold text-accent disabled:opacity-60">Decline invitation</button></div>
        </>}
      </>}
    </>}
  </section></main>;
}
