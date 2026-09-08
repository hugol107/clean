# CleanTap

Real-time cleaning operations, verified by a tap. A multi-tenant SaaS for hotels, airports,
shopping centres, offices, hospitals and facility-management companies to track cleaning
operations via NFC/QR "Tap In / Tap Out", with live dashboards, SLA compliance, analytics,
checklists, incidents and RBAC.

**"CleanTap" is a placeholder name.** Branding lives in one place — see [Rebranding](#rebranding).

## Table of contents

- [Architecture](#architecture)
- [Database schema](#database-schema)
- [What's implemented](#whats-implemented-phase-1-mvp)
- [Demo credentials](#demo-credentials)
- [Run it locally](#run-it-locally)
- [Google Sign-In](#google-sign-in)
- [Deploying](#deploying)
- [Testing](#testing)
- [Phase 2 / Phase 3](#phase-2--phase-3-not-in-this-mvp)
- [Key technical decisions](#key-technical-decisions)
- [Project structure](#project-structure)
- [Rebranding](#rebranding)

## Architecture

- **Framework**: Next.js 15 (App Router), TypeScript (strict), React 19.
- **UI**: Tailwind CSS v4 + hand-rolled shadcn/ui-style primitives (Radix UI underneath),
  `recharts` for charts, PWA-installable (manifest + a conservative offline app-shell service worker).
- **Data**: PostgreSQL via Prisma ORM 7 (the new `prisma-client` generator + `@prisma/adapter-pg`
  driver adapter — see [Key technical decisions](#key-technical-decisions)).
- **Auth**: Auth.js v5 (`next-auth`), credentials (email + password) always on, magic-link email
  and Google sign-in each auto-enabled when their env vars are present (see
  [Google Sign-In](#google-sign-in)). JWT sessions. Prisma adapter for account/verification-token
  storage.
- **Business logic layering**: `src/server/services/*` (pure business logic + Prisma queries) →
  `src/server/actions/*` (Next.js Server Actions: Zod validation + RBAC/tenant checks + calls the
  service + `revalidatePath`) → pages/components. Route Handlers under `src/app/api/*` are used
  only where a Server Action doesn't fit (file downloads, a polling endpoint, NextAuth's own routes).
- **Multi-tenancy**: every operational table carries `organizationId` directly. Every service
  function scopes its query by it. `src/lib/tenant.ts` (`requireOrgAccess`, `requirePermission`,
  `assertSiteAccess`) is the single enforcement point — see
  [Security](#key-technical-decisions) below for why this, not the UI, is the real boundary.
- **RBAC**: table-driven permissions in `src/lib/rbac.ts` (one map of `permission -> roles[]`),
  used identically by UI (hide/disable) and server enforcement.

## Database schema

Prisma schema at [`prisma/schema.prisma`](prisma/schema.prisma). Core entities:

```
Organization
 ├─ OrganizationMembership (User × role) ── MembershipSiteAssignment (scopes SITE_MANAGER/SUPERVISOR)
 ├─ Site (a hotel / airport / mall)
 │   └─ Area (a floor / zone)
 │       └─ Location (a room / restroom / lobby…)
 │            ├─ NFCTag (secure random token, never the DB id)
 │            ├─ ChecklistTemplate ── ChecklistItem
 │            ├─ CleaningTask (scheduled/assigned work)
 │            └─ CleaningSession (the Tap In / Tap Out record)
 │                 ├─ ChecklistResponse
 │                 ├─ Issue ── Attachment
 │                 └─ (ActiveLocationLock — see below)
├─ Notification
└─ AuditLog (append-only)
```

Notable design choices, spelled out because they're not obvious from the DDL alone:

- **Location status is never stored.** "Clean / Due Soon / Overdue / Cleaning / Issue" is computed
  on every read from the last completed session + the location's target frequency
  (`src/lib/sla.ts` → `computeLocationStatus`). One source of truth, no cache-invalidation bugs.
- **`ActiveLocationLock`** — a tiny table with `locationId` as its primary key. Starting a
  cleaning inserts a row here in the same transaction as the `CleaningSession`; finishing deletes
  it. Because `locationId` is the primary key, the database itself rejects a second concurrent
  Tap In on the same location (unique-constraint violation → a friendly "already being cleaned"
  error) instead of relying on a check-then-insert race.
- **Soft delete**: reference/config entities (`Location`, `Site`, `EmployeeProfile`,
  `ChecklistTemplate`) use `isActive` rather than hard deletes, so historical `CleaningSession`/
  `AuditLog` rows never dangle.
- **`AuditLog`** is append-only and generic (`entityType` + `entityId` + before/after JSON). Every
  service mutation that touches history (starting/completing/cancelling/editing a session, tag
  reassignment, role changes, issue status changes…) writes one.

## What's implemented (Phase 1 / MVP)

Everything in the brief's "Definition of Done" flow works end-to-end against a real Postgres
database (verified with `npm run test` and a live smoke test of every page — see
[Testing](#testing)):

- **Auth**: register (creates a user + organization + `ORG_ADMIN` membership in one step),
  credentials login, optional magic-link, role-aware post-login redirect (`/super-admin`,
  `/dashboard`, or `/w`).
- **Multi-tenant orgs**: Organization → Site → Area → Location, with an org switcher and
  site-scoped access for `SITE_MANAGER` / `SUPERVISOR`.
- **RBAC**: `SUPER_ADMIN` (platform-wide, `/super-admin`), `ORG_ADMIN`, `SITE_MANAGER`,
  `SUPERVISOR`, `CLEANER` — see `src/lib/rbac.ts` for the exact permission matrix.
- **NFC/QR Tap In / Tap Out**: `/t/{secure-token}` resolves a tag, shows "Start Cleaning" (idle),
  redirects straight to the active-cleaning screen if this worker already has it open, or shows a
  neutral "someone else is cleaning this" screen. Duration is always computed from server
  timestamps, never trusted from the client.
- **NFC Tag management**: generate, assign/reassign, disable (lost/compromised), replace
  (issues a fresh token, marks the old one `REPLACED`), printable QR label page.
- **Worker mobile UI** (`/w`): today's stats, active-task card, task list, a dedicated
  active-cleaning screen (live timer, checklist, Finish, Report Issue), history.
- **Manager dashboard**: KPI-first home screen, **Live Operations** (polls `/api/live` every 8s,
  color-coded by elapsed-vs-target), Locations (list + building/floor operational map + detail with
  timeline & charts + bulk-create for "Room 101–140"-style ranges), Employees (roster + normalized,
  context-carrying performance view — see below), Tasks, Issues (with High/Critical → immediate
  in-app notification to managers), Checklists, NFC Tags, Sites, Users, Settings, global Search.
- **Analytics**: KPIs (total/median/average duration, SLA %, issue rate, frequency compliance) +
  8 charts + 2 comparison tables, filterable by site/location type/employee/date-range, all
  reflected in the URL.
- **Reports**: 6 CSV exports (Daily Cleaning, Employee Activity, Location Performance, SLA
  Compliance, Issues, Cleaning Hours).
- **Checklists**: reusable templates, required vs optional items, enforced before "Finish Cleaning".
- **Issues**: type/severity/description/photo, status workflow (Open → Acknowledged/In Progress →
  Resolved/Dismissed), immediate manager notification for High/Critical.
- **SLA / metrics engine** (`src/lib/sla.ts`): location status, **Efficiency Index**
  (`actual/expected` duration, presented as a trend — never as a verdict on the worker),
  **Frequency Compliance**, and simple rule-based **anomaly flags** (session < 30s, session > 3×
  target) that surface as "review recommended" and never block the worker.
- **Privacy by default**: geolocation is off unless the organization sets "Optional" or
  "Required" (`Settings → Privacy`); when off, the server strips any location data the client
  sends, regardless of what the client sends — this is enforced server-side, not just hidden in
  the UI.
- **PWA**: installable, app-shell service worker (caches only static assets + an offline
  fallback page — see the comment in `public/sw.js` for why it deliberately never caches API
  responses or dashboard data).
- **Demo data**: `prisma/seed.ts` — 1 organization, 3 sites, 40 locations, 6 employees + 3
  managers/supervisors, ~780 historical cleaning sessions across the last 30 days, 2 live "in
  progress" sessions, 5 tasks, 8 issues across all severities.
- **Tests**: `tests/*.test.ts` (Vitest) — session start/complete, duplicate-Tap-In prevention
  (same location and same employee), server-authoritative duration, anomaly flagging, NFC token
  resolution (valid/disabled/unassigned/unknown), tenant isolation, SLA status computation,
  efficiency index, RBAC permission matrix. All run against a real database.

## Demo credentials

Password for every seeded account: **`cleantap123`**

| Role | Email | Notes |
|---|---|---|
| Super Admin | `super@cleantap.app` | Platform console at `/super-admin`, no org membership |
| Org Admin | `admin@cleanco.com` | Full access to "CleanCo Facilities" |
| Site Manager | `manager@cleanco.com` | Scoped to Grand Hotel Madrid |
| Supervisor | `supervisor@cleanco.com` | Scoped to Madrid Airport Terminal 2 |
| Cleaner | `cleaner1@cleanco.com` … `cleaner6@cleanco.com` | `cleaner1` = Maria López, `cleaner2` = Ana Ruiz, etc. |

To try the NFC flow without a physical tag: open **NFC Tags** in the dashboard, click the
overflow menu on any row → **Print label**, and open the printed page's QR code (or just copy its
URL) on your phone while signed in as a cleaner.

## Run it locally

**Prerequisites**: Node.js 20+, Docker (for local Postgres) — or any Postgres 14+ connection string.

```bash
npm install
cp .env.example .env          # Windows: Copy-Item .env.example .env
docker compose up -d          # starts Postgres on localhost:5433
npx prisma migrate dev        # creates the schema
npm run db:seed               # loads demo data (safe to re-run — history won't duplicate)
npm run dev
```

Open <http://localhost:3000>. Sign in with any account from [Demo credentials](#demo-credentials),
or click **Start free** to register your own organization from scratch and walk through
`/onboarding`.

Other useful scripts: `npm run test`, `npm run lint`, `npm run build`, `npm run db:studio`
(Prisma Studio, a GUI over the database).

If port 5433 or 3000 is already taken on your machine, change the mapped port in
`docker-compose.yml` / `DATABASE_URL`, or run `next dev -p <port>`.

## Google Sign-In

Optional — the app works fully on email + password without it. When configured, a
**"Continue with Google"** button appears on `/login` and `/register`, and managers get a
**Google account** option (no password) alongside **Password** when creating a worker
(`/employees/new`) or inviting a manager/supervisor (`Users → Invite user`) — the person then
signs in with that exact Google email instead of being given a temporary password.

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an OAuth
   2.0 Client ID (**APIs & Services → Credentials → Create Credentials → OAuth client ID**,
   application type **Web application**).
2. Add an **Authorized redirect URI**:
   - Local dev: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
3. Copy the generated Client ID and Client Secret into `.env` (or your Vercel project's
   environment variables):
   ```
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   ```
4. Restart the dev server (env vars are read at startup).

**How account linking works:** a Google sign-in is matched to an existing `User` row by email
(`allowDangerousEmailAccountLinking: true` in `src/auth.ts`) — safe specifically because Google
verifies the email during its own OAuth handshake, so nobody can complete it for an address they
don't control. That's what makes "manager invites `worker@gmail.com` with no password, worker
later clicks Continue with Google" resolve to the *same* account instead of a duplicate.

**A fresh Google sign-in with no invite and no organization yet** (someone who clicked "Continue
with Google" straight from `/register`) lands on `/onboarding`, which asks for just a company
name — there's no password to collect, so it skips the `/register` form entirely
(`src/server/actions/organizations.ts` → `createOrganizationForSelfAction`).

**Caveat:** if a manager mistypes the Gmail address when inviting someone by Google account,
that person can never sign in (no password to fall back to, and Google OAuth requires owning the
real inbox) — there's no "add a password later" recovery UI yet. Re-inviting with the corrected
email is the workaround today.

## Deploying

**Frontend/backend — Netlify (what production actually runs today):**

- `netlify.toml` declares the build command, Node 22, and `@netlify/plugin-nextjs`, which turns
  every page/route handler into a real server function (without it, Netlify has nothing telling it
  this needs SSR support, and a deploy will silently ship as a static file upload — every route
  404s, since there's no static HTML for any of them; this project has no static pages).
- Database: uses Netlify's own auto-provisioned Postgres (`@netlify/database`) rather than a
  separately hosted one, so there's nothing to sign up for. `src/lib/db.ts` and
  `scripts/netlify-db-setup.ts` fall back to it only when `DATABASE_URL` isn't set — set
  `DATABASE_URL` explicitly (Neon, Supabase, RDS...) to use a different Postgres instead, same as
  the Vercel path below.
- `package.json`'s `postinstall` deliberately does **not** always run `prisma generate` — see
  `scripts/conditional-prisma-generate.mjs`. `prisma.config.ts` reads `DATABASE_URL` eagerly and
  throws if it's completely unset, which it is during `npm install` on a fresh Netlify build (no
  `.env` file exists there, and Netlify's own database is resolved via a JS function call, not a
  pre-set variable). `scripts/netlify-db-setup.ts` runs `prisma generate` itself instead, as part
  of the build command, right after resolving a real connection string.
- **Gotcha that cost real time:** if you set `AUTH_SECRET` (or any variable) via Netlify's API/CLI
  with `is_secret`/"sensitive variable" turned on, it does not reach the deployed function's
  runtime even though it's visibly saved on the site — the function fails with Auth.js's
  `MissingSecret` error, which only shows up in **Site → Logs → Functions**, not in the build log.
  Set secrets as plain (non-"sensitive") environment variables with `functions`/`runtime` in their
  scopes instead.

**Frontend/backend — Vercel:**

1. Push this repo to GitHub and import it in Vercel.
2. Set the environment variables from `.env.example` in the Vercel project settings — at minimum
   `DATABASE_URL`, `AUTH_SECRET` (generate with `npx auth secret`), and `NEXTAUTH_URL` (your
   production URL).
3. Set `STORAGE_DRIVER=s3` and the `S3_*` variables (see below) — Vercel's filesystem is
   read-only/ephemeral, so `STORAGE_DRIVER=local` will not work in production.
4. Run `npx prisma migrate deploy` against the production database once (locally with production
   `DATABASE_URL`, or as a one-off Vercel deploy step) before the first request.

**Database — Neon or Supabase (either works well with the Prisma driver-adapter setup used here):**

- Create a Postgres project, copy its connection string into `DATABASE_URL`.
- If your provider gives you both a pooled and a direct connection string (Neon's pooler, or
  Supabase's port-6543 pooler), use the **direct** (unpooled) one for `DATABASE_URL` — this
  version of `prisma.config.ts` only reads a single `url`, so migrations and the app share one
  connection string. (A separate `directUrl` for migrations is a Prisma config option in some
  versions but isn't part of the datasource type in the exact Prisma 7.10 release pinned here;
  revisit this if you upgrade Prisma.)

**File storage — S3-compatible (Supabase Storage, AWS S3, Cloudflare R2, MinIO):**

- Supabase Storage exposes an S3-compatible endpoint per project
  (`https://<project>.supabase.co/storage/v1/s3`) — create a bucket, generate an access key pair
  in the Supabase dashboard, and fill in the `S3_*` variables in `.env.example`.
- Any other S3-compatible provider works the same way; see `src/lib/storage.ts`.

## Testing

```bash
npm run test
```

Runs Vitest against a real database (uses `DATABASE_URL` from `.env`, same as the app). Each test
file creates its own throwaway organization (`tests/helpers/fixtures.ts`) and tears it down in
`afterAll` — safe to run repeatedly against your dev database without touching the seeded demo
data. See [What's implemented](#whats-implemented-phase-1-mvp) for what's covered.

## Phase 2 / Phase 3 (not in this MVP)

Explicitly out of scope for the reasons given in each case — the architecture was chosen so none
of these require a rewrite:

- **Offline sync** — the PWA installs and caches its static shell today; a worker's Tap In/Out
  still needs a live connection. Adding a queued-write outbox (IndexedDB + Background Sync API,
  reconciled against the server's authoritative timestamps) is the natural extension; see the
  comment block at the top of `public/sw.js`.
- **Scheduled overdue notifications** ("12 locations are overdue") — the `Notification` model and
  the in-app delivery path already exist (see `src/server/services/notifications.ts`); what's
  missing is a periodic job (Vercel Cron or similar) that scans for newly-overdue locations/tasks
  and calls it. Issue and session-anomaly notifications already fire in real time today.
- **Push / email / WhatsApp / SMS / Slack notification channels** — the `Notification.type` model
  is channel-agnostic by design; only the delivery adapters remain to be added.
- **CSV/bulk import of locations** — bulk *creation* by numeric range ("Room 101–140") is
  implemented; importing an arbitrary spreadsheet is not.
- **PDF reports** — CSV export is implemented for all 6 report types; PDF rendering is not.
- **Richer anomaly detection** — "many Tap-Ins without Tap-Out", "tag used anomalously", "task
  repeatedly overdue" are not implemented; the too-short/too-long session rules are, in the same
  engine (`src/lib/sla.ts` → `detectSessionAnomalies`), so adding more rules is additive.
- **Enterprise SSO (SAML/OIDC per organization)** — Google Sign-In is implemented (see
  [Google Sign-In](#google-sign-in)); a per-organization identity provider (Okta, Azure AD, a
  generic SAML connector) is not — Auth.js supports adding one as another provider in `src/auth.ts`
  following the same pattern.
- **Billing/Stripe, public API, audit-log viewer UI, Teams (grouping employees beyond
  site-scoping)** — schema/plan-limits scaffolding exists (`Organization.plan`,
  `ORG_PLAN_LIMITS` in `src/lib/constants.ts`) but nothing is wired to a payment provider or an
  external IdP.

## Key technical decisions

- **Prisma 7's new driver-adapter architecture.** This project was scaffolded against
  Prisma 7.10 (current stable at build time), which replaced the old bundled Rust query engine
  with an explicit driver-adapter model (`@prisma/adapter-pg` + `pg`) and moved the database URL
  out of `schema.prisma` into `prisma.config.ts`. `src/lib/db.ts` holds the singleton client.
- **Next.js 15, not 16.** `create-next-app@latest` resolved to Next 16 initially; it was pinned
  back to 15 deliberately, since 16 was extremely new relative to the rest of the stack (NextAuth,
  the Prisma adapter) and the risk/benefit didn't favor being on the bleeding edge for a
  production-facing app. Revisit this once the ecosystem catches up.
- **Auth.js v5's config is split into `src/auth.config.ts` (edge-safe: no Prisma, no bcrypt) and
  `src/auth.ts` (full config, Node runtime).** `src/middleware.ts` builds its own lightweight
  `NextAuth(authConfig)` instance from the edge-safe half. This is the standard fix for a
  well-known problem: Next.js Middleware runs on the Edge runtime, which can't bundle the
  Postgres driver, but a Credentials provider's `authorize()` needs Prisma + bcrypt. Verifying a
  JWT session cookie only needs `AUTH_SECRET`, so the split costs nothing at runtime.
- **Server Actions are the default mutation path**; Route Handlers under `src/app/api/*` exist
  only for the NextAuth catch-all, CSV file downloads (`Content-Disposition` needs a real HTTP
  response), and the Live Operations polling endpoint. This is a deliberate, narrower surface
  than "one API route per resource" — see [API design](#project-structure) below for what that
  means in practice.
- **Security is enforced server-side, unconditionally** (spec requirement, and good practice
  regardless): every Server Action and Route Handler calls `requireOrgAccess` /
  `requirePermission` from `src/lib/tenant.ts` before touching data; every service function
  additionally scopes its own Prisma queries by `organizationId`. The frontend hides controls the
  current role can't use, but that's a UX nicety, not the boundary — `tests/tenant-isolation.test.ts`
  proves the actual boundary holds even if a request bypasses the UI entirely.
- **A validated, accessibility-checked color palette for charts**, kept deliberately separate
  from the app's UI badge/status colors (`src/lib/chart-colors.ts` vs. the `--status-*` tokens in
  `src/app/globals.css`) — chart marks need harder colorblind-safety guarantees than a small
  badge that's always paired with a text label.
- **No client-supplied timestamps or durations are ever trusted.** `CleaningSession.durationSeconds`
  is always `completedAt - startedAt` computed with `new Date()` on the server, inside the same
  request that persists it.

## Project structure

```
prisma/                   schema.prisma, migrations, seed.ts
src/
  app/                    routes (App Router)
    (app)/                the manager/supervisor dashboard shell (sidebar + header)
    w/                     the worker mobile app
    t/[token]/              NFC/QR tap resolution (public URL, requires login)
    labels/[tagId]/        printable QR label
    api/                    NextAuth, /api/live (polling), /api/reports/[type] (CSV)
  components/
    ui/                     shadcn-style primitives (button, card, table, dialog, …)
    charts/                 recharts wrappers using the validated palette
    layout/, worker/, forms/, dashboard/
  lib/                      cross-cutting: auth config, RBAC, SLA engine, tenant guards,
                            storage abstraction, csv/qrcode helpers, constants
  server/
    services/               business logic + Prisma queries, one file per domain
    actions/                 Server Actions: validate (Zod) → authorize → call a service
  generated/prisma/         Prisma Client output (gitignored, regenerate with `npx prisma generate`)
tests/                      Vitest suite + fixtures
```

Conceptual API surface (spec section 33) — implemented as the Server Actions / Route Handlers
below rather than a REST-style `/api/*` tree for every resource, since Server Actions give the
same "clean, typed operation per use case" contract with less boilerplate in a Next.js app:

| Concept | Implementation |
|---|---|
| `POST /api/cleaning/start` | `startCleaningFromTagAction` (`src/server/actions/cleaning.ts`) |
| `POST /api/cleaning/complete` | `completeCleaningAction` |
| `GET /api/locations/:id` / `:id/history` | `getLocationDetail` / `getLocationTimeline` (`src/server/services/locations.ts`), called from `app/(app)/locations/[id]/page.tsx` |
| `GET /api/analytics/overview` | `getAnalyticsOverview` (`src/server/services/analytics.ts`) |
| `POST /api/issues` | `reportIssueAction` (`src/server/actions/issues.ts`) |
| Live operations polling | `GET /api/live` (real Route Handler — a client component polls it) |
| CSV exports | `GET /api/reports/[type]` (real Route Handler — needs `Content-Disposition`) |

## Rebranding

Every user-facing string reads from one place:

- **Name**: `APP_NAME` env var (`src/lib/constants.ts`), used in page titles, the sidebar, the
  PWA manifest, and email templates.
- **Logo/mark**: `public/icons/icon.svg` (+ the pre-rendered PNGs beside it) and the inline "CT"
  monogram in `src/app/(app)/layout.tsx` / `src/components/auth-shell.tsx` / `src/app/w/layout.tsx`
  — swap the SVG and those three inline monograms for a real logo component.
- **Colors**: `src/app/globals.css` (`--primary`, `--status-*` and friends) for UI chrome, and
  `src/lib/chart-colors.ts` for charts — see [Key technical decisions](#key-technical-decisions)
  for why those two are intentionally separate.
- **Domain**: `NEXTAUTH_URL` env var is the only place the app's own URL is assumed.
