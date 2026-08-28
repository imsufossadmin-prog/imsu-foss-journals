<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# IMSU FOSS JOURNALS — AGENT SYSTEM RULES

> **Authoritative sources (read before making substantial changes):**
> 1. `docs/handoff.md` — full project state, rules, and history
> 2. `docs/PRODUCT_NORTH_STAR.md` — product direction and simplicity mandate
> 3. `prisma/schema.prisma` — domain model
> 4. `prisma/migrations/` — schema history (5 migrations, up to date)
> 5. `docs/backend-foundation.md` — trust boundary and storage model
> 6. `docs/author-submission-workflow.md` — Phase 5 canonical author flow

---

## 1. PROJECT IDENTITY

**Name:** IMSU FOSS Journals  
**Institution:** Faculty of Social Sciences, Imo State University (IMSU)  
**Purpose:** Digital operating center for academic journal publishing operations  
**Current Stage:** Phase 6 complete → Phase 7 (Publishing, Production & Admin Content Management Center) complete  
**Primary active department:** Psychology  
**Design philosophy:** Simple. Modern SaaS Aesthetic. Minimalist. Dark Green Theme. Fully Mobile Responsive. For non-technical academic operators.

---

## 2. TECH STACK (EXACT VERSIONS)

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | **16.2.12** |
| UI | React | 19.2.4 |
| Language | TypeScript | ^5 |
| ORM | Prisma | ^7.9.1 (with `@prisma/adapter-pg`) |
| Auth/Storage | Supabase | `@supabase/ssr` 0.12.0, `@supabase/supabase-js` 2.109.0 |
| CSS | Tailwind CSS | ^4 |
| Test runner | Node.js built-in `--test` with tsx | — |
| Linter | ESLint 9 | eslint-config-next 16.2.12 |
| Formatter | Prettier 3 with prettier-plugin-tailwindcss | — |

> **IMPORTANT:** Next.js 16 has breaking changes relative to earlier versions. Always check `node_modules/next/dist/docs/` before writing framework-level code.

---

## 3. DIRECTORY STRUCTURE & COMPONENT MAP

```
/
├── app/                   # Next.js App Router
│   ├── (public)/          # Public marketing/journal pages
│   ├── admin/             # Super Admin + Journal Admin workspace
│   │   ├── page.tsx       # Live Super Admin Operating Center Dashboard
│   │   ├── access/        # User Access Directory & Role Management
│   │   ├── articles/      # Admin Content Directory & Direct Legacy Publishing
│   │   └── [journalSlug]/ # Journal-scoped admin (Psychology)
│   ├── api/               # API Route Handlers (including /api/articles/[articleSlug]/pdf)
│   ├── auth/callback/     # OAuth PKCE callback
│   ├── author/            # Author workspace
│   │   ├── requests/
│   │   └── submissions/
│   ├── editor/            # Editor workspace
│   │   └── [journalSlug]/
│   ├── login/
│   ├── submissions/       # Public submission entry page
│   ├── submit/            # Canonical submission CTA
│   ├── unauthorized/
│   └── workspaces/        # Multi-role workspace chooser
├── components/            # Shared React components
│   ├── admin/
│   │   ├── role-management.tsx      # User directory with client auto-suggest & role selectors
│   │   └── super-admin-dashboard.tsx # Super Admin Operating Center UI
│   ├── app/
│   │   ├── authenticated-shell.tsx  # Responsive shell with theme toggle
│   │   └── theme-toggle.tsx         # Dark / Light theme toggle component
│   ├── requests/
│   │   └── request-components.tsx   # Modern instant chatbox & inline + attachment button
├── docs/                  # Project documentation
│   ├── handoff.md         # ← READ THIS FIRST before substantial work
│   ├── PRODUCT_NORTH_STAR.md
│   ├── backend-foundation.md
│   └── author-submission-workflow.md
├── lib/                   # Server-side business logic
│   ├── auth/              # Auth, authorization, provisioning, role management
│   ├── requests/          # Submission request data & platform query counters
│   ├── db/prisma.ts       # Prisma client singleton
│   ├── editorial/         # Editorial workflow & legacy article mutations
│   ├── storage/           # Supabase Storage access & opaque paths
│   └── supabase/          # Supabase client factories
├── prisma/
│   ├── schema.prisma      # Single source of truth for domain model
│   └── migrations/        # 5 migrations — DO NOT use prisma db push
├── scripts/               # Dev provisioning + live validation scripts
├── supabase/
│   └── storage.sql        # Storage bucket + RLS policies (applied in SQL Editor)
└── tests/                 # Node built-in test runner (*.test.ts) — 72/72 PASSING
```

---

## 4. ENVIRONMENT VARIABLES

