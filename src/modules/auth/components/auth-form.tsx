"use client";

import Link from "next/link";
import { invitationReturnPath } from "@/modules/members/schemas";
import { useRef, useState, type FormEvent } from "react";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  tokenSchema,
  type AuthMode,
} from "../schemas";

const copy = {
  signup: {
    eyebrow: "YOUR NEXT CHAPTER",
    title: "A beautiful beginning.",
    text: "Create your account and bring your wedding plans together.",
    submit: "Create account",
    pending: "Creating your account…",
  },
  login: {
    eyebrow: "WELCOME BACK",
    title: "Back to your together.",
    text: "Log in to pick up where you and your family left off.",
    submit: "Log in",
    pending: "Logging you in…",
  },
  "forgot-password": {
    eyebrow: "A LITTLE HELP",
    title: "Forgot your password?",
    text: "Enter your account email and we’ll send you a link to choose a new password.",
    submit: "Send reset link",
    pending: "Requesting your link…",
  },
  "reset-password": {
    eyebrow: "A FRESH START",
    title: "Choose a new password.",
    text: "Make it memorable for you and difficult for anyone else to guess.",
    submit: "Save new password",
    pending: "Saving your password…",
  },
};
const inputClass =
  "mt-2 w-full rounded-lg border border-line bg-white px-4 py-3 text-sm text-ink shadow-sm outline-offset-2 placeholder:text-muted/65 focus:border-accent disabled:opacity-60";

