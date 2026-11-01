# Implementation status

Last updated: 1 November 2026.

Start here to understand what is actually built. This file records current status;
[IMPLEMENTATION_LOG.md](IMPLEMENTATION_LOG.md) records the sequence of work.
The initial entries were reconstructed from the code and project conversation;
they are not a commit-by-commit history.

## Goal and scope

Learn the complete full-stack process, from requirements through deployment,
by building Make My Marriage one feature at a time. Use the instructor's Stitch
visual direction and keep functionality within the agreed V1 scope.

Requirements and architecture: [PRD](PRD.md), [system design](SYSTEM_DESIGN.md),
[database design](DATABASE_DESIGN.md), [API design](API_DESIGN.md).
This tracker records delivery against those documents; it does not add requirements.

## Current delivery

| Area | Implementation | Verification / remaining work |
| --- | --- | --- |
| Requirements and architecture | Baseline documents and modular monolith structure established | Recheck the relevant requirements before each feature; reserved folders do not mean features exist |
| Initial scaffold | Next.js App Router, React, strict TypeScript, route groups, loading/error/not-found pages, environment template | Lint, typecheck and production build passed during auth work |
| Styling | Tailwind CSS v4, Royal Heritage green/gold/ivory tokens, local Playfair Display and Manrope fonts | Homepage implemented; font preload optimisation remains a follow-up |
| Database infrastructure | Cached Mongoose connection, safe configuration errors, auth schemas/indexes/transactions | Atlas connected using ignored `.env.local`; database `make_my_marriage`; live HTTP auth checks passed |
| Homepage | Responsive navigation, hero, feature sections, interactive sample previews, invitation dialog, signup/login links | Prior homepage review completed; sample data is illustrative, not persisted |
| Auth screens | Signup, login, forgot password, reset password; field validation, password visibility, pending/error/success states | Desktop signup visually inspected; full browser walkthrough and mobile checks remain pending |
| Auth backend | Signup, login, logout, current user, forgot/reset password; password hashing, cookie sessions, validation, origin checks, corrected rate limits | 25 automated tests passed after rate-limit correction; earlier live Atlas HTTP checks passed; real email remains pending |
| Reset email | Server-side Resend adapter and single-use expiring reset links | Needs service configuration and actual inbox-delivery verification |
| Onboarding | Protected welcome placeholder after signup/login without a wedding | Wedding creation form and persistence are not implemented |
| Dashboard | Protected placeholder for existing wedding members | Full dashboard features are not implemented |
| Membership context | Read-only membership/wedding lookup for auth redirects | Membership creation, management and invitation acceptance are not implemented |
| Other wedding features | Not implemented | Events, guests/RSVP, tasks, photos and public wedding experiences remain future work under the PRD |
| Deployment | Not completed | Hosting, production configuration and deployed smoke tests remain pending |

“Implemented” means code exists. It does not mean a feature has been verified with
live services or deployed. No production-readiness claim is implied by a passing build.

## Code and documentation map

| Location | Responsibility |
| --- | --- |
| `src/app` | Pages, layouts and thin REST route handlers |
| `src/components/home` | Homepage presentation and fictional preview data |
| `src/modules/auth` | Auth UI, schemas, models, repository, service and handlers |
| `src/modules/members`, `src/modules/wedding` | Read-only context needed by auth |
| `src/server/db`, `src/server/config`, `src/server/http` | Database connection, configuration and error/response conventions |
| `src/server/auth`, `src/server/security`, `src/server/email` | Session guards, security helpers and reset email adapter |
| `tests` | Auth integration/configuration tests and server-only test shim |
| [HOMEPAGE.md](HOMEPAGE.md) | Selected Stitch screen, homepage scope and component map |
| [AUTHENTICATION.md](AUTHENTICATION.md) | Auth flow, security decisions and service setup |
| [AUTH_STUDY_GUIDE.md](AUTH_STUDY_GUIDE.md) | Backend-focused auth knowledge transfer, frontend Angular comparisons, file/function reference and exercises |
| [LEARNING_QA.md](LEARNING_QA.md) | Short explanations from learning discussions |

## Auth routes delivered