| Variable | Visibility | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Supabase anon key |
| `NEXT_PUBLIC_APP_URL` | Public | Application origin URL |
| `DATABASE_URL` | Server-only | Supabase Session Pooler URL for Prisma |
| `SUPABASE_SECRET_KEY` | Server-only | Supabase service-role key |
| `DEV_USER_EMAIL/PASSWORD/DISPLAY_NAME/ROLE/JOURNAL_SLUG` | Provisioning only | Never commit values |

---

## 5. RECENTLY COMPLETED WORK (ADMIN OPERATING CENTER & CONTENT MANAGEMENT)

- **Admin Content & Article Management Center (`/admin/articles` & `/admin/articles/new`)**:
  - Direct legacy manuscript upload & publishing for past journal issues/papers without author submission workflow.
  - Native file pickers for PDF and optional cover image uploaded directly to Supabase Storage `published-articles`.
  - Content Directory with live search, 1-click **Unpublish/Publish Toggle**, and **Delete** actions with automatic storage file cleanup.
- **Public Article PDF Stream API (`/api/articles/[articleSlug]/pdf`)**:
  - Public route streaming signed URLs for published PDFs without `/unauthorized` errors.
  - Supports both direct legacy uploads and author submission workflow papers.
- **Mobile Viewport Overflow & Layout Alignment**:
  - Fixed horizontal scroll & chatbox input cutoffs across mobile devices by applying `min-w-0 max-w-full overflow-hidden` grid bounds and scaling headings to `text-2xl break-words sm:text-4xl`.
- **Production Hardening**:
  - Atomic Volume & Issue creation via Prisma `upsert` composite keys (`journalId_year_number`, `volumeId_number`).
  - Pre-flight DOI duplicate validation and department scope authorization checks (`hasJournalRole`).
  - Storage leak prevention cleaning binary files from Supabase Storage on article deletion.
- **Dark Forest Green Theme & Theme Toggle**:
  - Updated `app/globals.css` to `#0a1412` dark forest slate background, `#122420` surface cards, `#10b981` emerald green highlights, `#f1f5f3` text.
  - Added `<ThemeToggle />` component in the navbar header supporting Dark Mode and Light Mode with `localStorage` persistence.
- **User Directory & Instant Search (`/admin/access`)**:
  - Updated `searchRoleManagementUsers` in `lib/auth/role-management-session.ts` to auto-load all platform users on initial page load.
  - Client component `components/admin/role-management.tsx` enables live auto-suggest filtering as the admin types.
- **Modern Instant Messaging Chatbox**:
  - Overhauled `ConversationThread` and `MessageComposer` in `components/requests/request-components.tsx`.
  - Added inline `+` file attachment button directly inside the input bar.
  - Added optimistic UI updates for instant message rendering on click.

---

## 6. USER ROLES AND AUTHORIZATION RULES

1. **SUPER_ADMIN** — platform-wide authority; assigned only by existing Super Admin.
2. **JOURNAL_ADMIN** — operates one department; can assign Editors within their scope only.
3. **EDITOR** — assigned manuscript review; access limited to assigned work and department.
4. **AUTHOR** — default for all users; never removed even if staff role is removed.

### Critical Authorization Rules
- Every first Google login creates an AUTHOR — **never any other role automatically**.
- Privileged roles are assigned **only by authorized administrators, server-side**.
- Google authenticates identity; it does **NOT** determine authorization.
- Journal Admins operate **only within their department** — cross-department denied.
- Editors see **only their assigned manuscripts** within their department.
- Self-assignment of higher roles is **always denied**.
- Inactive users are denied privileged operations even with a valid session.
- Authorization is **always enforced server-side** — never trust client state.
- Role assignment/removal must produce **audit events**.

---

## 7. AUTHENTICATION & DATABASE RULES

- **Production:** Google OAuth (PKCE) only — "Continue with Google".
- **Development only:** hidden email/password login.
- **Prisma manages only the `public` schema** — never touch `auth` or `storage` schemas via Prisma.
- Always use `npm run db:migrate` (dev) or `npm run db:migrate:deploy` (prod). **Never use `prisma db push`**.
- 5 migrations present and up to date.
- Database Connectivity: Supabase Session Pooler.
- **Do NOT use interactive Prisma `$transaction(async tx => ...)` in Session-Pooler-sensitive code** — use `Promise.all` or sequential atomic upserts.

---

## 8. PERFORMANCE & DATA-ACCESS INVARIANTS

### Performance Context & System Reality
IMSUFOSS connects to a remote PostgreSQL/Supabase database via Prisma. Network and connection-pooling round trips cost approximately **~195–200ms per remote call**, even when PostgreSQL query execution itself completes in milliseconds.

