# IMSU FOSS Journals Product North Star

**Status:** Primary source of truth for product and architectural direction  
**Applies from:** 20 August 2026

This document governs future product decisions. Where earlier plans, seeded data, current terminology, or implemented workflows conflict with it, treat the conflict as work to reconcile deliberately—not as permission to make an unplanned or destructive change.

## Why this document exists

Earlier development began drifting toward a sophisticated academic publishing SaaS. That is not the product IMSU FOSS needs. Its primary operators are older or non-technical university staff, so the product must optimize for, in order:

1. Simplicity
2. Functionality
3. Longevity
4. Premium execution

The question behind every feature is:

> What is the simplest way to help the client complete this task reliably?

Choose a simple workflow that solves the real operational problem over a technically sophisticated workflow. This does not permit weak engineering. Security, reliability, maintainability, and extensibility belong underneath the interface; users should not have to understand that complexity.

## Product north star

IMSU FOSS is the simple operating center for academic journal activity across the Faculty of Social Sciences at Imo State University.

It is not primarily a generic journal SaaS, research social network, enterprise editorial-management system, Elsevier/ScholarOne/OJS clone, or collection of unrelated journal websites. A client should open one polished dashboard and understand:

- who wants to submit;
- which manual review-fee receipts need confirmation;
- who is allowed to submit;
- which manuscripts have arrived and their tracking IDs;
- which editor has each manuscript and which reviews have returned;
- which author needs feedback; and
- what needs administrative attention next.

The product replaces operational dependence on WhatsApp messages, scattered PDFs, receipts, manual lists, editor forwarding, memory, and folders with one organized system. It may coexist with familiar habits such as downloading a manuscript and forwarding it through WhatsApp; its essential job is to preserve reliable records and prevent work from being mixed up.

## Users and responsibility

Assume users have limited technical confidence. Use institutional language, obvious actions, and workflows understandable without training. Do not expose terms such as “tenant” or make users understand an internal workflow engine.

### Super Admin

The client is the initial Super Admin and oversees IMSU FOSS operations. The Super Admin may initially operate Psychology directly and must eventually manage departments, assign Journal Admin access to existing users, and see necessary platform-wide operational information. Routine administration must never require Supabase, database knowledge, environment variables, terminal commands, or developer assistance.

### Journal Admin

A Journal Admin operates journal activity only for their assigned department. They manage author conversations, payment-receipt confirmation, submission permission, received manuscripts, tracking IDs, editor appointments and assignments, reviews, decisions, and department operations. They must not administer unrelated departments.

### Editor

Editors do not select Editor access during sign-in. A person signs in with Google as a normal Author first, then a Journal Admin appoints them as an Editor for the appropriate department. Their existing account then exposes a minimal Editor workspace containing only assigned work and the information needed to review it.

### Author

Authors use a very simple public/account-facing experience to contact the journal, provide payment proof, submit a permitted manuscript, receive feedback, upload revisions, and understand the outcome.

### Authentication and staff access

Everyone uses the same public **Continue with Google** sign-in. A first successful Google sign-in creates or reuses the application profile and grants only normal `AUTHOR` access. Authentication establishes identity; application roles determine access.

`EDITOR`, `JOURNAL_ADMIN`, and `SUPER_ADMIN` are administrator-controlled upgrades on an existing user—not separate account types. There is no public role selector, invitation-only account creation, email/password Author signup, OTP, or magic-link signup. A user may hold multiple roles and changes workspace only after authentication. Removing a staff role keeps the user and their Author access intact.

## Organizational model

The organizational and data-isolation boundary is the **FOSS department**, not AJSBS, GJSBR, or NJSBR.

```text
IMSU FOSS
├── Psychology (first implementation)
│   └── Journal operations
├── Sociology
│   └── Journal operations
├── Criminology
├── Political Science
└── Other future FOSS departments
```

Use “Department” and “Journal” according to the institution's real language. A department may operate journal publications, but the exact journal structure must come from actual client requirements. Do not infer platform boundaries from reference material.

