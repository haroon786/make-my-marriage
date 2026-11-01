# Authentication — end-to-end study and knowledge-transfer guide

**Project:** Make My Marriage  
**Audience:** An experienced Angular developer learning backend development  
**Implementation reviewed:** 1 November 2026, including the rate-limit correction  
**Scope:** Behaviour, architecture, code responsibilities, persistence, security and testing. Visual design is intentionally excluded.

This guide explains the code that exists in this repository. It is not a promise
that every possible authentication feature is implemented. The app uses custom,
database-backed sessions, not JWTs, OAuth or an external authentication provider.

Read this alongside [the short learning Q&A](LEARNING_QA.md),
[auth setup instructions](AUTHENTICATION.md) and
[current implementation status](IMPLEMENTATION_STATUS.md).

## Contents and suggested study order

1. [Vocabulary and system boundaries](#1-vocabulary-and-system-boundaries)
2. [Frontend overview for an Angular developer](#2-frontend-overview-for-an-angular-developer)
3. [Backend layers and file map](#3-backend-layers-and-file-map)
4. [The HTTP contract](#4-the-http-contract)
5. [Database records and Mongoose](#5-database-records-and-mongoose)
6. [Connection and environment configuration](#6-connection-and-environment-configuration)
7. [Signup, step by step](#7-signup-step-by-step)
8. [Login, step by step](#8-login-step-by-step)
9. [Session checks, protected pages and logout](#9-session-checks-protected-pages-and-logout)
10. [Forgot password and reset password](#10-forgot-password-and-reset-password)
11. [Security helpers and rate limiting](#11-security-helpers-and-rate-limiting)
12. [Complete backend function reference](#12-complete-backend-function-reference)
13. [Errors, testing and troubleshooting](#13-errors-testing-and-troubleshooting)
14. [Practice exercises and next-feature handoff](#14-practice-exercises-and-next-feature-handoff)

First pass: sections 1–4, then follow signup and login. Second pass: database,
sessions and reset. Third pass: function reference, race conditions and testing.
Do not try to memorize every filename before understanding one full request.

## 1. Vocabulary and system boundaries

| Term | Meaning in this application |
| --- | --- |
| Client | The browser making requests to our application |
| Server/backend | Next.js code running in a Node.js runtime, able to access MongoDB and email credentials |
| HTTP request | A method, URL, headers and sometimes a body sent from client to server |
| HTTP response | A status, headers and usually JSON or HTML returned by the server |
| Endpoint | A server URL with a supported method, such as `POST /api/auth/login` |
| Authentication | Establishing which account is making a request |
| Authorization | Deciding whether that account may perform an operation on a resource |
| Session | A database record representing a signed-in period for an account |
| Cookie | Browser-managed data attached to matching HTTP requests |
| Token | A random secret used to prove possession of a session or reset link |
| Hash | A derived value used here to verify a password or look up a token without storing its raw value |
| DTO | Data Transfer Object: the intentionally limited object sent across a boundary |
| Schema | Rules describing data; Zod checks incoming values, while Mongoose defines database models |
| Repository | Functions that perform persistence operations |
| Service | Functions that implement the feature's business workflow |
| Adapter | Code translating our internal operation into an external service call, such as sending email |
| Transaction | A group of database writes that commit together or roll back together |
| Atomic operation | A database operation that cannot be partially interleaved with another operation on the same record |
| Index | A database structure supporting lookups or enforcing constraints such as uniqueness |
| TTL | Time to live: an expiry-based database cleanup mechanism |
| Replica set | A MongoDB deployment configuration supporting the transactions used here; Atlas provides a suitable deployment |
| Middleware | Code that runs around request processing; our `mutation()` wrapper is an ordinary helper, not Next.js middleware |

### Where the code actually runs

```text
Browser
  AuthForm / LogoutButton
  Knows: entered form values, public responses, navigation
       |
       | HTTP request, JSON body, matching cookies
       v
Next.js server, using Node.js
  Route → handler → service → repository
  Also: validation, cookies, crypto, configuration, email adapter
       |                                |
       v                                v
MongoDB Atlas                         Resend
  Accounts/sessions/reset tokens        Reset-email delivery
```

Compass is a separate desktop client that views Atlas. It is not part of the
browser-to-backend request path. Closing Compass does not shut down Atlas.

An Angular route guard or a hidden button controls frontend behaviour. Neither
can protect a database by itself. The server must verify identity and permissions
on every relevant request, because callers can bypass the UI.

## 2. Frontend overview for an Angular developer

### Familiar concepts, different mechanisms

| Angular experience | Current Next.js/React implementation |
| --- | --- |
| Router configuration and routed component | Folders containing `page.tsx` define page routes |
| Component template with bound fields | JSX in `AuthForm`, native inputs and `FormData` on submit |
| Component state/signals | `useState` for pending, errors, visibility and completion |
| A mutable value that need not render | `useRef`, used for the form element and immediate duplicate-submit guard |
| `HttpClient` | Browser `fetch`, returning a Promise; no RxJS Observable is used here |
| Form validators | Shared Zod schemas plus a frontend password-confirmation check |
| Route guard | Server-side `requireAuthContext()` for protected pages; APIs separately validate sessions |
| Application service | The browser calls APIs; backend services here are server functions, not Angular injectable services |

These are comparisons of responsibility, not one-to-one framework equivalences.

### Server components and client components

Auth page files are server components by default. Login and signup can inspect
the current cookie before deciding whether to render the form or redirect.

`auth-form.tsx` and `logout-button.tsx` begin with `"use client"` because they need
event handlers and browser state. Client components may still have initial HTML
rendered on the server; the directive does not mean “this can never be rendered
on the server.” Their interactive behaviour runs in the browser.

Files importing `server-only` must not enter a client component's import graph.
The shared `schemas.ts` deliberately has no database or secret dependencies.

### Frontend files and functions

Paths in this guide are relative to the repository root unless linked.

| File | Responsibility |
| --- | --- |
| `src/app/(auth)/signup/page.tsx` | `SignupPage()` redirects an already signed-in user, otherwise renders `AuthForm` in signup mode |
| `src/app/(auth)/login/page.tsx` | `LoginPage()` does the equivalent for login |
| `src/app/(auth)/forgot-password/page.tsx` | Renders the reset-email request form |
| `src/app/(auth)/reset-password/page.tsx` | Awaits `searchParams`, accepts a single string token, passes it to the form |
| `src/app/(auth)/layout.tsx` | Shared page wrapper and no-index/no-referrer metadata; visual details excluded here |
| `src/modules/auth/components/auth-form.tsx` | Shared four-mode form, validation, requests, response handling and navigation |
| `src/modules/auth/components/logout-button.tsx` | Logout request, pending/error state and fresh navigation to login |
| `src/app/(onboarding)/onboarding/page.tsx` | Server-protected welcome placeholder; redirects existing wedding members to `/app` |
| `src/app/(dashboard)/app/page.tsx` | Server-protected wedding placeholder; redirects users without wedding context to onboarding |

The `(auth)`, `(onboarding)` and `(dashboard)` names are route groups. Parentheses
organize files without becoming URL segments: `/login`, not `/(auth)/login`.

### `AuthForm`: request lifecycle

1. `submit(event)` prevents the browser's native form submission.
2. `busy.current` prevents another submission from entering while one is active.
3. It reads `FormData` and constructs only the fields relevant to the mode.
4. Zod's `safeParse()` validates and returns either parsed data or issues.
5. `showErrors()` stores messages and attempts to focus the first invalid input.
6. Signup/reset additionally compare password and confirmation. Confirmation is
   a typo-prevention field; it is not sent to the backend.
7. It sets pending state, disables form inputs/submission and calls `fetch` with
   JSON, same-origin credentials and a 20-second timeout.
8. Non-success responses become a visible message and optional field errors.
9. Signup/login perform a full navigation according to `hasWedding`.
10. Forgot/reset success clears the form and shows the appropriate success state.
11. A network/timeout/parsing failure produces a generic connection message.
12. `finally` releases the busy state.

`noValidate` disables native browser form-validation messages so our code supplies
the messages consistently. It does not remove the server's validation.

Full `window.location.assign()` navigation after login/logout intentionally starts
a fresh document, avoiding old client route state after an account change. The
browser stores the session cookie; the form does not store tokens in localStorage.

**Timeout nuance:** aborting the browser's wait does not guarantee the server
cancelled its database write. Signup may have completed even if the response was
lost; the form's message suggests trying login in that case.

## 3. Backend layers and file map

```text
src/app/api/auth/login/route.ts       exposes POST
  → src/modules/auth/handlers.ts      HTTP validation/security/response
    → src/modules/auth/service.ts     login workflow
      → repository.ts                 database operations
        → models.ts                   Mongoose models
          → src/server/db/connection.ts → MongoDB
```

The arrows describe responsibilities, not a rigid rule that every function must
call every layer. For example, a handler also calls cookie and rate-limit helpers.
Membership/wedding summary services currently use the native collection API
directly for narrow read-only context; they do not yet have complete repositories.

| File or folder | Purpose and reason for separation |
| --- | --- |
| `src/app/api/auth/*/route.ts` | Thin URL/method exports; no duplicated auth logic in route files |
| `src/modules/auth/handlers.ts` | Converts untrusted HTTP input into validated service calls and safe responses |
| `src/modules/auth/schemas.ts` | Browser-safe validation rules and public types shared by client/server |
| `src/modules/auth/service.ts` | Decides what the feature should do and what public data to return |
| `src/modules/auth/repository.ts` | Owns auth queries, transactions and index initialization |
| `src/modules/auth/models.ts` | Describes users, sessions and reset-token documents |
| `src/server/config/env.ts` | Reads and validates server configuration without exposing secrets |
| `src/server/db/connection.ts` | Reuses database connections instead of opening one per request |
| `src/server/security/credentials.ts` | Password and token cryptographic operations |
| `src/server/security/requests.ts` | Origin validation and bounded JSON reading |
| `src/server/security/rate-limit.ts` | Persistent request counters and trusted client-IP selection |
| `src/server/auth/session.ts` | HTTP cookie operations and protected-page context |
| `src/server/auth/redirect.ts` | Sends already signed-in visitors away from signup/login |
| `src/server/email/password-reset.ts` | Resend API boundary |
| `src/server/http/errors.ts`, `responses.ts` | Common error type and safe JSON response format |
| `src/modules/members/service.ts` | Resolves the current user's existing wedding membership |
| `src/modules/wedding/service.ts` | Returns a small non-deleted wedding summary |
| `next.config.ts` | Includes reset-page no-referrer/no-store response headers |

The actual login route is deliberately small:

```ts
import { loginHandler } from "@/modules/auth/handlers";
export const runtime = "nodejs";
export const POST = loginHandler;
```

`@/` is our alias for `src/`. `POST` is the exported HTTP-method handler. `nodejs`
selects the runtime needed by Mongoose and Node crypto. There is no separate
Express server, controller decorator or dependency-injection container here.

## 4. The HTTP contract

| Endpoint | Validated request | Successful result |
| --- | --- | --- |
| `POST /api/auth/signup` | `name`, `email`, `password` | 201, `{ data: { user, hasWedding: false } }` and session cookie |
| `POST /api/auth/login` | `email`, `password` | 200, `{ data: { user, hasWedding } }` and session cookie |
| `POST /api/auth/logout` | No body required; current session cookie | 200, `{ success: true }`, session deletion and cookie clearing |
| `GET /api/auth/me` | Current session cookie | 200, `{ data: { user, membership, wedding } }` |
| `POST /api/auth/forgot-password` | `email` | 200, generic `{ success: true }` when prerequisites are available |
| `POST /api/auth/reset-password` | `token`, `password` | 200, `{ success: true }`, prior sessions revoked and cookie cleared |

`user` is a public DTO with only `id`, `name`, `email`. It must not contain
`passwordHash`, token hashes, or database internals. Membership/wedding can be null.
The service's internal result includes a raw session token for the handler to put
into the cookie; the handler sends only `result.data` in the JSON body.

Example error shape, using fictional data:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the highlighted fields.",
    "details": { "password": "Use at least 12 characters." }
  }
}
```

The error `code` is stable for code to inspect; the `message` is for a human;
`details` optionally maps fields to their messages.

### Shared `mutation()` wrapper

Signup, login, forgot and reset use this exact ordering:

1. `assertSameOrigin(request)`.
2. `readJson(request)`.
3. `schema.parse(...)` on the server.
4. `limitAuthRequest(request, action)` for the environment/IP layer.
5. The handler callback applies its email/token limit and invokes the service.
6. Mark the response `Cache-Control: no-store`.
7. Catch exceptions and translate them with `errorResponse()`.

Logout and `/me` have their own handlers. Logout checks origin and current identity;
`/me` is a read request and checks the session. Neither uses the above JSON wrapper.
Thus “every auth endpoint applies the same checks” would be an inaccurate shortcut.

## 5. Database records and Mongoose

### Collection: `users`

| Field | Purpose |
| --- | --- |
| `_id` | MongoDB ObjectId identifying this user |
| `name` | Display name |
| `email` | Trimmed email preserving submitted case |
| `emailNormalized` | Trimmed lowercase lookup value with a unique index |
| `passwordHash` | Salted scrypt password hash; excluded from ordinary query selection |
| `authVersion` | Starts at 0; increments after reset to reject stale sessions |
| `createdAt`, `updatedAt` | Mongoose-maintained timestamps |

Normalization prevents `Priya@example.com` and `priya@example.com` becoming two
accounts in this application. A database unique index, not just a prior lookup,
enforces this rule under simultaneous requests.

### Collection: `sessions`

| Field | Purpose |
| --- | --- |
| `_id` | Record identifier |
| `userId` | ObjectId of the account; indexed for lookup/deletion |
| `tokenHash` | Unique SHA-256 hash of the raw session token |
| `authVersion` | User's version captured when this session was created |
| `expiresAt` | Seven days after issue; checked explicitly during authentication |
| `createdAt` | Creation timestamp |

One account can have multiple sessions, such as separate browser logins. There
is no sliding renewal implemented: activity does not extend this seven-day expiry.
Logout removes the current session; reset removes all sessions for that account.

### Collection: `password_reset_tokens`

| Field | Purpose |
| --- | --- |
| `userId` | Account permitted to change its password with this token |
| `tokenHash` | Unique hash of the raw token sent in the reset URL |
| `expiresAt` | Thirty minutes after token creation |
| `usedAt` | Null initially; atomically marked during consumption |
| `createdAt` | Creation timestamp |

Successful reset deletes all that user's reset records, including the consumed
one. Therefore this collection is not a permanent password-reset audit history.
Requesting another email does not itself invalidate earlier valid links; completing
one reset invalidates the user's existing reset links.

### Collection: `auth_rate_limits`

`_id` is a hash of the action/identity/time-bucket key. `count` records attempts and
`expiresAt` supports TTL cleanup. It is defined in the rate-limit infrastructure
file, not in auth's three domain models. A hash obscures the raw key in the record;
it should not be treated as strong anonymization for guessable emails or IPs.

### Mongoose expressions you will encounter

| Expression | Meaning |
| --- | --- |
| `new Schema(...)` | Defines field types, required values, timestamps and indexes |
| `mongoose.model(...)` | Creates a model used to query/write a collection |
| `mongoose.models.User || ...` | Reuses an existing compiled model, useful during hot reload |
| `InferSchemaType` | Derives a TypeScript type from the model schema |
| `.findOne(filter)` | Retrieves one matching document or null |
| `.select("+passwordHash")` | Explicitly includes a field excluded by default; needed for password verification |
| `.lean()` | Returns a plain JavaScript object instead of a full Mongoose document instance |
| `$gt` | Greater-than comparison, used for explicit expiry checks |
| `$set` | Assigns fields |
| `$inc` | Atomically increments a numeric field |
| `$setOnInsert` | Sets initial values only when an upsert creates a record |
| `upsert: true` | Update a match, or insert if no record matches |
| `returnDocument: "after"` | Return the updated document, not the old value |
| `deleteMany({ userId })` | Deletes only records matching that account, not the whole collection |

`unique: true` describes an index; it is not a substitute for handling database
duplicate-key errors. `authDatabase()` ensures indexes exist before auth writes.

**TTL is cleanup, not access control.** MongoDB may delete expired records later.
We reject a session/reset link using `expiresAt > now` even while its record remains.

## 6. Connection and environment configuration

### `connectDatabase()`

The function caches a **Promise for the connection**, not just a finished connection.
If several requests arrive together, they await the same connection attempt rather
than each opening one. `globalThis` preserves this cache across development reloads
within the same process. It is not one global connection shared by all cloud instances.

Current settings:

- `bufferCommands: false`: avoid silently queuing model operations before connection.
- `maxPoolSize: 5`: allow a limited pool of connections for this process.
- `serverSelectionTimeoutMS: 5000`: bound waiting to select a suitable database server;
  this is not a universal five-second timeout for every query.
- Failed initial connection clears the cached Promise so a later call can retry.
- A safe 503 replaces the connection exception; connection strings are not returned.

### Configuration functions

| Function | What it checks |
| --- | --- |
| `getDatabaseEnvironment()` | A non-empty MongoDB URI beginning with a supported scheme; actual connectivity is checked on connection |
| `getAppOrigin()` | Configured `APP_URL` (legacy fallback `NEXT_PUBLIC_APP_URL`); valid HTTP(S), no embedded credentials, HTTPS in production; returns only the origin |
| `getEmailEnvironment()` | Non-empty Resend API key and sender setting; it does not prove the key/domain works at the provider |

An **origin** is scheme + hostname + port, such as `http://localhost:3000`.
It does not include `/login`. We use a configured origin for security checks and
reset links instead of trusting the incoming request's Host header.

`.env.local` contains local credentials and is Git-ignored. `.env.example` documents
variable names without secrets. Production variables must be configured on the
hosting platform; deployment does not automatically upload `.env.local`.

Atlas supplies `MONGODB_URI`; Resend supplies `RESEND_API_KEY`; `EMAIL_FROM` identifies
the sender. Signup/login need MongoDB but not Resend. Keep server secrets out of
`NEXT_PUBLIC_*` variables, which are intended for browser exposure.

## 7. Signup, step by step

Read these files in order: `auth-form.tsx` → signup `route.ts` → `handlers.ts` →
`service.ts` → `repository.ts` → `models.ts` → `session.ts`.

1. Browser validation checks name, email and password; confirmation must match.
2. The server wrapper checks origin, JSON size/type, strict schema and IP policy.
3. `signupHandler()` consumes the signup email allowance (5 per window).
4. `signup()` prepares the database/indexes, a fresh random token and expiry.
5. `hashPassword()` creates a salt and derives a password hash using scrypt.
6. `createAccount()` starts a MongoDB transaction.
7. It inserts a User and a Session linked to the new `_id`, with matching `authVersion`.
8. Both writes commit. If either fails, neither write from that transaction remains.
9. Duplicate email index error `11000` becomes `EMAIL_ALREADY_EXISTS`, status 409.
10. `publicUser()` builds the safe DTO. The internal result separately holds the token.
11. The handler returns 201 and calls `setSessionCookie()` with the raw token.
12. The browser accepts the cookie and navigates to `/onboarding`.

```text
Browser password ──scrypt + random salt──> stored passwordHash
Random session token ──SHA-256──────────> stored tokenHash
Random session token ──Set-Cookie───────> browser's HttpOnly cookie
```

**Why not “find email, then insert” only?** Two requests can both find no account
before either inserts. The unique database index decides the winner safely.

**Transaction boundary:** the cookie response is not part of the MongoDB transaction.
If the network drops after commit, the account may exist without the browser
receiving the response. The user can try login; retrying signup should yield 409.

## 8. Login, step by step

1. `AuthForm` submits email/password; the server validates them independently.
2. Vercel's IP layer allows 30 login requests per window. Local development/test
   has no IP counter. Unsupported production IP configuration returns 503.
3. `loginHandler()` consumes the normalized-email allowance (10 per window).
4. `login()` calls `findUser()` with the normalized email.
5. `findUser()` explicitly selects `passwordHash` because ordinary queries exclude it.
6. `verifyPassword()` derives a hash using the saved salt and compares equal-length
   buffers with `timingSafeEqual()`.
7. For an unknown account, a dummy derivation still performs password-hashing work.
   This reduces one obvious timing difference; it does not promise perfectly equal
   response times for all paths.
8. Unknown account or wrong password returns the same 401 message.
9. For a valid password, `getMembershipContext()` determines whether a wedding exists.
10. A new random session is saved with the user's current `authVersion` and expiry.
11. The handler sets the cookie and returns public user data plus `hasWedding`.
12. The client navigates to `/app` or `/onboarding`.

**Login does not query `{ email, password }` in MongoDB.** The stored password is
a hash, so verification happens through the crypto helper after loading the account.

**Successful attempts count too.** These are request counters placed before password
verification, not failed-password-only counters. A correct password can still get
429 when its email or network allowance has already been consumed.

**Authentication vs authorization:** knowing the user's ID does not authorize every
wedding. Membership is looked up server-side; the browser cannot assign itself an
Admin role or select another user's wedding by changing a form field.

## 9. Session checks, protected pages and logout

### How a later request recognizes you

1. The browser attaches `mmm_session` when cookie scope rules match.
2. `currentUser(token)` rejects missing/malformed tokens before querying the database.
3. It hashes the raw token with SHA-256.
4. `findSessionUser()` finds an unexpired matching session.
5. It finds the user with both matching `_id` and matching `authVersion`.
6. `publicUser()` returns the small DTO, or the caller receives null if invalid.

The token is **opaque**: unlike a JWT, it does not carry trusted user/role claims
that the application decodes. The database lookup establishes identity and validity.

### Cookie properties

| Property | Meaning and limit |
| --- | --- |
| `HttpOnly` | Browser JavaScript cannot read the cookie through `document.cookie`; this alone does not prevent every XSS action |
| `Secure` in production | Cookie sent over HTTPS; local development allows HTTP |
| `SameSite=Lax` | Restricts many cross-site cookie-sending situations; origin checks provide another defence |
| `Path=/` | Cookie applies across this application's routes |
| `Max-Age=604800` | Browser expiry of seven days; the server also verifies database expiry |

`clearSessionCookie()` sends the same cookie name/path with an empty value and
`maxAge: 0`. Removing the browser cookie alone would not invalidate a copied token;
server-side deletion is also necessary.

### Two ways to obtain identity

- **API:** `meHandler()` reads `request.cookies`, calls `getCurrentContext()` and
  returns JSON or 401.
- **Server-rendered page:** `readAuthContext()` awaits Next.js `cookies()` and calls
  the same domain function directly. It does not make an HTTP call to its own `/me` API.

`requireAuthContext()` redirects missing/expired sessions to `/login`.
`redirectSignedInUser()` does the inverse for login/signup. It catches safe 503
configuration/connection errors so the login page can remain reachable, but does
not suppress arbitrary errors.

Depending on when rendering streams, Next.js can encode a redirect in the streamed
response rather than always sending a 307. Our earlier live check observed this;
HTTP status alone was insufficient to test page redirection.

### Membership context

`getMembershipContext(userId)` finds a `wedding_memberships` document for that
authenticated user, accepts ADMIN/MANAGER roles and asks `getWeddingSummary()` for
the related wedding. Invalid/missing membership or a deleted/missing wedding yields
null context. The wedding query projects only summary fields.

These functions support auth redirects today. Wedding creation and membership
management are not implemented by them. Future private APIs still need their own
membership/role enforcement even if a dashboard page is protected.

### Logout

`LogoutButton.logout()` sends a POST with the browser's cookie and a 15-second
timeout. `logoutHandler()` checks origin and verifies the current token. A valid
token is hashed and its session deleted; the cookie is cleared. An already invalid
session gets 401 with a cleared cookie. The UI treats that 401 as already logged out.

Successful logout performs fresh navigation to login. Other devices' valid
sessions are unaffected. A request already authenticated before logout may finish;
revocation protects subsequent checks, not a retroactive cancellation of all work.

## 10. Forgot password and reset password

### Forgot password: create the opportunity to reset

1. The browser submits an email; normal origin/input/IP checks run.
2. The handler applies the email limit (3 per window).
3. `forgotPassword()` validates app origin and email-provider configuration for
   known and unknown emails alike.
4. It looks up the normalized email. If unknown, it returns without sending mail.
5. If known, it creates a 32-byte random token and stores only its hash with a
   30-minute expiry.
6. `sendPasswordReset()` builds the link from configured `APP_URL`, not incoming Host.
7. It calls Resend with the key in the Authorization header, sender, recipient,
   subject and plain-text message. The call has a 10-second timeout.
8. On delivery-call failure, the service removes that reset token and logs only
   the fixed event `auth.reset_email_delivery_failed`.
9. Known/unknown users and handled provider delivery failures receive generic success.

Missing provider configuration instead produces 503 for either account case.
A provider's accepted request is not proof of inbox delivery. Delivery can still
fail or be delayed after acceptance. The current generic response is intentional
to reduce account disclosure; it must not be interpreted as a delivery receipt.
The current implementation sends synchronously, without a background email worker,
and does not eliminate account-related timing differences.

### Reset page vs reset API

The page extracts a string token from the URL. The form checks its shape only:
43 base64url characters. That cannot establish whether it exists, expired or was
used. Authoritative validation happens in the database when the new password is
submitted. Missing/malformed URLs immediately show a request-new-link message.

### Reset transaction

1. Server checks origin, JSON schema, IP policy and token allowance (5 per window).
2. `resetPassword()` hashes the raw token and derives a new password hash.
3. `replacePassword()` starts a transaction.
4. `findOneAndUpdate()` matches token hash, `usedAt: null`, and future expiry; it
   marks `usedAt` and returns the matched record. No match produces 400.
5. It updates that user's password and increments `authVersion` by one. A missing
   user also produces 400 and the transaction rolls back.
6. It deletes all sessions and reset records for that user.
7. The transaction commits, the handler clears the current browser cookie, and
   the UI asks the user to log in with the new password.

Reset does not automatically create a new signed-in session. Other browsers may
still possess cookies, but those cookies no longer pass the server's session check.

### Why `authVersion` is needed even after deleting sessions

Consider simultaneous operations:

```text
Login A reads old password hash and authVersion 0
Reset B changes password, increments version to 1, deletes existing sessions
Login A finishes and inserts a session carrying version 0
Later request with A's token looks for user version 0
User is version 1 → authentication fails
```

Without the version comparison, a late session insert could survive the deletion.
The version makes it unusable. The concurrent login may receive a success response
but will not gain a usable protected session; it must authenticate again.

Concurrent reset transactions also contend over the reset/user writes. Only one
can consume the valid link; retries observe it consumed/deleted. The database
transaction, rather than a frontend disabled button, enforces the invariant.

## 11. Security helpers and rate limiting

### Password hashing and token hashing solve different problems

`derive()` wraps asynchronous Node scrypt in a Promise. Parameters are `N=32768`,
`r=8`, `p=3`, `maxmem=64 MiB`; output is 64 bytes. The encoded password string
includes algorithm parameters, a random 16-byte salt and the derived key.
`verifyPassword()` accepts this encoded format and uses a dummy format otherwise.

Passwords are human-chosen and guessable, so verification deliberately costs
work. Tokens are generated from 32 cryptographically random bytes, so a fast
SHA-256 hash is appropriate for indexed token lookup. We are not encrypting a
password so it can later be decrypted.

The plain password does reach the backend through the request and exists briefly
in memory for verification. “Not stored as plain text” does not mean “never sent.”
HTTPS protects transport in production; secrets must not be logged.

### Origin and JSON checks

`assertSameOrigin()` requires an Origin equal to configured app origin and rejects
`Sec-Fetch-Site: cross-site`. Development allows the localhost/127.0.0.1 equivalent
with the same scheme/port. This helps defend cookie-based mutations against CSRF:
another website trying to cause unwanted requests using the browser's credentials.

It is not authentication. A non-browser caller can send an Origin header, so it
still needs valid credentials or tokens for protected operations.

`readJson()` checks `application/json`, reads the stream up to 8192 bytes, cancels
oversized bodies and parses JSON. It checks actual chunks rather than trusting a
caller-provided length. The result is `unknown` until Zod validates it.

### Exact rate-limit policy

| Layer/action | Allowance in each fixed 15-minute window |
| --- | --- |
| Vercel IP, signup/login/reset | 30 per action |
| Vercel IP, forgot | 10 |
| Signup normalized email | 5 |
| Login normalized email | 10 |
| Forgot normalized email | 3 |
| Reset token | 5 |

`limitAuthRequest()` skips only IP limiting in non-Vercel development/test. The
handler still performs email/token limiting. Production requires the selected
Vercel platform's valid single IP header; unsupported hosts or invalid/missing
headers return 503. Ordinary forwarded headers are not a fallback. IPv6 spelling
is canonicalized so equivalent addresses share a bucket.

`consumeLimit(key, limit, windowMs)`:

1. Connects and ensures the counter TTL index exists.
2. Computes `bucket = floor(Date.now() / windowMs)`.
3. Hashes the key plus bucket number to produce the record ID.
4. Atomically increments `count`, creating the record and expiry if needed.
5. Handles a concurrent upsert's duplicate-key race by retrying the increment.
6. Throws 429 if the resulting count exceeds the limit.

The allowance includes successes and failures that reach that layer. Exceeding
it stops processing before password verification. Requests blocked at the IP
layer never reach the email counter. Changing windows changes the record key;
TTL cleanup is not required for the new window to work.

Example: 10 login requests for one email pass its counter, but the 11th is blocked
even with a correct password. Another email is independent unless they also share
an exhausted IP allowance. Multiple people on the same Wi-Fi can share an IP.

Current `Retry-After: 900` and UI wording advise a conservative 15-minute wait;
they do not calculate the precise remaining time to the next fixed boundary.
There is no failed-only counter reset, sliding window, CAPTCHA or MFA in this code.

### Additional boundaries and limitations

- Zod `.strict()` rejects unexpected request fields, such as a caller supplying a role.
- `no-store` prevents intended caching of auth API responses; it is not a replacement
  for authentication or protection against someone reading an already displayed page.
- Reset links contain secrets in their query string. No-referrer reduces onward
  leakage, but hosting/access logs need separate consideration before public release.
- Login returns generic credential errors; signup deliberately reports duplicate
  email, so this application does not hide account existence on every endpoint.
- No email verification is implemented. Signup proves neither email ownership nor
  permission to access a wedding. Those are separate product decisions.
- Local `npm start` runs in production mode: auth mutations now require supported
  production IP configuration, unlike `npm run dev`. Do not set `VERCEL=1` manually
  on an untrusted host just to bypass this safeguard.

## 12. Complete backend function reference

Use this as a reading checklist after understanding the workflows above.

### Shared schemas — `src/modules/auth/schemas.ts`

| Export | Purpose |
| --- | --- |
| `emailSchema` | Trim, validate email format, maximum 254 characters |
| `passwordSchema` | Require 12–128 characters for new passwords; no trimming |
| `tokenSchema` | Require the 43-character base64url token shape |
| `signupSchema` | Strict name/email/password object; trimmed name 2–100 characters |
| `loginSchema` | Strict email/password object; permits 1–128 password characters to verify existing values |
| `forgotPasswordSchema`, `resetPasswordSchema` | Strict request contracts for their respective endpoints |
| `normalizeEmail()` | Trim and lowercase lookup identity |
| `PublicUser`, `AuthMode` | Compile-time public-user and form-mode types; TypeScript types alone do not validate runtime input |

### HTTP boundary — `src/modules/auth/handlers.ts`

| Function | Input and result / side effect |
| --- | --- |
| `mutation()` | Request + schema + callback → standardized validation/security/error handling |
| `signupHandler()` | Signup request → service, 201 DTO and session cookie |
| `loginHandler()` | Login request → service, 200 DTO and session cookie |
| `forgotPasswordHandler()` | Email request → reset-email workflow and generic success |
| `resetPasswordHandler()` | Token/password request → password change and cookie clearing |
| `logoutHandler()` | Cookie-bearing request → revoke session, clear cookie, or 401 if already invalid |
| `meHandler()` | Cookie-bearing request → public context or 401 |

The six `src/app/api/auth/<operation>/route.ts` files export these corresponding
functions as `POST`, except `me`, which exports `GET`. Each selects Node.js runtime.

### Business workflow — `src/modules/auth/service.ts`

| Function/constant | Purpose |
| --- | --- |
| `SESSION_SECONDS` | Seven-day lifetime shared by cookie and session creation |
| `publicUser()` | Explicitly maps a database user to `{ id, name, email }` |
| `signup()` | Hash password, create account/session, map duplicate email, return public data plus internal token |
| `login()` | Verify password, resolve membership, create session and return redirect information |
| `currentUser()` | Validate token shape, hash it, resolve a valid session user |
| `logout()` | Hash raw token and ask repository to revoke that session |
| `forgotPassword()` | Validate configuration, lookup account, save token, send/reset failure handling |
| `resetPassword()` | Hash token and new password, delegate atomic replacement |
| `getCurrentContext()` | Combine public identity with current membership/wedding, or null |

### Persistence — `src/modules/auth/repository.ts`

| Function | Database responsibility |
| --- | --- |
| `authDatabase()` | Connect and memoize creation of the three auth models' indexes; reset failed index initialization for retry |
| `findUser()` | Find normalized email and explicitly include password hash |
| `createAccount()` | Transactionally insert linked user/session |
| `createSession()` | Insert one hashed session with captured auth version |
| `findSessionUser()` | Enforce session expiry and matching user version |
| `revokeSession()` | Delete one token-hash match |
| `saveReset()` | Insert hashed reset token and expiry |
| `discardReset()` | Delete undeliverable reset token; invoked after the save path has connected |
| `replacePassword()` | Transactionally consume token, replace password, increment version and delete sessions/reset links |

### Infrastructure and context helpers

| File | Functions/exports and purpose |
| --- | --- |
| `server/security/credentials.ts` | `derive`, `hashPassword`, `verifyPassword`, `createToken`, `hashToken`: crypto described in section 11 |
| `server/security/requests.ts` | `assertSameOrigin`, `readJson`: trust and input-size boundary |
| `server/security/rate-limit.ts` | `consumeLimit`, `limitAuthRequest`: persistent counters and environment/IP policy |
| `server/auth/session.ts` | `SESSION_COOKIE`, `setSessionCookie`, `clearSessionCookie`, `readAuthContext`, `requireAuthContext` |
| `server/auth/redirect.ts` | `redirectSignedInUser`: route signed-in visitors to their next page |
| `server/config/env.ts` | `getDatabaseEnvironment`, `getAppOrigin`, `getEmailEnvironment` |
| `server/db/connection.ts` | `connectDatabase`: cached pooled connection and safe initial error |
| `server/email/password-reset.ts` | `sendPasswordReset`: trusted URL construction and bounded Resend request |
| `server/http/errors.ts` | `AppError`: expected error carrying code, message, status, optional field details |
| `server/http/responses.ts` | `dataResponse`: public data wrapper; `errorResponse`: safe mapping of Zod, AppError and unknown failures |
| `modules/members/service.ts` | `getMembershipContext`: membership by authenticated user, accepted role and wedding summary |
| `modules/wedding/service.ts` | `getWeddingSummary`: validate ID, exclude deleted wedding, return selected summary fields |

An `async` function returns a Promise. `await` pauses that function's continuation
while I/O completes; it does not mean the entire server can process only one user.
This is why concurrent-write protection must exist in the database, even when the
code is written as sequential-looking `await` statements.

## 13. Errors, testing and troubleshooting

### Error translation

`AppError` extends JavaScript `Error` with a known HTTP status/code. Zod errors
become 400 with field details. Other unexpected exceptions become a generic 500,
without returning stack traces or database/provider messages.

| Status | Example in our flow | What to investigate |
| --- | --- | --- |
| 200/201 | Success/account created | Check expected data and cookie, not only the message |
| 400 | Invalid fields, malformed JSON, invalid/expired reset link | Request shape or reset-link state |
| 401 | Wrong credentials, missing/expired/revoked session | Password/session state; no need to assume DB outage |
| 403 | Origin/security check rejected request | APP_URL, browser origin, request headers |
| 409 | Email already registered | Login instead, or use a different intended account |
| 413 | Body exceeds 8 KiB | Payload size; do not simply raise limits without need |
| 415 | Body is not JSON | Content-Type and client request code |
| 429 | Counter exceeded | Which action, email/token/IP and time window applied |
| 503 | Missing config, initial DB connection failure, unsupported production IP setup | Environment and services; not necessarily bad credentials |
| 500 | Unexpected server failure | Server-side diagnosis without exposing secrets to the user |

After a previously successful connection, later database operation failures may
be generic 500s; the initial connection wrapper is not a universal mapping of all
future database failures. Current unexpected-error observability is limited;
`errorResponse()` does not itself log detailed exceptions.

### Test files and what they prove

- `tests/auth.integration.test.ts` starts a temporary MongoDB replica set. It
  invokes real handlers with `NextRequest`, exercises real persistence/transactions,
  and mocks the email adapter. It covers duplicate/concurrent signup, credentials,
  logout, expiry, membership context, reset reuse/concurrency/version protection,
  validation, origin checks, concurrent counters and the rate-limit correction.
- `tests/auth-configuration.test.ts` checks missing configuration, HTTPS origin,
  Host-header spoofing defence and the Resend request shape using mocked `fetch`.
- `tests/server-only.ts` is a test-only empty shim. It lets the Node test runner
  import server modules; the production `server-only` boundary remains intact.
- `vitest.config.mts` maps aliases, uses Node, runs files without parallelism and
  provides startup time for the temporary database. The integration suite controls
  its own URI and does not load `.env.local`.

**Recorded result:** 25 tests and `npm run check` passed after the limiter fix.
The handler tests are not browser automation and do not test actual inbox delivery.
Earlier real HTTP checks against Atlas passed and removed their disposable account.

Commands:

```powershell
npm.cmd test
npm.cmd run check
npm.cmd run dev -- --hostname 127.0.0.1
```

The first test run may download a MongoDB binary. `check` runs lint, route type
generation/TypeScript and production build. A passing build is not a production
login test and does not verify hosted environment variables or trusted IP headers.

### A practical debugging order

1. **Can the browser reach the app?** Connection refused means investigate the
   local server/listening port first, before investigating auth rules.
2. **Did the browser send a request?** If not, inspect frontend validation and state.
3. **What status/body came back?** Use browser Network tools; never share raw
   passwords, cookies or reset tokens from request captures.
4. **Was a cookie issued and accepted?** Remember `localhost` and `127.0.0.1` are
   different cookie hosts even though development origin checks allow both.
5. **What does `/api/auth/me` return?** It distinguishes usable identity from merely
   having a cookie value. Do not copy raw session values into debugging notes.
6. **What exists in Compass?** Inspect the intended development database, normalized
   email, expiry and versions. Do not manually edit hashes to bypass the workflow.
7. **Is the problem email only?** Verify server configuration and provider delivery
   separately; a generic forgot response does not prove a message arrived.
8. **Could a rate bucket be exhausted?** Wait for the next window; logging out or
   refreshing cannot reset persistent counters.

## 14. Practice exercises and next-feature handoff

### Exercises using a disposable development account

1. Trace one signup in browser Network tools. Identify method, status, DTO and
   cookie attributes without recording sensitive values.
2. Inspect the new user/session in Compass. Explain why their IDs differ and how
   `userId` links them. Identify the hash fields without copying their values.
3. Log out and inspect that this session disappears while the account remains.
4. Use a case variation of the same email and explain why duplicate signup fails.
5. Read the concurrent-signup test and explain why frontend button disabling alone
   would not replace a database unique index.
6. Read the reset-version race test. Explain why deleting sessions alone is insufficient.
7. Read the new local-rate-limit test. Identify the check proving one exhausted
   email does not block a different email.
8. Once Resend is configured, verify real delivery → reset → old session rejection
   → new-password login. Until then, distinguish automated coverage from live delivery.

### Self-check questions with short answers

| Question | Answer |
| --- | --- |
| Where does the password become a hash? | Service calls `hashPassword()` before repository persistence |
| Who converts failures into HTTP JSON? | Handlers call `errorResponse()` |
| Can a client provide its own trusted user ID? | No; identity comes from a verified session token |
| Does a cookie guarantee access? | No; the server checks hash, expiry, user existence and auth version |
| Who enforces unique email under concurrency? | MongoDB unique index |
| Does token shape validation prove it is valid? | No; the database must check existence, expiry and use state |
| Does TTL immediately revoke access? | Access is revoked by explicit expiry/version checks or deletion; TTL cleans up |
| Does logout delete the account? | No; it revokes the current session |
| Is a successful forgot response an email receipt? | No; it intentionally has generic semantics |
| Does passing tests mean deployment is complete? | No; hosted/browser/email verification are separate |

### What the next feature can reuse

Wedding creation can reuse the authenticated user context, HTTP responses,
server validation, connection and transaction patterns. The backend should derive
the creator's identity from the session and create the wedding plus initial Admin
membership consistently. It must not trust a client-submitted Admin role/user ID
as authorization. The final contract belongs to the existing PRD/API/database
designs; this guide does not implement or expand that next feature.

### Current boundaries

Implemented: custom email/password auth, opaque sessions, reset logic, request
protections and read-only membership context. Pending: actual Resend delivery,
complete browser/mobile acceptance and deployment. No OAuth, MFA, email ownership
verification, refresh-token system, sliding sessions, wedding creation or complete
membership management is implied by these notes.

When code changes, update the affected flow, function table and verification notes
here. Keep operational status in the tracker and short follow-up questions in the
learning Q&A. No credentials belong in any study document.