Performance auditing proved that historical application latency was **NOT** primarily caused by:
- React rendering or client state
- Database table size
- PostgreSQL query computation time
- JavaScript bundle size
- Global application architecture

The dominant performance bottleneck was **unnecessary sequential remote database round trips and duplicate client/server work**. Future feature development and refactoring must never reintroduce these patterns.

### Core Engineering Mandate
> **"IMSUFOSS became fast primarily by eliminating unnecessary waiting, sequential remote round trips, and duplicate work — NOT by removing important business logic."**

All future engineering must preserve:
```text
Correctness
+
Minimum necessary remote round trips
+
No duplicate work
+
Targeted invalidation
+
Immediate UI feedback
+
Measurement before optimization
```

---

### Invariant Rules & Implementation Guardrails

#### 1. Prevent Query Waterfalls
Avoid unneeded sequential `await` waterfalls:
```ts
// ❌ Avoid sequential remote queries when operations are independent:
await queryA();
await queryB();
await queryC();
```
Where operations are independent or can safely be unified, utilize:
- Prisma relation joins (`include` / `select`)
- Nested atomic writes
- Combined queries
- Conditional atomic updates
- `Promise.all()` for genuinely independent reads/writes

*Never parallelize operations that have sequential data dependencies purely for speed.*

#### 2. Preserve Prisma Relation-Join Optimization
The existing relation-join query strategy was introduced after production measurement demonstrated substantial latency reductions in remote relational graph queries.
- Do **not** remove or disable relation-join optimizations casually.
- Any change to this strategy must be strictly justified by: (1) a correctness/compatibility requirement, (2) diagnostic trace measurement, and (3) verified before/after benchmarks.
- Future Prisma version upgrades must regression-test relation query latency.

#### 3. Avoid Unnecessary Interactive Transaction Round Trips
Do not default to long, multi-step interactive transactions:
```ts
// ❌ Avoid multi-round-trip interactive transactions when atomic operations suffice:
prisma.$transaction(async (tx) => {
  // many sequential remote round trips across pooled connections
});
```
Where business rules permit, prefer atomic/nested Prisma operations or combined statements that allow PostgreSQL to execute related work in a single server-side round trip.  
**Critical Constraint:** Never weaken transaction atomicity, introduce race conditions, break status transitions, or compromise data integrity simply to reduce round trips. *Correctness always overrides query count.*

#### 4. Do Not Duplicate Revalidation and Refresh
Historical workflows sometimes performed server-side mutation revalidations and immediately invoked client-side `router.refresh()`, triggering duplicate RSC rendering passes.
- Before adding `router.refresh()` after a Server Action or mutation, inspect whether the Server Action already performed targeted path/tag revalidation.
- Never fetch or re-render the same state twice without a demonstrated requirement.

#### 5. Keep Cache Invalidation Targeted
Before calling `revalidatePath()`, `revalidateTag()`, or `router.refresh()`:
- Identify precisely which data became stale.
- Avoid broad, indiscriminate invalidation of unrelated application state.
- **Never remove required invalidation for performance:** Publishing workflows must always reliably invalidate and refresh all affected public surfaces (e.g., homepage, current issue, archives, journal catalog, and article detail pages).

#### 6. Polling Policy
Frequent automated polling is strictly reserved for workflows requiring near-real-time collaborative communication (such as the active request chatbox).
- **Request Chatbox Polling Standards:**
  - Visible/active tab: ~4-second polling cadence.
  - Hidden browser tab: Polling immediately paused.
  - Tab focus return: Immediate synchronization fetch.
  - User message sent: Instant optimistic/action update without waiting for the next poll cycle.
  - Overlapping in-flight poll requests must be strictly prevented.
- **General Workflows:** Do **NOT** introduce polling to dashboards, request directories, submission queues, articles, user directories, journal settings, statistics, public catalogs, or filter controls without an explicit requirement. Standard data updates through navigation, Server Actions, targeted revalidation, or explicit user action.

#### 7. Immediate UI Acknowledgement & Truthful Feedback
Backend operations may legitimately require processing time (e.g., document parsing, storage uploads, PDF generation). User interactions must receive immediate visible confirmation:
- Pending states and disabled buttons on trigger.
- Loading indicators, inline skeletons, and React transitions.
- Truthful, measured upload progress (e.g., native XHR upload events).
- **Never use artificial delays or fake progress bars** to simulate or mask latency.

#### 8. Preserve Existing Performance Infrastructure
Agents must not casually remove or regress established performance patterns:
- Admin loading skeletons and Suspense boundaries.
- Filter pending states and transitions (`useTransition`).
- Truthful XHR upload progress reporting.
- Request-scoped auth session memoization (`cache()`).
- Prisma relation-join optimizations and nested/atomic writes.
- Storage rollback mechanisms on mutation failures.
- Targeted cache invalidation and duplicate-refresh guards.
- Adaptive visibility-aware chat polling.

