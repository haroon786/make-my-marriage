# Make My Marriage — Full-stack learning Q&A

Started: 1 November 2026.

This is Haroon's study notebook for learning frontend (FE), backend (BE), databases,
testing and deployment through this project. Questions below paraphrase our
discussions; they are not verbatim transcripts. The Markdown format can later be
converted to a PDF.

For the complete auth walkthrough and backend file/function reference, read
[Authentication — end-to-end study guide](AUTH_STUDY_GUIDE.md). This Q&A remains
the shorter companion for individual learning questions.

## How to maintain these notes

Whenever a project discussion explains an unfamiliar frontend or backend concept,
add or update a numbered question here. Use plain language, define new terms and
include a project example. Distinguish how the concept works from what our app
currently implements. Never include passwords, connection strings with credentials,
API keys, session tokens or real personal records.

Keep entries grouped by topic. Record meaningful corrections rather than leaving
contradictory answers. Use [implementation status](IMPLEMENTATION_STATUS.md) for
current delivery and testing status; this notebook is for understanding concepts.

## Frontend and backend basics

### Q1. What are the frontend and backend in our app?

**Frontend:** what the user sees and interacts with in the browser: pages, fields,
buttons, loading indicators and error messages.

**Backend:** code that checks requests, applies rules and reads or writes stored
data. It runs on the server, not inside the visitor's browser.

**Our example:** the signup form collects a name, email and password. It sends a
request to the backend. The backend validates the details, hashes the password
and saves the account in MongoDB. The frontend then shows the next page.

The frontend and backend live in the same Next.js project, but have different
responsibilities. A server-rendered page can also produce the HTML the browser sees.

### Q2. What is an API in this signup flow?

An API is an agreed way for one part of the application to ask another part to do
something. Our browser sends an HTTP request to a named URL, and the server returns
a response.

For signup:

```text
Signup form
  → POST /api/auth/signup
  → validate input and apply security checks
  → create account and session in MongoDB
  → return success or an error
  → browser displays the result
```

`POST` indicates a request that submits data. A response includes a status code,
such as `201` for account creation or `409` for an email that already exists.
The API is not the database itself; backend code decides what can be stored.

### Q3. Why do we validate fields on both the frontend and backend?

Frontend validation gives quick feedback, such as “Use at least 12 characters,”
without waiting for the server.

Backend validation protects the application. Someone can send an API request
without using our form, so the server must check the input independently.

Our app shares Zod schemas between these layers to keep the rules consistent.
Zod is a library that checks whether data matches specified rules.

## Database and authentication

### Q4. Does signup really create an account in the database?

Yes. A successful signup creates a document in the `users` collection of our
`make_my_marriage` Atlas database. A document is one stored record; a collection
groups records of a similar kind.

It stores the name, email, normalized email used for lookup, password hash and
other account fields. It also creates a session so the new user is signed in.

Invalid input or a duplicate email does not create another account. Our signup
uses a transaction: account creation and session creation succeed together, or
their writes are rolled back together.

In Compass, refresh the database list and open `make_my_marriage` → `users`.
Do not share screenshots containing private account information.

### Q5. Are MongoDB Atlas, Compass and Mongoose the same thing?

No. They have different roles:

| Name | Role in our project |
| --- | --- |
| MongoDB | The database technology storing our records |
| Atlas | The hosted MongoDB service where our database runs |
| Compass | A desktop application for viewing and managing that database |
| Mongoose | The library our backend uses to define models and work with MongoDB |

Connecting through Compass does not make Atlas run on your laptop. Compass and
our local application connect separately to the hosted database.

### Q6. Is my password stored as plain text?

No. Our backend uses **scrypt**, a password-hashing algorithm, with a random salt.
A salt is random data added when hashing, so accounts using the same password
do not simply have identical stored hashes.

When you log in, the backend checks the submitted password against the saved
hash. It does not recover the original password from the hash.

This is why “forgot password” lets you choose a new password rather than telling
you your old one. You should still use a unique password and protect credentials.

### Q7. Why am I signed in immediately after signup?

Our signup creates both the account and a **session**. A session is a server-side
record that allows later requests to be recognized as belonging to a signed-in user.

The browser receives a cookie called `mmm_session` containing a random token.
The database stores a hash of that token. The browser sends the cookie with later
requests, and the server checks the session and its expiry.

The cookie is `HttpOnly`, meaning browser JavaScript cannot read it directly.
It uses `Secure` in production so the browser sends it over HTTPS.

