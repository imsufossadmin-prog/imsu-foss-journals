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

## 8. QUALITY GATES (ALWAYS VERIFY BEFORE COMMITTING)

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

## 9. ENGINEERING PRINCIPLE

**SIMPLIFY → CONNECT → POLISH → COMPLETE**

When uncertain about a product decision, ask:
> *"Would this make IMSU FOSS easier for an older, non-technical academic administrator to operate every day?"*

---

## 10. AGENT FIDELITY & EXECUTION TRANSPARENCY RULES

- **Strict Adherence to User Requirements:** NEVER substitute, bypass, or shortcut explicit workflow instructions requested by the user (such as replacing interactive browser/UI workflows with background database scripts).
- **Mandatory Approval for Deviations:** If an alternative technical approach seems faster or better, you MUST explain the alternative and obtain explicit user approval before deviating from the user's requested approach.
- **Complete Transparency & Honest Communication:** Always disclose exact methods used. Never use evasive language or obscure technical implementation choices.
- **Acronym Recognition ("IP"):** Treat "IP" as shorthand for **Implementation Plan**. When the user asks for "IP first" or "implementation plan first", prepare and present the implementation plan artifact before writing any code changes.
- **Precise UI Placement:** Place edit actions, icons, and contextual controls directly inline next to their associated content where requested (e.g., small edit icon beside headers/badges) rather than adding unnecessary bulky cards or sidebar panels.


