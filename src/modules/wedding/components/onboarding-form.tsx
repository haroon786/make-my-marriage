"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { createWeddingSchema, type CreateWeddingInput } from "../schemas";
import { WeddingCard } from "./wedding-card";

const initial: CreateWeddingInput = { brideName: "", groomName: "", weddingDate: "", timeZone: "Asia/Kolkata", location: { formattedAddress: "" }, title: "", description: "" };
const fields = [
  { name: "brideName", label: "Bride’s name", max: 100, placeholder: "e.g., Priya Sharma" },
  { name: "groomName", label: "Groom’s name", max: 100, placeholder: "e.g., Arjun Kulkarni" },
  { name: "weddingDate", label: "Wedding date", type: "date" },
  { name: "timeZone", label: "Time zone", placeholder: "Asia/Kolkata", max: 100 },
  { name: "location.formattedAddress", label: "Wedding location", placeholder: "City or venue address", max: 300, wide: true },
  { name: "title", label: "Wedding title (optional)", placeholder: "A title for your celebration", max: 150, optional: true, wide: true },
  { name: "description", label: "Description (optional)", placeholder: "A few words about your celebration", max: 1000, optional: true, wide: true },
] as const;
export function OnboardingForm({ mode = "create", initialValues = initial, weddingId }: { mode?: "create" | "edit"; initialValues?: CreateWeddingInput; weddingId?: string }) {
  const editing = mode === "edit";
  const router = useRouter();
  function openDashboard() { router.push("/app"); router.refresh(); }
  const [values, setValues] = useState(initialValues);
  const [saved, setSaved] = useState(initialValues);
  const [success, setSuccess] = useState(false);
  const leaving = useRef(false);
  const dirty = editing && JSON.stringify(values) !== JSON.stringify(saved);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { if (!leaving.current) { event.preventDefault(); event.returnValue = ""; } };
    const leave = (event: MouseEvent) => {
      const link = (event.target as Element).closest("a");
      const logout = (event.target as Element).closest("button")?.textContent === "Log out";
      if ((link && link.target !== "_blank") || logout) {
        if (!window.confirm("Discard unsaved changes?")) { event.preventDefault(); event.stopPropagation(); }
        else { leaving.current = true; setTimeout(() => { leaving.current = false; }, 1000); }
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", leave, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", leave, true); };
  }, [dirty]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const busy = useRef(false);
  const alert = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  function showErrors(details: Record<string, string>, text: string) {
    setErrors(details); setMessage(text);
    requestAnimationFrame(() => {
      const first = form.current?.elements.namedItem(Object.keys(details)[0]);
      if (first instanceof HTMLElement) first.focus(); else alert.current?.focus();
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const parsed = createWeddingSchema.safeParse(values);
    setSignedOut(false); setSuccess(false);
    if (!parsed.success) {
      showErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join("."), issue.message])), "Please check the highlighted fields."); return;
    }
    busy.current = true; setPending(true); setMessage(""); setErrors({});
    try {
      const payload = editing ? Object.fromEntries(Object.entries(parsed.data).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(saved[key as keyof CreateWeddingInput]))) : parsed.data;
      // Trimming may turn a whitespace-only edit into no change. Do not send an
      // empty PATCH (which the API correctly rejects).
      if (editing && Object.keys(payload).length === 0) {
        setValues(parsed.data); setRetry(false); return;
      }
      const response = await fetch(editing ? "/api/wedding" : "/api/weddings", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json", ...(editing && weddingId ? { "X-Wedding-Id": weddingId } : {}) }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (response.ok) {
        if (editing) { setValues(parsed.data); setSaved(parsed.data); setSuccess(true); setRetry(false); return; }
        window.location.replace("/onboarding/ready"); return;
      }
      if (result.error?.code === "ALREADY_HAS_WEDDING") {
        // A previous request may have committed even if its response was lost.
        const existing = await fetch("/api/wedding", { cache: "no-store", signal: AbortSignal.timeout(10000) });
        if (existing.ok) { window.location.replace("/onboarding/ready"); return; }
        if (existing.status === 404) {
          setRetry(false);
          showErrors({}, "Your account already has a wedding membership, but that workspace is unavailable. Creating another wedding cannot resolve this. Please contact your wedding Admin.");
          return;
        }
        if (existing.status === 401) {
          setSignedOut(true);
          showErrors({}, "Your session has expired. Log in again, then retry to open your saved wedding.");
          return;
        }
        throw new Error("Recovery unavailable");
      }
      setSignedOut(response.status === 401); setRetry(response.status !== 400);
      showErrors(result.error?.details || {}, result.error?.message || "We couldn’t save your wedding. Your details are still here. Please try again.");
    } catch {
      setRetry(true);
      showErrors({}, editing ? "We couldn’t confirm your changes were saved. Your edits are still here. Please try again." : "We couldn’t confirm your wedding was saved. Your details are still here. Try again; we’ll check for an existing workspace.");
    } finally { busy.current = false; setPending(false); }
  }
  return <div className="grid items-start gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
    <section className="min-w-0 rounded-xl border border-line border-t-gold bg-surface p-6 shadow-sm sm:p-9">
      <p className="text-xs font-bold tracking-widest text-gold-dark">{editing ? "WEDDING DETAILS" : "WEDDING SETUP"}</p>
      <h1 className="mt-3 font-serif text-3xl leading-tight text-accent sm:text-4xl">{editing ? "Edit wedding details" : "Your wedding starts here"}</h1>
      <p className="mt-4 text-sm leading-7 text-muted">{editing ? "Update the details of your celebration. Changes appear after you save." : "Bring your celebration together. Start with the details that make it yours."}</p>
      <p className="mt-3 text-xs text-muted">Fields marked * are required.</p>
      <form ref={form} onSubmit={submit} noValidate aria-busy={pending} className="mt-7">
        {message && <div ref={alert} tabIndex={-1} role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm leading-6 text-red-900">{message}{signedOut && <Link href="/login" target="_blank" rel="noopener noreferrer" className="mt-2 block font-semibold underline">Log in in a new tab, then return and try again</Link>}</div>}
        <fieldset disabled={pending} className="grid min-w-0 gap-5 sm:grid-cols-2">
          <legend className="sr-only">Wedding details</legend>
          {fields.map(field => {
            const value = field.name === "location.formattedAddress" ? values.location.formattedAddress : values[field.name];
            const shared = {
              id: field.name, name: field.name, value, required: !("optional" in field),
              maxLength: "max" in field ? field.max : undefined,
              placeholder: "placeholder" in field ? field.placeholder : undefined,
              "aria-invalid": Boolean(errors[field.name]),
              "aria-describedby": errors[field.name] ? `${field.name}-error` : field.name === "timeZone" ? "timezone-hint" : undefined,
              onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                const next = event.target.value;
                setSuccess(false);
                setValues(previous => field.name === "location.formattedAddress" ? { ...previous, location: { formattedAddress: next } } : { ...previous, [field.name]: next });
                setErrors(previous => { const updated = { ...previous }; delete updated[field.name]; return updated; });
              },
              className: `mt-2 w-full min-w-0 rounded-lg border bg-white px-3 py-3 text-base text-ink outline-offset-2 disabled:opacity-60 ${errors[field.name] ? "border-red-500" : "border-line focus:border-accent"}`,
            };
            return <div key={field.name} className={"wide" in field ? "sm:col-span-2" : "min-w-0"}>
              <label htmlFor={field.name} className="text-sm font-semibold text-ink">{field.label}{!("optional" in field) && <span className="text-gold-dark"> *</span>}</label>
              {field.name === "description" ? <textarea {...shared} rows={3} /> : <input {...shared} type={"type" in field ? field.type : "text"} list={field.name === "timeZone" ? "time-zones" : undefined} />}
              {field.name === "timeZone" && <><datalist id="time-zones">{["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "UTC"].map(zone => <option key={zone} value={zone} />)}</datalist><p id="timezone-hint" className="mt-2 text-xs leading-5 text-muted">India: Asia/Kolkata (UTC+05:30). You can enter another IANA time zone.</p></>}
              {errors[field.name] && <p id={`${field.name}-error`} className="mt-2 text-sm text-red-800">{errors[field.name]}</p>}
            </div>;
          })}
          <div role={editing ? "status" : undefined} aria-atomic={editing ? true : undefined} className={`rounded-lg p-4 text-sm leading-6 sm:col-span-2 ${success ? "border border-accent bg-sage font-semibold text-accent" : "bg-blush text-muted"}`}>{editing ? (pending ? "Saving your changes…" : success ? "Wedding details saved successfully." : dirty ? "Unsaved changes" : "No unsaved changes") : <>You’ll become the <strong className="text-accent">Admin</strong> of this wedding. A cover photo and family invitations come later.</>}</div>
          <button type="submit" disabled={pending || (editing && !dirty)} className={`min-h-12 rounded-lg bg-accent px-5 py-3 font-semibold text-white transition hover:bg-forest disabled:opacity-70 sm:col-span-2 ${pending ? "cursor-wait" : "disabled:cursor-default"}`}>{editing ? (pending ? "Saving…" : success ? "Saved" : retry ? "Try again — Save changes" : "Save changes") : (pending ? "Creating wedding…" : retry ? "Try again — Create wedding" : "Create wedding")}</button>
          {editing && <button type="button" onClick={() => { if (!dirty || window.confirm("Discard unsaved changes?")) { leaving.current = true; openDashboard(); } }} className="rounded-lg border border-line px-5 py-3 text-center font-semibold text-accent sm:col-span-2">{dirty ? "Cancel / Back to dashboard" : "Back to dashboard"}</button>}
        </fieldset>
        {!editing && <p className="mt-5 text-center text-xs leading-6 text-muted">Invited to a wedding? Open the invitation link shared by your family.</p>}
      </form>
    </section>
    <aside className="min-w-0 lg:sticky lg:top-8"><p className="mb-4 text-xs font-semibold tracking-widest text-gold-dark">WEDDING DETAILS PREVIEW</p><WeddingCard {...values} /><p className="mt-5 rounded-lg border border-line p-4 text-sm leading-6 text-muted">{editing ? "Your website address and gallery sharing link stay the same when you edit these details." : "Your private beginning. Creating your workspace does not publish a website or send invitations."}</p></aside>
  </div>;
}