Signup currently takes new users to the protected onboarding welcome page.
Wedding creation is a separate feature.

### Q8. Should I test signup first and then login?

Yes, but **log out between them**, because signup signs you in automatically.

1. Submit empty or invalid signup details and check the field messages.
2. Sign up with valid details and check that onboarding appears.
3. Refresh and check that you remain signed in.
4. Log out.
5. Try signing up with the same email; expect a duplicate-account message.
6. Try login with the wrong password; expect an error.
7. Log in with the correct password; expect onboarding.
8. Log out and open `/onboarding`; expect a redirect to login.

Also check loading indicators, password visibility and mobile layout. Testing
through the interface checks the experience in addition to the backend rules.

### Q9. Why can signup/login work while reset emails do not?

They depend on different services. Signup and login need MongoDB. Sending a reset
email additionally needs an email provider; our implementation uses Resend.

A password-reset flow has several steps:

```text
Request reset → create temporary token → send email
→ open link → submit new password → invalidate old sessions
```

Our reset persistence has been tested against Atlas using a token created only
for a disposable test account. This verifies the password-change logic, but does
not prove that a real email reaches an inbox. Resend configuration and delivery
verification remain separate work as of this notebook's initial entry.

## Errors and security

### Q10. What did “127.0.0.1 refused to connect” mean?

`127.0.0.1` refers to your own computer. Port `3000` is where our development
server listens for browser requests.

In the incident we checked, nothing was listening on that port because the app
server had stopped. Restarting it restored the page. The error occurred before
the browser could talk to our app; it was not evidence of an incorrect password
or a deleted account.

To run it from PowerShell:

```powershell
cd D:\Hands-On\NAM_AI\make-my-marriage
npm.cmd run dev -- --hostname 127.0.0.1
```

Keep that terminal running while testing. Open `http://127.0.0.1:3000` once the
server reports that it is ready. Production hosting will run the deployed app
separately from this local development process.

### Q11. What is rate limiting, and what issue did the review find?

**Rate limiting** restricts how many requests can be made within a time window.
For login, it helps limit repeated password guesses and excessive requests.

The code reviewed before the 1 November fix had a per-email limit and a separate client limit. The reviewed
client-limit fallback uses one shared bucket whenever the app is not running on
Vercel. That means everyone shares 30 login attempts per 15-minute window.

Example:

- Person A makes 10 login attempts.
- Person B makes 20 login attempts.
- Person C's first attempt is rejected because the shared total reached 30.

Even successful login attempts count toward this request limit. The result is a
temporary “Too many attempts” response (`429`), not damage to stored accounts.

Before public deployment, we need a trustworthy way to identify the requesting
client for our chosen host and test that different clients use different buckets.
An IP address is a network address; multiple people on the same network may share
one, so per-IP limits are not exactly per-person limits.

We must not blindly trust an IP header supplied by the caller: an attacker could
change it to evade the limit. Our Vercel branch uses a platform-controlled header;
other hosting requires an explicit trusted-proxy arrangement. The non-Vercel
fallback issue was corrected on 1 November 2026. This example explains the original
bug; Q15 describes the corrected behaviour.

### Q12. Is a passing test suite the same as a fully finished feature?

No. Each check proves something different:

| Check | What it tells us |
| --- | --- |
| Lint | Code follows configured rules |
| Typecheck | TypeScript finds no type errors under our configuration |
| Production build | The app can be compiled for production |
| Automated integration tests | Tested backend behaviours work in a controlled environment |
| Live Atlas HTTP checks | Running endpoints work with the configured hosted database |
| Browser testing | Forms, messages, navigation and layout work through the UI |
| Real email test | The configured provider actually delivers a usable reset link |
| Deployed smoke test | Essential flows work on the hosting environment |

Our recorded 21 passing tests and live Atlas checks are useful evidence, but they
do not replace mobile/browser checks or actual email delivery. Consult the
implementation tracker for the latest results.

### Q13. What was the intermittent hydration message about?

Hydration is when React connects browser-side behaviour to HTML that the server
already rendered. A mismatch can occur if the browser's initial HTML differs from
what React expects.

The screenshot we discussed contained `data-darkreader-*` attributes, suggesting
the Dark Reader extension changed the page before React attached to it. That is
evidence of a possible extension cause, not proof that every mismatch is harmless.