- Screens: `/signup`, `/login`, `/forgot-password`, `/reset-password?token=...`.
- APIs: `POST /api/auth/signup`, `/login`, `/logout`, `/forgot-password`, `/reset-password`;
  `GET /api/auth/me`.
- Protected destinations: `/onboarding` without a wedding, `/app` with an existing membership.

## Verification record

Latest recorded auth implementation run (before this documentation update):

- `npm test`: **21 tests passed** in two files. Uses an isolated temporary MongoDB
  replica set, never the user's database. Covers persistence, duplicate/concurrent
  signup, login/logout, expiry, reset-token reuse/concurrency, session invalidation,
  membership context, validation, origin checks, rate limits and configuration.
- `npm run check`: **passed** (ESLint, strict TypeScript and production build).
- Browser: desktop signup layout inspected. Complete mobile and live-service
  browser acceptance testing is **not yet recorded as passed**.
- Actual Resend delivery and production deployment: **not tested**.

These are historical results, not checks automatically rerun whenever this file changes.

1 November 2026 — live Atlas configuration and HTTP smoke check:

- Connected the local Next.js app to Atlas database `make_my_marriage` using ignored
  `.env.local`; no credentials are stored in tracked files.
- All four auth pages returned successfully. Unauthenticated onboarding returned
  Next.js's streamed login redirect; authenticated onboarding rendered successfully.
- Signup, current-user lookup, duplicate-email rejection, wrong-password rejection,
  login and logout/session revocation passed against Atlas.
- Password reset, old-password rejection, new-password login, session revocation
  and reset-token reuse rejection passed. A token was seeded only for the disposable
  test user to test reset persistence without an email provider.
- Missing Resend configuration correctly returned 503 for forgot password.
- Removed the disposable test user and their sessions/reset records. Rate-limit
  buckets remain subject to their normal TTL expiry.
- This was real HTTP and database verification, not a completed interactive browser
  walkthrough or actual email-delivery test. No application code changes were needed.

## Pending work in order

1. Rotate the database password shared in chat and update ignored `.env.local`.
2. Configure `RESEND_API_KEY` and `EMAIL_FROM` for reset email (`APP_URL` is configured locally).
3. Complete desktop/mobile browser acceptance: signup → onboarding → logout →
   login; invalid/duplicate inputs; protected redirects; inbox reset link → new
   password → old sessions rejected. Record outcomes here.
4. Build wedding creation and initial membership, using the existing architecture
   and the relevant PRD/API/database requirements.
5. Continue the remaining V1 features incrementally, then deployment.

MongoDB needs a connection string, not an API key. Never put actual credentials
in these documents. Setup instructions are in [AUTHENTICATION.md](AUTHENTICATION.md).

## Scope decisions and known follow-ups

- Auth review correction (1 November): removed the shared non-Vercel client bucket.
  Local development/test keeps email/token limits; Vercel additionally uses validated
  per-IP limits. Missing/invalid trusted production IP configuration fails with 503.
  Four regression tests added; all 25 tests and lint/type/production-build checks
  passed. Production on another host
  requires a trusted client-IP implementation first. See learning Q&A Q15 for the flow.

- Royal Heritage is the selected Stitch direction. The selected project had no
  dedicated auth screens; the user approved designing them with matching styling.
- Homepage excludes room allocation/accommodation, transport, dietary preferences,
  budgets/payment schedules, automated WhatsApp, live feeds and gift/UPI registries.
  See the homepage notes for the complete recorded presentation decisions.
- Social login and email verification are not part of the implemented auth flow.
- Dark Reader attributes were visible in the reported hydration mismatch; extension
  interference is the suspected cause. A controlled reproduction/resolution is not
  recorded, so this is not marked as a confirmed application fix.
- The mobile signup navigation now closes the menu; dark-section keyboard focus
  styling was improved during auth integration.
- Local font preload size remains an optimisation opportunity, not a completed fix.

## Maintenance rule

At the end of each feature or meaningful fix:

1. Update the affected status row and pending work.
2. Append an entry to [IMPLEMENTATION_LOG.md](IMPLEMENTATION_LOG.md) with the actual
   date, change, affected paths, verification and outstanding items.
3. Update the feature-specific guide when behaviour or setup changes.
4. Separate code completion, automated checks, browser checks, live-service checks
   and deployment. Record failed or unrun checks honestly; do not infer success.