export function AuthForm({
  mode,
  token = "",
  next,
}: {
  mode: AuthMode;
  token?: string;
  next?: string;
}) {
  const returnPath = invitationReturnPath(next);
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const busy = useRef(false);
  const labels = copy[mode];
  const needsPassword = mode !== "forgot-password";
  const confirmation = mode === "signup" || mode === "reset-password";
  const invalidToken =
    mode === "reset-password" && !tokenSchema.safeParse(token).success;

  function showErrors(details: Record<string, string>) {
    setErrors(details);
    const first = Object.keys(details)[0];
    const input = form.current?.elements.namedItem(first);
    if (input instanceof HTMLInputElement) input.focus();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    setMessage("");
    setErrors({});
    const fields = new FormData(event.currentTarget);
    const input =
      mode === "signup"
        ? {
            name: fields.get("name"),
            email: fields.get("email"),
            password: fields.get("password"),
          }
        : mode === "login"
          ? { email: fields.get("email"), password: fields.get("password") }
          : mode === "forgot-password"
            ? { email: fields.get("email") }
            : { token, password: fields.get("password") };
    const schema =
      mode === "signup"
        ? signupSchema
        : mode === "login"
          ? loginSchema
          : mode === "forgot-password"
            ? forgotPasswordSchema
            : resetPasswordSchema;
    const result = schema.safeParse(input);
    if (!result.success) {
      showErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      return;
    }
    if (
      confirmation &&
      fields.get("password") !== fields.get("confirmPassword")
    ) {
      showErrors({ confirmPassword: "The passwords don’t match." });
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
        credentials: "same-origin",
        signal: AbortSignal.timeout(20_000),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(
          payload.error?.message ||
            "We couldn’t complete that request. Please try again.",
        );
        if (payload.error?.details) showErrors(payload.error.details);
        return;
      }
      if (mode === "signup" || mode === "login") {
        // Full navigation clears old client route state across account changes.
        window.location.assign(
          returnPath || (payload.data.hasWedding ? "/app" : "/onboarding"),
        );
        return;
      }
      form.current?.reset();
      setComplete(true);
    } catch {
      setMessage(
        "We couldn’t reach the server. Check your connection and try again. If you were creating an account, you can also try logging in.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  if (complete)
    return (
      <div role="status" className="py-6">
        <span className="mb-6 inline-flex rounded-full bg-sage px-4 py-2 text-sm font-semibold text-accent">
          {mode === "forgot-password" ? "Check your inbox" : "Password updated"}
        </span>
        <h1 className="font-serif text-4xl text-accent">
          {mode === "forgot-password"
            ? "A little help is on its way."
            : "You’re ready to return."}
        </h1>
        <p className="mt-5 text-sm leading-7 text-muted">
          {mode === "forgot-password"
            ? "If an account matches that email, you’ll receive a reset link. Check your spam folder too. The link expires in 30 minutes."
            : "Your password has been changed and existing sessions have been signed out. Log in with your new password."}
        </p>
        <Link
          className="mt-7 inline-flex rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white"
          href="/login"
        >
          Back to log in
        </Link>
        {mode === "forgot-password" && (
          <button
            type="button"
            className="mt-5 block text-sm text-accent underline underline-offset-4"
            onClick={() => setComplete(false)}
          >
            Try another email
          </button>
        )}
      </div>
    );

  return (
    <>
      <p className="text-[10px] font-bold tracking-[0.2em] text-gold-dark">
        {labels.eyebrow}
      </p>
      <h1 className="mt-3 font-serif text-3xl leading-tight text-accent sm:text-4xl">
        {labels.title}
      </h1>
      <p className="mt-4 text-sm leading-7 text-muted">{labels.text}</p>
      {invalidToken ? (
        <div className="mt-7 rounded-xl border border-line bg-blush p-5">
          <p role="alert" className="text-sm leading-6">
            This reset link is missing or invalid. Request a new link to
            continue.
          </p>
          <Link
            href="/forgot-password"
            className="mt-4 inline-block text-sm font-semibold text-accent underline underline-offset-4"
          >
            Request a new reset link
          </Link>
        </div>
      ) : (
        <form
          ref={form}
          onSubmit={submit}
          noValidate
          aria-busy={pending}
          className="mt-7 space-y-5"
        >
          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="text-sm font-semibold">
                Your name
              </label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                maxLength={100}
                placeholder="e.g. Priya Sharma"
                disabled={pending}
                required
                className={inputClass}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p id="name-error" className="mt-2 text-xs text-red-800">
                  {errors.name}
                </p>
              )}
            </div>
          )}
          {mode !== "reset-password" && (
            <div>
              <label htmlFor="email" className="text-sm font-semibold">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
                placeholder="you@example.com"
                disabled={pending}
                required
                className={inputClass}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-2 text-xs text-red-800">
                  {errors.email}
                </p>
              )}
            </div>
          )}
          {needsPassword && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-sm font-semibold">
                  {mode === "reset-password" ? "New password" : "Password"}
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold text-accent underline underline-offset-4"
                  aria-pressed={visible}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? "Hide password" : "Show password"}
                </button>
              </div>
              <input
                id="password"
                name="password"
                type={visible ? "text" : "password"}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={mode === "login" ? 1 : 12}
                maxLength={128}
                disabled={pending}
                required
                className={inputClass}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password
                    ? "password-error"
                    : confirmation
                      ? "password-hint"
                      : undefined
                }
              />
              {errors.password ? (
                <p id="password-error" className="mt-2 text-xs text-red-800">
                  {errors.password}
                </p>
              ) : (
                confirmation && (
                  <p id="password-hint" className="mt-2 text-xs text-muted">
                    12–128 characters. A few memorable words work well.
                  </p>
                )
              )}
            </div>
          )}
          {confirmation && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="text-sm font-semibold"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={visible ? "text" : "password"}
                autoComplete="new-password"
                maxLength={128}
                disabled={pending}
                required
                className={inputClass}
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={
                  errors.confirmPassword ? "confirm-error" : undefined
                }
              />
              {errors.confirmPassword && (
                <p id="confirm-error" className="mt-2 text-xs text-red-800">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          )}
          {mode === "login" && (
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-accent underline underline-offset-4"
              >
                Forgot password?
              </Link>
            </div>
          )}
          {message && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-900"
            >
              {message}
              {mode === "reset-password" && (
                <Link
                  href="/forgot-password"
                  className="mt-2 block font-semibold underline"
                >
                  Request a new reset link
                </Link>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg border border-gold/30 bg-accent px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-forest disabled:cursor-wait disabled:opacity-65"
          >
            {pending ? labels.pending : labels.submit}
          </button>
        </form>
      )}
      <p className="mt-7 text-center text-sm text-muted">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link
              href={returnPath ? `/login?next=${encodeURIComponent(returnPath)}` : "/login"}
              className="font-semibold text-accent underline underline-offset-4"
            >
              Log in
            </Link>
          </>
        ) : mode === "login" ? (
          <>
            New to Make My Marriage?{" "}
            <Link
              href={returnPath ? `/signup?next=${encodeURIComponent(returnPath)}` : "/signup"}
              className="font-semibold text-accent underline underline-offset-4"
            >
              Create an account
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className="font-semibold text-accent underline underline-offset-4"
          >
            Back to log in
          </Link>
        )}
      </p>
    </>
  );
}