A useful check is to reproduce it in a browser profile without extensions. If it
still happens, inspect the app for differences between server and browser output.
The project tracker does not mark that incident as a confirmed application fix.

### Q14. Are login limits only for banking apps? Does Vercel require them?

No. Ordinary apps with accounts also need protection against automated password
guessing. Login throttling is recommended general authentication practice, not
something reserved for banking. Normal users should rarely encounter it when
limits are scoped and tuned appropriately.

For example, someone making thousands of guesses against a wedding account could
put private wedding and guest information at risk. A temporary limit slows that
activity. It should not make unrelated users share one small global allowance.

Our system design selects Vercel for hosting (`SYSTEM_DESIGN.md`, ADR-12). The app
currently runs locally; the hosting plan is not evidence that it is already deployed.
Vercel is a hosting choice, while login throttling is an application-security choice.
Our particular 30-attempt/15-minute rule is our code, not a Vercel requirement.

Decision: keep proportionate login protection and correct the shared local/
non-Vercel fallback (now implemented; see Q15). There is no need to add banking-style security workflows for
this lesson. The Vercel code path already selects a client-specific header; deployment
still needs verification, and people sharing a network can share an IP address.

Reference: [OWASP Authentication Cheat Sheet — Login Throttling](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#login-throttling).

### Q15. What is the exact login rate-limit flow after the fix?

Updated: 1 November 2026. The global shared fallback has been removed.

```text
User clicks Log in
  → Browser validates email/password fields
  → POST /api/auth/login
  → Server checks the request Origin (where the request came from)
  → Server reads bounded JSON and validates fields again
  → Identify the environment:
      Local development/test: skip the IP limit only
      Vercel: require a valid platform-provided IP address
      Other production host or invalid Vercel IP: stop with 503
  → On Vercel, count this login request for this IP
      First 30 requests in the window: continue
      Request 31 onward: stop with 429 (Too many attempts)
  → Count this request for the normalized email address
      First 10 requests in the window: continue
      Request 11 onward: stop with 429
  → Find account and check password hash
      Wrong password or unknown account: 401 (Invalid email or password)
      Correct password: create session and set cookie
  → Browser opens onboarding or the wedding workspace
```

Both layers use **fixed 15-minute windows**. A fixed window ends at the next clock
boundary, not necessarily 15 minutes after your first attempt. The current message
and `Retry-After` header conservatively advise waiting 15 minutes.

**These counters count requests, including successful logins, not only wrong
passwords.** Logging out or refreshing does not reset them. A request blocked at
the IP layer never reaches the email counter or password check. Malformed requests
rejected before the limiter do not count toward these application counters.

| Operation | Vercel IP limit per window | Email/token limit per window |
| --- | --- | --- |
| Signup | 30 | 5 per normalized email |
| Login | 30 | 10 per normalized email |
| Forgot password | 10 | 3 per normalized email |
| Reset password | 30 | 5 per reset token |

Each operation has its own counters. Email lookup trims whitespace and ignores
letter case, so `Priya@example.com` and `priya@example.com` share a counter.

**Example locally:** one email using all 10 login attempts no longer consumes a
global allowance for other emails. Another account can still log in. Account
limits remain necessary because local request headers are not a trustworthy way
to identify remote clients; do not expose the development server as public hosting.

**Example on Vercel:** unrelated IPs have independent IP counters, but users on the
same Wi-Fi may share an IP. Attempts for the same email share its account counter
even across different IPs. Correct credentials can still be temporarily limited
when their own email or network allowance has been exhausted.

**What is stored?** MongoDB's `auth_rate_limits` collection holds a hashed bucket
identifier, count and expiration. Atomic increments handle simultaneous requests.
Expired records are cleaned up by MongoDB's TTL index; a new time window uses a
new identifier even if old records have not been cleaned up yet.

**Production safeguard:** we currently support Vercel's trusted IP header. We do
not accept a caller's arbitrary `x-forwarded-for` header. If another production
host is chosen, its trusted client-address handling must be implemented first.
`503` here signals configuration/service unavailability, not a bad password.
Never set `VERCEL=1` manually to make a non-Vercel host trust incoming headers.

Source for the hosting header: [Vercel request headers](https://vercel.com/docs/headers/request-headers).
Implementation: `src/server/security/rate-limit.ts` and `src/modules/auth/handlers.ts`.

## Future entry template

```markdown
### QN. The question in simple words

Short answer:

Explanation and definitions:

Example from Make My Marriage:

Current implementation or pending work, if relevant:
```
