# Make My Marriage

Wedding-management application described in [docs/PRD.md](docs/PRD.md), currently implementing the V1 homepage and authentication. The four design documents remain the product baseline.

Track progress in [implementation status](docs/IMPLEMENTATION_STATUS.md) for what is built, verified and pending, and [implementation log](docs/IMPLEMENTATION_LOG.md) for the delivery history from the initial scaffold onward. Update both after each feature or meaningful fix.

## Run locally

For beginner-friendly explanations from our project discussions, read the [full-stack learning Q&A](docs/LEARNING_QA.md). Add future frontend/backend learning questions there as they arise.

For a complete backend-focused walkthrough, read the [authentication study guide](docs/AUTH_STUDY_GUIDE.md), including frontend context for an Angular developer, every auth workflow, and the file/function reference.

Use Node.js 22.17 or newer and npm. Install dependencies with `npm ci`, then run `npm run dev` and visit http://localhost:3000. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

The homepage and auth screens render without external credentials. Copy `.env.example` to `.env.local` when configuring services; never commit credentials. Signup/login require `MONGODB_URI`; reset emails additionally require `RESEND_API_KEY`, `EMAIL_FROM` and `APP_URL`. See [authentication setup](docs/AUTHENTICATION.md). Auth requests create their collections/indexes when needed; there are no seeded users.

## Checks

- `npm run lint` — ESLint and Next.js rules.
- `npm run typecheck` — generate route types and check strict TypeScript.
- `npm run build` — production build.
- `npm run check` — all three checks in sequence.
- `npm test` — Vitest integration/configuration tests using an isolated temporary MongoDB replica set; email delivery is mocked.
- `npm start` — serve a completed production build.

## Organisation

```text
src/app/          Pages, layouts, and thin REST Route Handlers
src/modules/      Domain services, schemas, models, repositories, and feature UI
src/server/       Server-only configuration, connections, HTTP helpers, adapters
src/components/   Reusable presentation components
src/lib/          Browser-safe shared utilities
tests/            Authentication integration and configuration checks
```

Route groups organise auth, onboarding, dashboard, and public surfaces. Empty directories are tracked with `.gitkeep`; they do not create accessible routes. Domain directories are populated feature by feature. Onboarding and dashboard placeholders require authentication.

Services own business rules; repositories own scoped persistence. Private wedding context must come from current membership. Cross-module access uses explicit server functions rather than another module's model. Client components must never import database code, server configuration, or provider SDKs. Shared Zod schemas and public DTOs should remain browser-safe.

`src/server/db/connection.ts` caches the connection promise across hot reloads and concurrent calls, resets failed attempts, and avoids exposing connection strings in errors. Auth domain models live in `src/modules/auth`. Database code uses the Node.js runtime.

`src/server/http` provides data and application-error response helpers. Handlers validate input with Zod, enforce applicable authentication/authorization, and map errors through these helpers. Auth endpoints live under `/api/auth`.

## Current scope

Included: responsive Stitch-inspired V1 homepage, signup/login/forgot-password/reset-password screens in the approved Royal Heritage style, authentication APIs, hashed passwords and opaque sessions, reset email adapter, protected page guards, and integration tests. See [homepage notes](docs/HOMEPAGE.md) and [authentication notes](docs/AUTHENTICATION.md). Start planning opens signup. Homepage previews remain illustrative.

Not implemented yet: wedding creation, membership management, wedding CRUD features, background email jobs, guest pages, and photo uploads. Existing membership context is read only for authentication redirects. Local Atlas configuration and live HTTP auth checks are complete; real reset-email delivery still needs Resend configuration and verification. See the implementation tracker for pending browser checks.

Next functional increment: wedding creation and initial wedding membership. Tailwind CSS remains the styling foundation. Authentication is custom; Vitest tests persistence against a temporary MongoDB replica set.

## Styling

Tailwind CSS v4 runs through @tailwindcss/postcss. Shared colour and font tokens live in the @theme block in src/app/globals.css. Use utility classes in components; reserve global CSS for theme tokens and base styles. No Tailwind JavaScript config is needed for this setup.


## Lint dependency compatibility

ESLint is pinned to 9.39.5 because the React, import, and accessibility plugins bundled with eslint-config-next 16.4.3 declare peer support through ESLint 9. Next.js documents ESLint 10 support with peer-metadata warnings, but this scaffold uses the shared declared range so dependency validation succeeds without overrides or legacy-peer-deps.

ESLint 9 is deprecated upstream. This is a temporary development-tool compatibility pin, not a long-term supported-version choice. Revisit ESLint 10 when the bundled plugins declare compatible peer ranges. Keep the Next.js lint presets and verify with npm ls and npm run check when upgrading.
