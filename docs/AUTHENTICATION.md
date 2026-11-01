# Authentication: implementation and setup

For explanations of the frontend/backend flow and each file/function, read the
[authentication study guide](AUTH_STUDY_GUIDE.md). This document focuses on setup
and implementation decisions.

## What is implemented

Signup, login, logout, current-user lookup, forgot password and reset password.
Pages: `/signup`, `/login`, `/forgot-password`, `/reset-password?token=...`.
REST handlers follow API_DESIGN sections 11–16 under `/api/auth`.

The selected Stitch project has no dedicated authentication screens. These pages
use the approved Royal Heritage colours, local fonts and ceremony imagery.

After signup/login, users without a wedding reach the authenticated `/onboarding`
welcome page. Existing wedding members reach a protected `/app` placeholder.
Wedding creation, invitation acceptance and dashboard features are the next
increment; this change does not implement those workflows.

## Current local configuration

As of 1 November 2026, the local app is connected to MongoDB Atlas database
`make_my_marriage`. The connection string is in ignored `.env.local`, with
`APP_URL=http://localhost:3000`. Compass is a client for viewing this same Atlas
database; the database itself is hosted by Atlas, not running inside Compass.

Live HTTP signup/login/logout and reset-persistence checks passed using a disposable
account that was removed afterward. Reset email still requires Resend configuration.
Rotate the database password shared in chat and update `.env.local`, then restart
the development server. Never copy credentials into this guide.

## Configure services on a new machine

1. Copy `.env.example` to `.env.local` (never commit real credentials).
2. Create a development MongoDB Atlas cluster and database user. Allow the IP
   addresses that will connect. Put the connection string, including a database
   name, in `MONGODB_URI`. URL-encode special characters in its credentials.
3. Set `APP_URL` to `http://localhost:3000` locally. The development origin check
   also accepts `http://127.0.0.1:3000`. Production requires the exact HTTPS origin.
4. For reset email, configure `RESEND_API_KEY` and `EMAIL_FROM`. Resend requires
   a permitted recipient while testing, or a verified sender domain for real use.
5. Restart the development server after changing environment variables.

Signup/login need MongoDB, not an email API key. Password reset additionally
needs Resend. The auth screens render without credentials; submissions return
an explicit service-unavailable error rather than simulating success.

MongoDB must support transactions (Atlas or a local replica set). The application
creates auth unique/TTL indexes before accepting writes. Its database user must
have permission to create collections/indexes. No seeds or default passwords.
There is no SESSION_SECRET requirement: random opaque tokens are stored as hashes.

## Flow and boundaries

`AuthForm → REST route → handler (validation/security) → service → repository → MongoDB`

- `src/modules/auth/schemas.ts`: browser-safe request schemas and public types.
- `models.ts`, `repository.ts`: Users, Sessions and PasswordResetTokens persistence.
- `service.ts`: account/session/reset behaviour and public DTOs.
- `handlers.ts`: same-origin checks, bounded input, rate limits and HTTP responses.
- `src/server/security`: Node crypto primitives, origin validation and shared limits.
- `src/server/auth`: cookie handling and protected-page guards.
- `src/server/email/password-reset.ts`: Resend adapter, called only by the server.
- Members/wedding services provide read-only membership context for redirects.

## Security decisions

- Passwords use Node's asynchronous scrypt with random salts (`N=32768,r=8,p=3`),
  64-byte derived keys and timing-safe comparisons. Password length is 12–128
  characters; login accepts existing shorter values without trimming passwords.
- Emails are trimmed and lowercased for unique lookup; original casing is retained.
- Session tokens are 32 random bytes. Only SHA-256 hashes are stored. Cookies are
  HttpOnly, SameSite=Lax, Path=/, Secure in production and expire after seven days.
- Every protected request checks expiry explicitly; TTL cleanup is not authorization.
- Reset tokens expire after 30 minutes. Consuming a token, replacing the password
  and invalidating all reset links/sessions happen in one transaction.
- `users.authVersion` and `sessions.authVersion` supplement the database baseline:
  reset increments the user version, preventing concurrent old-password logins
  from creating usable sessions after reset.
- Reset requests return the same success body for known/unknown accounts. Delivery
  failures invalidate the undelivered token and log only a fixed event name.
  Network timing is not guaranteed to be identical; no background email worker is
  introduced for this single-email flow.
- `auth_rate_limits` is a small infrastructure collection with hashed keys and TTL.
  Fixed 15-minute windows limit requests per client and normalized account/token.
  Vercel uses its platform-controlled `x-vercel-forwarded-for`, validated as one IP
  and canonicalized for IPv6. Local development/test skips only the IP layer;
  normalized email/reset-token limits still apply. Production outside Vercel, or
  a missing/invalid Vercel IP, returns 503 until trusted hosting is configured.
  Arbitrary forwarded headers are never used as a fallback. See the detailed
  checking flow in [LEARNING_QA.md](LEARNING_QA.md#q15-what-is-the-exact-login-rate-limit-flow-after-the-fix).
- Mutations require an allowed Origin; no client-provided redirect destinations.
- JSON requests are limited to 8 KiB. Auth API responses use `Cache-Control: no-store`.
- Reset pages use no-referrer/no-store. Never log reset URLs, cookies, passwords,
  connection strings or provider response bodies. Review hosting log retention
  before public release because reset tokens arrive in the page query string.

No social login, email verification, JWT/localStorage sessions or guest accounts.

## Verification

`npm test` starts an isolated MongoDB replica set in a temporary directory and
tests real persistence, transactions and handlers. It never reads `.env.local`.
The first run downloads a MongoDB test binary; later runs reuse it. Reset email
delivery is mocked, so tests send no email. `npm run check` runs lint, types and build.

Manually verify signup → onboarding → logout → login, field errors, duplicate
emails, wrong passwords and protected redirects. Once Resend is configured, also
verify actual inbox delivery → reset → old sessions rejected → new login.

Implementation references:
- [Node scrypt](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback)
- [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email)
- [Vercel request headers](https://vercel.com/docs/headers/request-headers)
