# Make My Marriage

Initial application skeleton for the wedding-management product described in [docs/PRD.md](docs/PRD.md). The four design documents remain the product baseline.

## Run locally

Use Node.js 22.17 or newer and npm. Install dependencies with `npm ci`, then run `npm run dev` and visit http://localhost:3000. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

The landing page needs no external credentials. Copy `.env.example` to `.env.local` when configuring services; never commit credentials. Database configuration is validated only when `connectDatabase()` is called. The skeleton does not call it, create collections, or seed data.

## Checks

- `npm run lint` — ESLint and Next.js rules.
- `npm run typecheck` — generate route types and check strict TypeScript.
- `npm run build` — production build.
- `npm run check` — all three checks in sequence.
- `npm start` — serve a completed production build.

## Organisation

```text
src/app/          Pages, layouts, and thin REST Route Handlers
src/modules/      Domain services, schemas, models, repositories, and feature UI
src/server/       Server-only configuration, connections, HTTP helpers, adapters
src/components/   Reusable presentation components
src/lib/          Browser-safe shared utilities
tests/            Future cross-module integration and end-to-end checks
```

Route groups reserve auth, onboarding, dashboard, and public surfaces. Empty directories are tracked with `.gitkeep`; they do not create accessible routes. Domain directories follow the discussed architecture and are populated feature by feature. No dashboard is exposed before authentication exists.

Services own business rules; repositories own scoped persistence. Private wedding context must come from current membership. Cross-module access uses explicit server functions rather than another module's model. Client components must never import database code, server configuration, or provider SDKs. Shared Zod schemas and public DTOs should remain browser-safe.

`src/server/db/connection.ts` caches the connection promise across hot reloads and concurrent calls, resets failed attempts, and avoids exposing connection strings in errors. It is infrastructure only; domain models arrive with features. Database code uses the Node.js runtime.

`src/server/http` provides data and application-error response helpers. Future handlers must validate input with Zod, enforce authentication/authorization, and map errors through these helpers. No application API endpoints are implemented yet.

## Current scope

Included: landing page, root layout, loading/error/not-found states, Tailwind CSS v4, strict TypeScript, linting, environment template, connection utility, HTTP conventions, and folder boundaries.

Not implemented yet: authentication, membership, wedding creation, CRUD features, email jobs, external integrations, guest pages, and photo uploads. Environment placeholders for future integrations are intentionally unused. No tests claim to validate those features.

Next functional increment follows PRD Phase 1: authentication, wedding creation, wedding membership, and the protected dashboard shell. Tailwind CSS is the styling foundation; no component library, authentication provider, queue, or testing framework has been introduced.

## Styling

Tailwind CSS v4 runs through @tailwindcss/postcss. Shared colour and font tokens live in the @theme block in src/app/globals.css. Use utility classes in components; reserve global CSS for theme tokens and base styles. No Tailwind JavaScript config is needed for this setup.


## Lint dependency compatibility

ESLint is pinned to 9.39.5 because the React, import, and accessibility plugins bundled with eslint-config-next 16.4.3 declare peer support through ESLint 9. Next.js documents ESLint 10 support with peer-metadata warnings, but this scaffold uses the shared declared range so dependency validation succeeds without overrides or legacy-peer-deps.

ESLint 9 is deprecated upstream. This is a temporary development-tool compatibility pin, not a long-term supported-version choice. Revisit ESLint 10 when the bundled plugins declare compatible peer ranges. Keep the Next.js lint presets and verify with npm ls and npm run check when upgrading.