AJSBS, GJSBR, and NJSBR are source/reference material. Their supplied content may support accurate author guidelines, policies, editorial and publication information, archives, terminology, and appropriate visual references. They are not the platform's three tenants merely because they were previously seeded as journals. Do not invent institutional content, and do not erase or restructure existing data casually when this conflict is addressed.

## Core operating workflow

### Author and Journal Admin

The intended journey is:

```text
Contact Journal Admin
→ submission conversation
→ Admin provides manual payment instructions
→ Author pays externally and uploads receipt
→ Admin confirms payment
→ Admin allows submission
→ Author completes a short article form and uploads the manuscript
→ Admin receives the manuscript
→ Admin assigns or confirms the tracking ID
→ editor/review process
→ Admin communicates the result
→ revision when needed
→ final outcome
```

The platform records payment status; it does not process money. Do not add Paystack, Stripe, Flutterwave, automatic card processing, or another payment gateway. The architecture may leave room for automation much later, but no current workflow should depend on it.

The submission form must collect only information supported by actual FOSS needs—potentially title, necessary author/contact details, abstract, keywords, and the manuscript. Do not reproduce a large scholarly-publishing wizard or collect metadata merely because other systems do. Once permission is granted, submission should feel like completing one straightforward form and uploading a file.

### Submission conversation

Communication is a lightweight **submission conversation thread**, not a social chat product. It may contain simple messages, attachments, a payment receipt, admin instructions, submission permission, the tracking ID, feedback, revision communication, and relevant system events.

Do not add online presence, typing indicators, reactions, channels, voice messages, complex realtime infrastructure, or read receipts without a demonstrated operational need. The thread is the human communication layer around the structured manuscript record.

### Tracking ID

The Journal Admin assigns or confirms the tracking ID. The system may assist with uniqueness and validation, but must not take control away from the Admin. This ID is the prominent common reference joining the department, author, conversation, payment, manuscript, editor assignment, review, revision, and decision.

### Editor and review

An Editor should effectively see **Assigned Articles**. Opening one should reveal its tracking ID, appropriate title, secure manuscript view/download, and a simple review form. The ideal path is: open manuscript, read/view PDF, complete a few relevant assessment fields and comments, submit review.

Prefer a lightweight PDF viewer beside the form if it materially helps. Do not build complex PDF annotation. The returned review must remain attached to the correct tracking ID, manuscript, editor, and department; that reliability matters more than sophisticated reviewing tools.

## Product and engineering principles

Premium means clarity, excellent typography, generous spacing, obvious hierarchy, restrained color, thoughtful interaction, responsive behavior, consistent components, fast feedback, and polished loading, empty, and error states. It does not mean decorative dashboards, unnecessary analytics, unrequested charts, huge menus, enterprise settings, or excessive status labels. Every control must earn its place.

Keep the backend strong: server-side authorization, authenticated identity, department isolation, secure Supabase Storage, database integrity, proper migrations, reliable file relationships, clear role boundaries, useful auditability, responsive performance, and maintainable code. The client should not see or manage these mechanisms during normal work.

## Confirmed current implementation

The repository is not a fresh start. Its current engine should be simplified and reused.

### Phase 1 — Foundation: implemented

- Next.js application backed by Prisma and Supabase PostgreSQL.
- Supabase Auth is the identity source; application users share Auth UUIDs and no passwords are stored in Prisma.
- Global `SUPER_ADMIN` and `AUTHOR` roles plus scoped `JOURNAL_ADMIN` and `EDITOR` role assignments.
- Server-side authorization for platform, journal, submission-owner, and active editor-assignment access.
- Private `academic-private` storage for manuscripts and review material, opaque object paths, authenticated/signed access, and a public bucket reserved for published articles.
- Storage RLS/privilege hardening, relational constraints, indexes, migration history, and automated permission/storage tests.

### Phase 2 — Product shell: implemented