*If any of these must be modified, investigate and document the architectural reason first.*

#### 9. Security and Correctness Override Performance
Never sacrifice safety, authorization, or business integrity for speed. Do not weaken:
- Authentication & Supabase session verification
- Role-based access control (SUPER_ADMIN, JOURNAL_ADMIN, EDITOR, AUTHOR)
- Department and journal boundary scoping
- Server-side input validation and sanitization
- Editorial status transition state machines
- Publication consistency and transactional integrity
- Audit and history logging
- Duplicate-action protections
- Storage orphan cleanup and rollback handlers

*A slower, secure, and correct operation is always preferable to a faster, insecure, or corrupted one.*

#### 10. Measure Before Optimizing (Scientific Workflow)
All performance investigations and modifications must adhere to this discipline:
```text
OBSERVE → REPRODUCE → MEASURE → TRACE → IDENTIFY → CHANGE → VERIFY
```
- Never perform speculative performance refactoring.
- Do not assume a workflow is slow without verifiable telemetry or reproduction.
- Never claim an optimization succeeded without providing before/after measurements.
- Development timings (local compilation, unoptimized assets) must not be confused with production runtime metrics.

---

### Regression Checklist for Future Features
Before finalizing any admin workflow, data-access mutation, or page query, verify:
1. Did this change introduce a new remote database round trip?
2. Is that database round trip sequential when it could be combined or parallelized?
3. Can independent read operations safely execute concurrently via `Promise.all()`?
4. Can related writes be expressed as a single nested or atomic Prisma operation?
5. Did this change broaden cache invalidation beyond the stale data?
6. Did this change introduce an unnecessary `router.refresh()` after a revalidated Server Action?
7. Did this change introduce automated polling outside of the approved chat workflow?
8. Does a localized edit/mutation cause unrelated dataset reloads?
9. Does the UI immediately acknowledge user input with pending/disabled states?
10. Did database transaction holding time or connection duration increase?
11. Are all authorization, journal-scope, and data-integrity guarantees fully preserved?

---

### Historical Performance Baseline (Diagnostic Reference)
> **Note:** These figures represent historical diagnostic benchmarks used during performance tuning, *not permanent hard SLAs*. Infrastructure, connection pools, and network latency fluctuate over time. Use these baselines to detect major regressions.

| Metric / Surface | Unoptimized Baseline | Optimized Reference |
|---|---|---|
| Remote DB / Network Round Trip | ~195 ms | ~195 ms (physical limit) |
| Authenticated User Relation Graph | ~960 ms | **~231 ms** |
| Super Admin Dashboard Data | 462 ms | **234 ms** |
| Request List Data | 449 ms | **222 ms** |
| Submission List Data | 688 ms | **248 ms** |
| Prefetched Production Admin Navigation | — | **~65–104 ms** (perceived) |

---

## 9. QUALITY GATES (ALWAYS VERIFY BEFORE COMMITTING)

```bash
npm run format:check    # Prettier check
npm run lint            # ESLint (must be clean 0 errors)
npm test                # 72/72 tests passing (Node built-in runner)
npm run db:generate     # Regenerate Prisma client
npx prisma validate     # Validate schema
npm run build           # Production build
```

Last verified baseline: **72/72 tests passing**, ESLint clean, production build clean.

---

## 10. PRODUCT ENGINEERING PRINCIPLE

**SIMPLIFY → CONNECT → POLISH → COMPLETE**

When uncertain about a product decision, ask:
> *"Would this make IMSU FOSS easier for an older, non-technical academic administrator to operate every day?"*

---

## 11. AGENT FIDELITY & EXECUTION TRANSPARENCY RULES

- **Strict Adherence to User Requirements:** NEVER substitute, bypass, or shortcut explicit workflow instructions requested by the user (such as replacing interactive browser/UI workflows with background database scripts).
- **Mandatory Approval for Deviations:** If an alternative technical approach seems faster or better, you MUST explain the alternative and obtain explicit user approval before deviating from the user's requested approach.
- **Complete Transparency & Honest Communication:** Always disclose exact methods used. Never use evasive language or obscure technical implementation choices.
- **Acronym Recognition ("IP"):** Treat "IP" as shorthand for **Implementation Plan**. When the user asks for "IP first" or "implementation plan first", prepare and present the implementation plan artifact before writing any code changes.
- **Precise UI Placement:** Place edit actions, icons, and contextual controls directly inline next to their associated content where requested (e.g., small edit icon beside headers/badges) rather than adding unnecessary bulky cards or sidebar panels.


