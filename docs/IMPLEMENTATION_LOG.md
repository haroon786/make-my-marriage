# Implementation log

Tracking started: 1 November 2026.

Earlier milestones below are reconstructed in delivery order from the repository
and conversation. Exact original dates are not assigned where they were not
recorded. See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for current
status and pending work; this log preserves how the project reached that state.

## 01 — Requirements review and architecture baseline

- Reviewed the intended product through PRD, system, database and API design docs.
- Established feature-by-feature development within a modular monolith: thin routes,
  domain modules, server infrastructure and reusable presentation components.
- Agreed to prioritise learning the full-stack lifecycle and instructor's V1 scope.
- Evidence: `docs/PRD.md`, `SYSTEM_DESIGN.md`, `DATABASE_DESIGN.md`, `API_DESIGN.md`.
- Limitation: baseline agreement does not establish that every future feature is built.

## 02 — Initial skeleton and Tailwind foundation

- Created the Next.js/React/TypeScript skeleton and auth/onboarding/dashboard/public
  route-group structure, with future domain directories reserved.
- Added Mongoose connection infrastructure, environment template, HTTP error helpers,
  root layout and loading/error/not-found states.
- Adopted Tailwind CSS v4 following the user's preference; added lint/type/build scripts.
- Evidence: `package.json`, `src/app`, `src/modules`, `src/server`, `.env.example`.
- Verification: scaffold checks passed in earlier work; the latest auth check also
  validates the current application's lint, types and build.

## 03 — Design access and V1 presentation decisions

- Inspected Stitch project `1090853014199964115` and selected Royal Heritage landing
  screen `f3868e1ede2c46f5b64046bf894bc2c3`.
- User accepted either landing variant provided V1 scope was retained.
- Excluded unsupported homepage functionality such as accommodation, transport and
  meal preferences; kept sample wedding content explicitly illustrative.
- Selected project had no dedicated auth screens. User approved matching the existing
  colours, typography and components when building those screens.
- Evidence and detailed exclusions: [HOMEPAGE.md](HOMEPAGE.md).

## 04 — Homepage implementation and review

- Built navigation, hero, workspace preview, feature sections, family/task examples,
  sample wedding event/photo views, invitation dialog, introduction and footer.
- Added local fonts/licences and ceremony images from the selected design.
- Kept preview interactions local; no guest records, RSVP submissions or wedding
  persistence were created by homepage demos.
- Evidence: `src/components/home`, `src/app/page.tsx`, `src/app/globals.css`,
  `src/app/fonts`, `public/images/home`.
- Verification: homepage lint/type/build checks passed; browser review performed.
- Review follow-ups: mobile signup menu closure and dark-background focus styling
  addressed with auth integration. Font preload optimisation remains pending.
- Reported intermittent hydration mismatch showed Dark Reader attributes; suspected
  browser-extension interference, not a confirmed application-code defect or fix.

## 05 — Authentication implementation

- Added signup/login/forgot-password/reset-password pages in Royal Heritage styling,
  shared form validation, confirmation fields, show-password control and request states.
- Added six auth API endpoints, Mongoose models/repository/services, normalized unique
  email lookup, scrypt password hashing and opaque HttpOnly cookie sessions.
- Added password-reset token expiry/single use, transactional password changes,
  session revocation, origin checks, bounded JSON input and database-backed rate limits.
- Added Resend adapter and configuration checks; no real credentials were configured.
- Added read-only membership/wedding context and protected onboarding/dashboard
  placeholders. Updated homepage signup/login navigation.
- Evidence: `src/modules/auth`, `src/app/(auth)`, `src/app/api/auth`,
  `src/server/auth`, `src/server/security`, `src/server/email`.
- Details: [AUTHENTICATION.md](AUTHENTICATION.md), including additive `authVersion`
  fields and the `auth_rate_limits` infrastructure collection.
- Verification: 21 tests passed using temporary MongoDB and mocked email;
  `npm run check` passed. Desktop signup visually inspected.
- Pending: user's MongoDB configuration, actual reset email delivery, full browser
  walkthrough/mobile verification. Wedding creation remains a separate feature.

## 06 — 1 November 2026: implementation tracking

- Added this historical log and the current implementation-status document.
- Linked tracking from the root README, alongside existing feature/setup guides.
- Reconciled entries against current source paths, scripts and previously recorded
  test outcomes; distinguished implemented code from pending live verification.
- Documentation-only change: no application behaviour changed; application tests
  were not rerun for this update.

## 07 — 1 November 2026: connect Atlas and verify live auth

- Configured ignored `.env.local` with the supplied Atlas connection and explicit
  database `make_my_marriage`; set local `APP_URL`. Confirmed Git ignores the file.
- Started the local development server and verified Atlas connection/ping.
- Real HTTP smoke checks passed for page rendering, protected-page access, signup,
  duplicate email, current user, incorrect/correct login, logout, password reset,
  session invalidation and token reuse rejection.
- Reset persistence used a directly seeded token for a disposable test account;
  no email was sent. Removed only that account and its sessions/reset records.
- Initial smoke assertion expected a 307 status for a protected page. Inspection
  confirmed Next.js streamed the login redirect within a 200 response; corrected
  the smoke assertion and reran successfully. No auth implementation fix was needed.
- Pending: rotate the shared database password, configure Resend sender/key,
  verify actual inbox delivery and complete desktop/mobile browser acceptance.
- Updated README, auth setup notes and current status. Existing isolated test suite
  and production build were not rerun because no application code changed.

## 08 — 1 November 2026: correct authentication rate-limit scope

- Removed the shared `local-or-unconfigured-proxy` / `unknown` IP fallback.
- Local development/test retains per-email/reset-token limits without an IP bucket.
  Vercel requires one validated platform-provided IP, canonicalizing IPv6 spellings.
  Unsupported production hosts or invalid/missing trusted IPs return a safe 503;
  caller-supplied forwarded headers cannot bypass that check.
- Added four regression tests for independent clients, same-IP enforcement, retained
  local email limits, invalid production configuration and equivalent IPv6 addresses.
- Verification: all 25 tests passed against isolated temporary MongoDB, without
  accessing Atlas or sending email. `npm run check` also passed: lint, TypeScript
  and production build. `git diff --check` passed.
- Updated authentication notes, environment example and study Q&A Q11/Q14/Q15.
  Q15 documents exact check ordering, thresholds, storage and fixed-window semantics.
- No commit made. Vercel deployment and real browser/mobile checks remain pending.

## 09 — 1 November 2026: authentication knowledge-transfer guide

- Added `AUTH_STUDY_GUIDE.md` with high-level frontend/Angular comparisons and
  detailed backend terminology, boundaries, data models, file/function reference,
  signup/login/session/logout/reset flows, concurrency protection and rate limits.
- Included HTTP/error contracts, troubleshooting, test coverage and study exercises.
  Explained implementation limits explicitly; excluded visual-design discussion.
- Linked from README, setup notes, learning Q&A and implementation status.
- Documentation-only work: checked local links, referenced paths and source behaviour;
  did not rerun application tests or change auth behaviour.

## Template for subsequent entries

Copy this structure when appending a milestone above this template:

```markdown
## NN — Day Month Year: feature or fix

- Change and user-visible result:
- Scope/decisions:
- Affected files or feature guide:
- Verification actually performed and outcome:
- Remaining work or dependencies:
```