- Premium Supabase Google OAuth login and sign-out, with a development-only password compatibility path for controlled staff QA.
- Authenticated, responsive application shell with role-aware routes, workspace switching, account/membership display, journal context, and error/unauthorized states.
- Public shell and initial Home, About, Submissions, Current Issue, Archives, and Editorial Board routes.
- First Google login provisions a normal Author idempotently. A minimal restricted role-management surface supports staff-access QA; final people and department management remains Phase 6 work.

### Phase 3 — Author submission engine: implemented, but needs simplification

- A durable six-step `Journal → Details → Authors → Files → Declarations → Review` workflow with private drafts, return visits, validation, optimistic concurrency, and transactional final submission.
- Manuscript metadata, ordered authors, declarations, PDF/DOCX uploads, private download routes, author lists/details, draft deletion, and submission history.
- Automatic journal-scoped tracking-number generation at author submission.
- Revision upload and author-visible editorial decisions added by Phase 4.

These secure data and file capabilities remain valuable. The current wizard and automatic submission behavior do not reflect the corrected payment-gated, Admin-permitted flow.

### Phase 4 — Editorial and review engine: implemented

- Journal Admin submission lists with status/tracking search and detailed manuscript views.
- Initial assessment, correction requests, editor assignment/cancellation, due dates, secure manuscript access, review rounds, and workflow events.
- Editor assignment lists and a blinded manuscript download experience.
- Draft/final structured reviews with originality, methodology, clarity, and relevance scores, recommendation, author comments, and confidential comments.
- Editorial decisions, author feedback, revisions, version history, preserved review rounds, and event history.

The engine is reusable. The visible process and review form should be reduced wherever actual client requirements do not justify their complexity.

### Publishing foundation: data model only

The schema already includes departments, journals, volumes, issues, articles, article authors, and published article files. The public routes are mostly placeholder content and there is no complete staff publishing interface. This is foundation for Phase 7, not a finished publishing product.

## Known conflicts and gaps

These are documented for deliberate future correction. They must not be “fixed” incidentally.

1. **Organizational boundary:** the current schema contains `Department → Journal`, but seed data creates one “Faculty of Social Sciences” department and places AJSBS, GJSBR, NJSBR, and a development journal beneath it. The corrected model requires Psychology to be the first department beneath IMSU FOSS.
2. **Authorization and navigation scope:** Journal Admin and Editor memberships, workspaces, routes, storage paths, searches, counters, and most operational authorization are scoped by `journalId`/journal slug rather than by department. Department isolation is therefore not yet the implemented operational boundary.
3. **Reference journals:** AJSBS/GJSBR/NJSBR are treated as active seeded workspaces even though they should be source/reference material unless the client explicitly defines a legitimate publication role for them.
4. **Entry to submission:** an Author can currently start the six-step workflow directly. There is no submission conversation, receipt record, manual payment confirmation, or Admin-controlled permission gate.
5. **Tracking control:** final submission automatically allocates a tracking number from a journal/year counter. The corrected workflow requires Journal Admin assignment or confirmation after receipt.
6. **Account administration:** basic Google users and secure staff-role upgrades are implemented, but final Super Admin department management and the complete Phase 6 people-management experience are not.
7. **Workflow complexity:** the author wizard and four-dimension structured peer review may collect or expose more process than the client needs. Preserve useful internals, then simplify against verified requirements.
8. **Public and publishing experience:** public information pages are placeholders, and publication management is not implemented despite supporting schema/storage foundations.

## Remaining roadmap: five phases only

### Phase 5 — Real operations flow

Reshape Author/Admin work around contact, conversation, manual receipt verification, submission permission, a short form, manuscript upload, Admin receipt, and Admin-controlled tracking ID. Correct department-centered boundaries where required while preserving Phase 1–4 security and useful submission infrastructure.

**Done when:** the journey from “I want to submit” to “the Journal Admin has received the manuscript and assigned its tracking ID” works simply and reliably.

### Phase 6 — Admin and Editor operating center

