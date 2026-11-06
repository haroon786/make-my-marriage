"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { invitationSchema } from "../schemas";

export type MemberRow = { membershipId: string; user: { id: string; name: string; email: string }; role: string; joinedAt: string };
export type InvitationRow = { id: string; email: string; role: string; status: string; expiresAt: string; deliveryStatus: string; retryAfter: string };
const primary = "rounded-lg bg-accent px-5 py-3 font-semibold text-white hover:bg-forest disabled:cursor-wait disabled:opacity-60";
const secondary = "rounded-lg border border-line px-4 py-3 font-semibold text-accent hover:bg-sage disabled:opacity-60";
function Modal({ title, children, pending, close }: { title: string; children: ReactNode; pending: boolean; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = dialog.current!; node.showModal(); return () => node.close(); }, []);
  return <dialog ref={dialog} aria-labelledby="member-dialog-title" onCancel={event => { event.preventDefault(); if (!pending) close(); }} className="m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-line bg-surface p-6 text-ink shadow-xl sm:p-8"><h2 id="member-dialog-title" className="font-serif text-2xl text-accent">{title}</h2>{children}</dialog>;
}
export function MemberManagement({ weddingId, userId, admin, initialMembers, initialInvitations }: { weddingId: string; userId: string; admin: boolean; initialMembers: MemberRow[]; initialInvitations: InvitationRow[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [dialog, setDialog] = useState<"invite" | { type: "remove" | "revoke"; id: string; label: string } | null>(null);
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  async function refresh() {
    const paths = admin ? ["/api/members", "/api/members/invitations"] : ["/api/members"];
    const results = await Promise.all(paths.map(async path => { const response = await fetch(path, { cache: "no-store", signal: AbortSignal.timeout(15000) }); const result = await response.json(); if (!response.ok) throw new Error(result.error?.message || "Could not refresh members."); return result.data; }));
    setMembers(results[0]); if (admin) setInvitations(results[1]);
  }
  async function run(path: string, method: string, body?: unknown) {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(""); setNotice("");
    try {
      const response = await fetch(path, { method, headers: { "Content-Type": "application/json", "X-Wedding-Id": weddingId }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "The action could not be completed.");
      setDialog(null); setEmail("");
      setNotice(result.data.deliveryStatus === "FAILED" ? "Invitation created, but email sending failed. Use Resend after one minute to try again." : result.data.deliveryStatus === "SENT" ? "Invitation email sent. This does not confirm inbox delivery. Only the newest link will work." : "Wedding members updated.");
      await refresh();
    } catch (failure) {
      setError(failure instanceof Error && failure.name !== "TimeoutError" && failure.name !== "TypeError" ? failure.message : "We couldn’t confirm the action completed. Your input is still here. Refresh the list before retrying to avoid duplicate actions.");
    } finally { busy.current = false; setPending(false); }
  }
  function closeDialog() { setDialog(null); setError(""); }
  function openInvite() { setError(""); setDialog("invite"); }
  function invite(event: FormEvent) {
    event.preventDefault();
    const parsed = invitationSchema.safeParse({ email });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    void run("/api/members/invitations", "POST", parsed.data);
  }
  const feedback = error && <p role="alert" className="my-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">{error}</p>;
  return <>
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-line pb-6"><div><p className="text-xs font-semibold tracking-widest text-gold-dark">WEDDING TEAM</p><h1 className="mt-3 font-serif text-4xl text-accent">Wedding members</h1><p className="mt-3 text-muted">Invite the people helping you plan your celebration.</p></div>{admin && <button onClick={openInvite} disabled={pending} className={primary}>+ Invite member</button>}</div>
    {notice && <p role="status" className="mb-5 rounded-lg border border-line bg-sage p-4 text-accent">{notice}</p>}
    {!dialog && feedback}
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-muted">{admin ? "Only the Admin can invite or remove members." : "You have Manager access. Contact your Admin to change the wedding team."}</p><button className={secondary} disabled={pending} onClick={async () => { if (busy.current) return; busy.current = true; setPending(true); try { await refresh(); setError(""); } catch { setError("Could not refresh. Log in again if your session has expired, then retry."); } finally { busy.current = false; setPending(false); } }}>Refresh list</button></div>
    <section className="overflow-hidden rounded-xl border border-line bg-surface"><div className="flex flex-wrap justify-between gap-3 border-b border-line p-6"><h2 className="font-serif text-2xl text-accent">Current wedding members</h2><span className="text-sm text-muted">{members.length} members</span></div><ul className="divide-y divide-line">{members.map(member => <li key={member.membershipId} className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="break-words font-semibold">{member.user.name} <span className="ml-2 rounded bg-sage px-2 py-1 text-xs text-accent">{member.role === "ADMIN" ? "Admin" : "Manager"}</span>{member.user.id === userId && <span className="ml-2 text-xs text-muted">You</span>}</p><p className="mt-2 break-all text-sm text-muted">{member.user.email}</p></div>{member.role === "ADMIN" ? <span className="text-sm text-muted">Wedding Admin · Protected</span> : admin && <button disabled={pending} className="shrink-0 rounded-lg px-3 py-3 text-left text-sm font-semibold text-red-800 hover:bg-red-50" onClick={() => { setError(""); setDialog({ type: "remove", id: member.membershipId, label: member.user.name }); }}>Remove from wedding</button>}</li>)}</ul></section>
    {admin && <section className="mt-8 overflow-hidden rounded-xl border border-line bg-surface"><div className="flex flex-wrap justify-between gap-3 border-b border-line p-6"><div><h2 className="font-serif text-2xl text-accent">Pending invitations</h2><p className="mt-2 text-sm text-muted">Saved invitations appear here even if email sending fails. People become members only after accepting.</p></div><span className="text-sm text-muted">{invitations.length} invitations</span></div>{invitations.length ? <ul className="divide-y divide-line">{invitations.map(invitation => <li key={invitation.id} className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><p className="break-all font-semibold">{invitation.email}</p><p className="mt-2 text-sm text-muted">Manager · {invitation.status === "EXPIRED" ? "Expired — resend to renew" : `Expires ${new Date(invitation.expiresAt).toLocaleDateString("en-GB", { timeZone: "UTC" })}`}</p><p className="mt-1 text-sm text-muted">{invitation.deliveryStatus === "FAILED" ? "Email send failed — retry with Resend" : invitation.deliveryStatus === "SENDING" ? "Email sending — refresh to check" : "Email sent"}</p></div><div className="flex flex-wrap gap-3"><button disabled={pending} className={secondary} onClick={() => void run(`/api/members/invitations/${invitation.id}/resend`, "POST")}>Resend invitation</button><button disabled={pending} className="rounded-lg px-4 py-3 font-semibold text-red-800 hover:bg-red-50" onClick={() => { setError(""); setDialog({ type: "revoke", id: invitation.id, label: invitation.email }); }}>Revoke</button></div></li>)}</ul> : <div className="p-10 text-center"><p className="font-serif text-xl">No pending invitations</p><p className="mt-2 text-sm text-muted">Invite someone you trust to help plan your wedding.</p><button onClick={openInvite} className={`${secondary} mt-5`}>Invite member</button></div>}</section>}
    <p className="mt-6 rounded-lg border border-line bg-blush p-5 text-sm leading-6 text-muted">Managers can help manage wedding planning. The wedding creator remains Admin and controls invitations and membership. Each account can belong to one wedding.</p>
    {dialog && <Modal title={dialog === "invite" ? "Invite wedding member" : dialog.type === "remove" ? "Remove wedding member?" : "Revoke invitation?"} pending={pending} close={closeDialog}>{dialog === "invite" ? <form onSubmit={invite} noValidate aria-busy={pending}><p className="mt-3 text-sm text-muted">Send a personal invitation to your wedding workspace.</p><label htmlFor="invite-email" className="mt-6 block text-sm font-semibold">Email address</label><input id="invite-email" type="email" autoComplete="email" required maxLength={254} value={email} disabled={pending} onChange={event => { setEmail(event.target.value); setError(""); }} className="mt-2 w-full rounded-lg border border-line bg-white p-3" aria-describedby="invite-hint" /><p id="invite-hint" className="mt-2 text-xs text-muted">They must sign in with this email address to accept.</p><div className="mt-5 rounded-lg border border-line bg-sage p-4"><strong>Manager</strong><p className="mt-1 text-sm text-muted">Helps manage wedding planning. Cannot invite or remove members.</p></div>{feedback}<div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" disabled={pending} className={secondary} onClick={closeDialog}>Cancel</button><button disabled={pending} className={primary}>{pending ? "Sending…" : "Send invitation"}</button></div></form> : <><p className="mt-4 break-words text-sm leading-6">{dialog.type === "remove" ? `${dialog.label} will lose access to this wedding immediately. Their account will remain. You can invite them again later.` : `The invitation for ${dialog.label} will stop working. They will not be able to join using that link.`}</p>{feedback}<div className="mt-6 flex flex-wrap justify-end gap-3"><button disabled={pending} className={secondary} onClick={closeDialog}>Keep {dialog.type === "remove" ? "member" : "invitation"}</button><button disabled={pending} className="rounded-lg bg-red-800 px-5 py-3 font-semibold text-white disabled:opacity-60" onClick={() => void run(dialog.type === "remove" ? `/api/members/${dialog.id}` : `/api/members/invitations/${dialog.id}`, "DELETE")}>{pending ? "Updating…" : dialog.type === "remove" ? "Remove member" : "Revoke invitation"}</button></div></>}</Modal>}
  </>;
}