Give Journal Admins a clear operational queue for requests, receipts, permissions, received manuscripts, pending tracking IDs, active reviews, returned reviews, needed author feedback, and completed work. Refine the minimal Editor workspace, secure PDF view/download, assignment, simple review, and tracking-ID search. Complete Super Admin department/Journal Admin management and Journal Admin Editor role management so routine administration needs no Supabase access.

**Done when:** the client can operate Psychology and manage staff accounts inside the product, and Editors can return correctly tracked reviews with minimal friction.

### Phase 7 — Public FOSS website, archive, and simple publishing

Complete accurate public pages using approved source material: Home, About, departments/journal information, author guidelines, editorial information, policies, publications, archives, and contact. Keep publishing to `Accepted manuscript → publication preparation → volume/issue → final PDF → publish`, with public browsing by department/journal, volume, issue, and article.

**Done when:** the public can discover and read FOSS research and authorized staff can publish accepted articles without developer intervention.

### Phase 8 — Simplification, premium polish, and production QA

Stop adding major features. Exercise complete Author, Journal Admin, Editor, and Super Admin journeys on mobile and desktop. Improve wording, navigation, forms, accessibility, responsive behavior, browser compatibility, file handling, recovery/onboarding, loading/empty/error states, performance, security, and content accuracy. Remove unjustified complexity.

**Done when:** a non-technical university administrator can confidently operate the product without a developer beside them.

### Phase 9 — Deployment, handover, and launch

Configure production hosting, domain/SSL, Supabase, environment, required email delivery, backups, monitoring, real accounts/content, and ownership. Remove test data, run production smoke tests, and hand over concise instructions for accounts, departments, payment verification, conversations, submissions, tracking IDs, assignment, review, decisions, publishing, and basic recovery.

**Done when:** the platform is live, appropriately owned, tested, documented, and operable without routine developer involvement.

## Decision filter

Before approving a feature, ask:

1. Does the client actually need it, and which observed workflow does it solve?
2. Does it reduce steps or make the work more reliable?
3. Can an older, non-technical user understand it immediately?
4. Can existing Phase 1–4 capabilities solve it with less new machinery?
5. Does it create unnecessary maintenance or imitate other journal software without evidence?
6. Does it preserve security, data integrity, role boundaries, and department isolation?
7. Will it still make sense when more FOSS departments are added?

If the answer is weak, simplify or reject the feature. Do not add placeholders merely to fill dashboards, rebuild working systems without a clear reason, add payment gateways, turn conversations into social chat, or create another extended roadmap.

## Definition of the finished product

The product is finished when:

- an Author can communicate, provide payment proof, receive permission, submit simply, follow a tracking ID, receive feedback, revise, and understand the outcome;
- a Journal Admin can run their department's complete daily journal operation;
- an assigned Editor can see, read/download, review, and return only assigned manuscripts under the correct tracking ID;
- the Super Admin can oversee FOSS, manage departments and Journal Admins, and perform normal platform administration without database access;
- a public visitor can understand the FOSS journal activity and browse accurate guidelines, policies, publications, archives, and research; and
- the whole product is premium, simple, secure, responsive, maintainable, documented, deployed, and sustainable after developer handover.

## Instructions for Future Coding Agents

Read this document before making any product or architectural decision. Treat it as the primary source of truth and inspect the current code, schema, migrations, tests, and worktree before each phase. Reuse existing architecture; do not infer requirements from old phase names, seed data, placeholders, or generic publishing conventions.

Implement only the named phase as one coherent, bounded milestone. Before reporting completion, run relevant automated checks, build the application, and perform live Auth/database/storage or browser validation where the feature requires it. Report any unavailable dependency honestly. Do not begin the next phase, silently change organizational boundaries, destructively rewrite data, or expand scope to “help.”

> **“Build the simplest possible software that lets IMSU FOSS run its journal operations better than WhatsApp, scattered files, receipts, and manual record keeping — without sacrificing security, organization, longevity, or premium product quality.”**
