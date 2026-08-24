# IMSU FOSS JOURNALS — PROJECT HANDOFF

**Project:** IMSU FOSS Journals  
**Institution:** Faculty of Social Sciences, Imo State University (IMSU)  
**Current Development Stage:** Phase 7 Complete (Publishing, Production & Admin Content Management Center)  
**Current Status:** All core author workflows, super admin operating center, user role management, instant chatbox, direct legacy manuscript publishing, public PDF reader API, and responsive mobile layouts complete with 72/72 tests passing.  
**Last Updated:** August 2026

---

# 1. PROJECT VISION

IMSU FOSS Journals is being built as the digital operating center for academic journal operations within the Faculty of Social Sciences, Imo State University.

This is NOT intended to become an over-engineered academic SaaS product.

The product priorities are:

1. Simplicity
2. Functionality
3. Longevity
4. Premium institutional design
5. Ease of use for older/non-technical academic staff

The primary users are academics and administrative staff who may not be highly technical.

Every product decision should therefore prefer:

- obvious interfaces
- plain language
- fewer steps
- large and clear actions
- simple dashboards
- strong defaults
- minimal configuration
- server-enforced security
- reliable workflows over clever workflows

The finished product should feel like a premium institutional operating system, not a complicated enterprise publishing application.

---

# 2. ORGANIZATIONAL MODEL / NORTH STAR

The correct hierarchy is:

IMSU Faculty of Social Sciences
↓
Departments
↓
Department Journal Operations

Psychology is the FIRST operational department.

Future departments may include:

- Sociology
- Criminology
- Political Science
- other Faculty of Social Sciences departments

The system must therefore support multiple departments while keeping their operations isolated.

IMPORTANT:

AJSBS, GJSBR, NJSBR and similar previous journals/materials supplied by the client are REFERENCE MATERIAL.

They are NOT separate tenants/workspaces that IMSU FOSS is supposed to host.

Earlier development incorrectly treated some of these journals as operational tenants.

That direction has been corrected.

Psychology is currently the primary active operational department.

---

# 3. PRIMARY USER ROLES

There are four application roles:

## AUTHOR

Default role for ordinary users.

Authors:

- sign in with Google
- can start submission requests
- communicate with the journal team
- upload payment receipts
- submit manuscripts after approval
- receive tracking IDs
- see decisions/feedback relevant to them
- retain Author access even if a staff role is later removed

Every newly authenticated public user receives AUTHOR only.

---

## EDITOR

Editors are privileged staff.

Editors are NOT self-appointed.

Their role must be assigned by:

- a Journal Admin for their department, or
- a Super Admin

Editors participate in manuscript review/editorial operations.

Editor access must remain department-scoped.

Blind-review protections must continue preventing unnecessary author identity exposure.

---

## JOURNAL_ADMIN

Despite some legacy naming, this represents the operational administrator responsible for a department's journal activity.

Journal Admins:

- manage incoming submission conversations
- send payment instructions
- inspect receipts
- manually confirm payment
- enable manuscript submission
- receive submitted manuscripts
- manually assign tracking IDs
- manage editorial processing
- assign Editors
- make/administer editorial decisions
- operate only inside their department

Journal Admins cannot promote themselves or other users into unrestricted privileged roles.

---

## SUPER_ADMIN

The client/operator-level account.

This is the highest platform role.

The Super Admin should ultimately operate IMSU FOSS from a central operating-center dashboard.

Responsibilities include:

- oversee departments
- appoint Journal Admins
- manage privileged access
- oversee platform activity
- manage institutional configuration
- manage department-level expansion
- retain visibility across the system

The Super Admin interface should NOT be exposed as a public login option.

---

# 4. AUTHENTICATION MODEL

Authentication uses Supabase Auth.

Production authentication is GOOGLE-FIRST.

Public users see ONE primary authentication action:

"Continue with Google"

There is:

- no public role selector
- no OTP workflow
- no magic-link workflow
- no public Author password signup
- no invitation-based signup requirement

Google establishes identity only.

Google does NOT determine application authorization.

On first successful Google login:

1. Supabase authenticates the user.
2. The application validates the identity server-side.
3. An application User is created/reused.
4. The trusted Google email/display name is synchronized.
5. AUTHOR is assigned.
6. No privileged role is granted automatically.

Roles NEVER come from:

- Google metadata
- email domain
- URL parameters
- client input
- browser state

Privileged roles are application-controlled.

---

# 5. PRIVILEGED ROLE UPGRADE MODEL

The simplified model is:

Everyone can sign in with Google.

Everyone starts as AUTHOR.

Then an administrator can upgrade an existing account.

Example:

User signs in with:

lecturer@gmail.com

The account becomes an Author.

The Super Admin searches for:

lecturer@gmail.com

and assigns:

JOURNAL_ADMIN

or:

EDITOR

as appropriate.

The next time that user accesses the platform, the relevant workspace becomes available.

Users may have multiple roles.

The existing workspace chooser supports this.

Removing a staff role does NOT delete the account.

The user remains an AUTHOR.

---

# 6. DEVELOPMENT AUTHENTICATION

A hidden Development Access mechanism exists locally.

It is unavailable in production.

A development Super Admin has been provisioned successfully for testing.

The provisioning command supports:

DEV_USER_EMAIL
DEV_USER_PASSWORD
DEV_USER_DISPLAY_NAME
DEV_USER_ROLE

The provisioning workflow is idempotent.

It creates/reuses:

- Supabase Auth identity
- application User
- permanent AUTHOR role
- requested privileged role

Do NOT hardcode development credentials into the repository.

---

# 7. TECH STACK

## Frontend / Application

- Next.js 16
- React
- TypeScript
- Server Components / server-side authorization where appropriate

## Database

- PostgreSQL
- Hosted on Supabase

## ORM

- Prisma

## Database Connectivity

Local development currently connects through the Supabase Session Pooler.

The direct PostgreSQL hostname was not usable from the local network because of IPv6/network constraints.

Prisma therefore uses the Session Pooler.

A dedicated least-privilege Prisma database role is used.

---

# 8. STORAGE

Supabase Storage is used.

Important buckets include:

### academic-private

PRIVATE.

Used for sensitive operational files such as:

- manuscripts
- revisions
- payment receipts
- supporting submission files

### published-articles

PUBLIC.

Intended for final published academic content.

Private objects use opaque paths.

Do not put:

- author names
- emails
- sensitive personal information

into Storage object paths.

---

# 9. PAYMENT MODEL

There is NO integrated payment processor.

Specifically:

DO NOT introduce Paystack or another automated payment gateway unless product requirements explicitly change.

The client requested manual payment handling.

The workflow is:

Author
↓
conversation with journal administrator
↓
Admin sends payment instructions
↓
Author pays externally
↓
Author uploads receipt
↓
Admin manually checks receipt
↓
Admin clicks Confirm Payment
↓
submission becomes enabled

The platform records:

- who confirmed payment
- when it was confirmed

The system does NOT claim to independently verify the underlying financial transaction.

Payment confirmation is an administrative assertion.

---

# 10. CORE AUTHOR WORKFLOW

The corrected operational workflow is:

Author signs in
↓
Author starts submission request
↓
Conversation with Psychology journal team
↓
Payment instructions
↓
Receipt uploaded
↓
Admin confirms payment
↓
Submission permission granted
↓
Simple article form
↓
Manuscript uploaded
↓
Submission received
↓
Awaiting tracking ID
↓
Admin manually assigns tracking ID
↓
Editorial processing begins

This workflow is the core product.

Do not replace it with a complicated academic submission wizard.

---

# 11. CONVERSATION SYSTEM

A lightweight request conversation system exists.

It is intentionally NOT a full social/chat platform.

Supported:

- text messages
- timestamps
- sender distinction
- attachments
- system messages
- persistent PostgreSQL history

Not required:

- typing indicators
- reactions
- channels
- presence
- read receipts
- Slack-like functionality
- realtime social features

The purpose is operational communication between Author and journal administration.

Each conversation should keep together:

- author communication
- payment
- receipt
- submission
- tracking ID
- relevant operational history

---

# 12. SUBMISSION FORM

After payment confirmation and submission authorization, the Author receives a SIMPLE one-page form.

Current information includes:

- article title
- multiple authors
- contact information
- affiliation
- abstract
- keywords
- manuscript

Supported manuscript formats include PDF/DOCX according to existing validation.

Files are limited to approximately 20 MB by current server validation.

Do not restore the old multi-step Phase 3 wizard as the primary user experience.

Some Phase 3 internals remain for compatibility.

---

# 13. TRACKING ID BUSINESS RULE

Tracking IDs are manually assigned by the Journal Admin.

This is deliberate.

A new submission initially displays:

"Awaiting tracking ID"

Only authorized administrators can assign one.

Tracking IDs are:

- normalized
- server validated
- database unique

Duplicate tracking IDs must fail.

Tracking ID assignment updates the relevant:

- Submission
- SubmissionRequest
- conversation/system history
- audit/event history

The tracking ID is important because it allows administrators/editors to identify manuscripts without mixing up files.

---

# 14. EDITORIAL WORKFLOW

A substantial editorial backend already exists from Phase 4.

Implemented capabilities include:

- initial assessment
- correction return
- reviewer/editor assignment
- same-department/journal restrictions
- duplicate assignment protection
- self-assignment protection
- review rounds
- immutable manuscript versions
- structured reviews
- editorial recommendations
- confidential comments
- administrative decisions
- revisions
- audit events

Decision types include:

- Accept
- Minor Revision
- Major Revision
- Reject

The current architecture also enforces at least two reviewers before review completion.

However:

The product has since been re-baselined toward SIMPLICITY.

Do not automatically expose every internal Phase 4 concept in the UI.

Reuse the backend where useful, but simplify the operational frontend.

---

# 15. BLIND REVIEW / PRIVACY RULE

Editor/reviewer interfaces must not expose unnecessary authorship information.

Future blinded editor queries must continue excluding sensitive identity fields where appropriate.

Previous work specifically protected against leaking:

- Submission.owner
- SubmissionAuthor
- uploader identity
- StoredFile.originalFileName

Assigned editors may access the manuscript when authorized.

They must NOT automatically gain access to unrelated sensitive files such as payment receipts or cover letters.

---

# 16. DATABASE / DOMAIN MODEL

The Prisma schema has evolved across multiple migrations.

Important domain concepts currently include:

## Organizational

Department

Journal

Legacy journal relationships remain internally for compatibility.

Correct authorization direction is department-based.

---

## Identity / Access

User

Role

Role assignments / journal-role assignments

Roles:

SUPER_ADMIN
JOURNAL_ADMIN
EDITOR
AUTHOR

Some staff role records remain journal-scoped internally while authorization resolves the associated department.

This is transitional architecture.

---

## Submission Request

SubmissionRequest

Represents the pre-submission operational process.

Contains/relates to concepts such as:

- Author
- Department/journal context
- request status
- payment state
- payment confirmation actor/time
- submission permission
- tracking assignment
- eventual Submission

---

## Conversation

SubmissionConversationMessage

Stores durable messages associated with a SubmissionRequest.

---

## Conversation Attachments

ConversationAttachment

Stores metadata for attachments associated with request conversations.

Actual sensitive files are stored in Supabase Storage.

---

## Submission

Submission

Represents the academic article submission.

Connected to:

- Author
- request
- metadata
- manuscript versions
- authorship information
- editorial lifecycle
- tracking ID
- review rounds
- decisions/events

---

## Submission Authors

Multiple academic authors are supported separately from the authenticated uploader/owner.

Do not assume the logged-in uploader is the only academic author.

---

## Stored Files / Manuscript Versions

The system preserves manuscript/file history.

Important file concepts include:

- manuscript
- revision
- supplementary material
- cover letter / related legacy types

Versions are preserved rather than destructively overwritten.

---

## Review Rounds

ReviewRound

Supports repeated editorial/review cycles.

Each round should be tied to the correct immutable manuscript version.

---

## Review Assignments

Connect submissions/review rounds with assigned editors/reviewers.

Authorization prevents:

- unrelated editor access
- cross-department access
- unauthorized assignment
- self-assignment where prohibited

---

## Reviews

Structured review information exists.

Fields/concepts include:

- originality
- methodology
- clarity
- relevance
- comments
- confidential comments
- recommendation

---

## Decisions

Editorial/admin decisions are preserved historically.

Examples:

ACCEPT
MINOR REVISION
MAJOR REVISION
REJECT

---

## Audit / Submission Events

Important actions create immutable operational/audit history.

Examples include:

- role assignment/removal
- payment confirmation
- tracking assignment
- editorial lifecycle actions

---

# 17. DATABASE MIGRATIONS

At the latest verified state:

5 Prisma migrations were present.

Latest migration status:

"Database schema is up to date!"

Do NOT use:

prisma db push

for production-style schema changes.

Do NOT perform destructive database resets casually.

Use migrations.

---

# 18. DATABASE CONNECTION IMPORTANT NOTE

The application uses the Supabase Session Pooler.

A previous development provisioning script used:

$transaction(async tx => ...)

This caused:

"Transaction API error: Unable to start a transaction in the given time."

Root cause:

Interactive Prisma transactions require a pinned pooler connection and Prisma's default maxWait was too short.

The provisioning workflow was corrected.

It now uses idempotent sequential atomic upserts rather than an unnecessary interactive transaction.

DO NOT casually reintroduce interactive Prisma transactions into Session-Pooler-sensitive workflows.

Keep transactions:

- short
- necessary
- bounded

---

# 19. DEVELOPMENT PROVISIONING IDEMPOTENCY

Development user provisioning MUST be safe to rerun.

Current behavior:

Auth identity
↓
Application User
↓
AUTHOR
↓
requested role

All are created/reused safely.

If Auth creation succeeds but a later DB operation fails, rerunning must recover the existing Auth user and complete missing application records.

Unique constraints prevent duplicate:

- users
- roles

---

# 20. AUTHORIZATION RULES

Server authorization is authoritative.

Never trust client UI state for security.

Important rules:

## Author

Can access:

- own submission requests
- own conversations
- own permitted submission workflow
- own safe editorial outcomes

Cannot access another Author's request/submission.

---

## Editor

Can access only properly assigned editorial work.

Must respect department isolation.

Unassigned editors must be denied.

Cross-department editors must be denied.

---

## Journal Admin

Can operate within their assigned department.

Cannot manage another department.

Can assign EDITOR within their own scope.

Cannot create arbitrary SUPER_ADMIN/JOURNAL_ADMIN privileges.

---

## Super Admin

Platform-level authority.

Can assign privileged roles according to server policy.

---

## Inactive Accounts

Inactive users must be denied privileged/application operations even when they possess a previously valid authentication session.

---

# 21. ROLE MANAGEMENT

Current minimal role-management surfaces include:

Super Admin:

/admin/access

Journal Admin:

/admin/[journalSlug]/access

These allow restricted lookup and permitted role operations.

Super Admin can assign:

- SUPER_ADMIN
- JOURNAL_ADMIN
- EDITOR

Journal Admin can assign:

- EDITOR

within their own department only.

Successful role changes create audit events.

Self-change and invalid scope operations are rejected.

---

# 22. WORKSPACES

Users can possess multiple roles.

The application therefore has a workspace model.

Single-context users can be routed directly.

Multi-role users may see:

/workspaces

Example:

A lecturer may have:

AUTHOR +
EDITOR

and can select the appropriate workspace.

Removing EDITOR should leave AUTHOR intact.

---

# 23. PUBLIC FRONTEND

The public site contains institutional journal information and navigation.

The submission entry flow was previously stale and disconnected from the Phase 5 backend.

This was corrected.

Canonical public submission journey:

/submissions
↓
/submit
↓
Google login if required
↓
/author/requests/new
↓
request workflow

Legacy:

/author/submissions/new

redirects into the canonical submission entry flow.

Do not restore stale public submission placeholders.

---

# 24. CURRENT VISUAL DIRECTION

The application currently uses:

- warm neutral surfaces
- forest-green institutional accents
- restrained gold detailing
- editorial serif typography
- locally bundled Geist
- generous spacing
- premium institutional composition
- responsive layouts
- visible focus states
- reduced-motion support

The design goal is:

PREMIUM
CALM
SIMPLE
INSTITUTIONAL
TRUSTWORTHY

Avoid:

- generic admin-template aesthetics
- excessive dashboards
- overly dense tables
- unnecessary enterprise UI
- technical terminology when plain language works

Remember the primary operators may be older academics with limited technical familiarity.

---

# 25. COMPLETED AND VERIFIED

## Infrastructure

✓ Supabase project linked

✓ PostgreSQL connectivity

✓ Prisma migrations

✓ Database seed

✓ Supabase Auth

✓ Supabase Storage

✓ Session Pooler connectivity

✓ dedicated Prisma DB role

---

## Authentication

✓ Supabase sessions

✓ Google-first production architecture

✓ OAuth PKCE callback

✓ Author-only first-login provisioning

✓ safe return URLs

✓ session persistence

✓ logout

✓ inactive-user protection

✓ multi-role workspaces

✓ development password access hidden from production

---

## Authorization

✓ Author isolation

✓ Editor assignment restrictions

✓ cross-department/journal isolation

✓ Journal Admin restrictions

✓ Super Admin access

✓ account deactivation

✓ role assignment/removal policy

✓ audit events

---

## Storage

✓ private academic storage

✓ public published storage foundation

✓ manuscript authorization

✓ receipt storage

✓ editor manuscript access rules

✓ cover-letter/private attachment restrictions

✓ opaque paths

✓ signed/authenticated private access

---

## Phase 5 Operations

✓ Author submission request

✓ conversation

✓ payment instructions

✓ receipt upload

✓ manual payment confirmation

✓ submission enablement

✓ simple one-page submission

✓ manuscript upload

✓ awaiting tracking ID state

✓ manual tracking assignment

✓ duplicate tracking prevention

✓ editorial handoff

---

## Editorial Backend

✓ initial assessment

✓ assignments

✓ review rounds

✓ manuscript versions

✓ structured reviews

✓ recommendations

✓ decisions

✓ revision workflow

✓ audit history

---

## Frontend Entry

✓ public submission page

✓ canonical /submit route

✓ login continuity

✓ public CTA wiring

✓ legacy new-submission redirect

✓ Author request workspace

---

## Quality Gates

Most recent reported validations include:

✓ Prisma schema validation

✓ migration status

✓ TypeScript

✓ ESLint

✓ Prettier

✓ production build

✓ git diff --check

✓ live Supabase lifecycle testing

✓ browser QA

The latest development provisioning corrective pass reported:

72/72 automated tests passing.

---

# 26. GOOGLE OAUTH EXTERNAL CONFIGURATION

Google OAuth was subsequently configured manually.

The Supabase callback being used is:

https://pcscnigceelxlnssuivc.supabase.co/auth/v1/callback

Local origin:

http://localhost:3000

Supabase Site URL during local development:

http://localhost:3000

Local application callback:

http://localhost:3000/auth/callback

The Google provider was enabled in Supabase.

A real Google login was subsequently successful and created an Author workspace.

Therefore the previous "Google provider disabled" blocker should be considered resolved for local development unless environment configuration changes.

Never commit the Google Client Secret.

---

# 27. DEVELOPMENT SUPER ADMIN STATUS

Development Super Admin provisioning was initially broken because of Session Pooler interactive transaction behavior.

This has been FIXED.

Live provisioning was successfully run twice.

Database verification showed:

- exactly one matching application User
- active account
- AUTHOR
- SUPER_ADMIN
- no duplicate roles

Browser verification successfully reached:

/workspaces

and:

/admin

with zero reported console errors/warnings.

The hidden Development Access login remains local-development-only.

---

# 28. HALF-FINISHED / TRANSITIONAL ARCHITECTURE

Several parts are intentionally transitional.

## Journal-scoped internals

Some routes remain:

/admin/[journalSlug]

/editor/[journalSlug]

Staff role assignments also retain journal-scoped records.

The corrected product model is department-scoped.

Existing internals currently resolve journal → department for authorization.

Do not perform a massive rewrite solely for architectural purity.

Refactor only when it materially improves the finished product.

---

## Legacy Phase 3 submission engine

The old submission wizard/backend remains partially present.

Normal users should NOT be sent through it.

The Phase 5 one-page workflow is canonical.

Legacy structures may remain where useful for compatibility.

---

## Editorial complexity

Phase 4 contains more workflow sophistication than the final product may need visibly.

Do not delete working backend infrastructure unnecessarily.

Instead:

simplify what users see.

---

# 29. KNOWN / RECENT ISSUES

## Supabase Session Pooler

Interactive transaction starvation previously affected:

- development user provisioning
- some long-running validation scenarios

Provisioning was fixed.

Avoid unnecessary long interactive transactions.

---

## Phase 4 Validator

An older Phase 4 validator previously paused during a second review round because the hosted database stalled for approximately 76 seconds inside a 20-second transaction.

Do not increase transaction timeouts blindly to hide infrastructure issues.

---

## pg Deprecation Warning

Phase 5 validation has emitted:

"Calling client.query() when the client is already executing a query is deprecated"

The lifecycle still passed.

This is non-blocking but should eventually be cleaned up before dependency upgrades make it breaking.

---

# 30. STORAGE POLICY STATUS

Phase 5 initially reported that owner-level application of updated Storage policies was required because the linked migration role lacked permission to modify protected Supabase schemas.

The Storage SQL was subsequently manually executed in the Supabase SQL Editor and returned:

"Success. No rows returned."

Afterward:

npm run validate:live:phase5

reported:

"Live Phase 5 lifecycle passed."

Therefore the Phase 5 Storage policy blocker should be treated as resolved in the current development environment.

---

# 31. CRITICAL PRODUCT RULES

These rules should be treated as product invariants.

### RULE 1

Every public Google user starts as AUTHOR.

### RULE 2

Privileged roles are assigned only by authorized administrators.

### RULE 3

Google authenticates identity; it does NOT determine authorization.

### RULE 4

Journal Admins operate only within their department.

### RULE 5

Journal Admins can appoint Editors, not unrestricted administrators.

### RULE 6

Super Admin controls higher-level access.

### RULE 7

Authors must start with a submission request/conversation.

### RULE 8

Payment is manual.

No payment processor is currently part of the product.

### RULE 9

Receipt confirmation is manual.

### RULE 10

Authors cannot submit the manuscript until Admin enables submission.

### RULE 11

Tracking IDs are manually assigned by Admin.

### RULE 12

Tracking IDs must be unique.

### RULE 13

Sensitive academic files remain private.

### RULE 14

Editor access is assignment/scoping based.

### RULE 15

Blind-review boundaries must not leak unnecessary author identity.

### RULE 16

Manuscript/revision history should be preserved rather than destructively overwritten.

### RULE 17

Authorization must be enforced server-side.

### RULE 18

Role assignment/removal must be auditable.

### RULE 19

Removing a staff role does not remove AUTHOR.

### RULE 20

Simplicity beats feature quantity.

---

# 32. CURRENCY / MONEY RULES

There is currently no automated payment processor.

Therefore the application should NOT introduce payment-gateway-specific assumptions such as Paystack kobo units unless automated payments are intentionally introduced later.

Payment evidence is currently:

external payment +
uploaded receipt +
manual administrator confirmation

Any future stored monetary amount should use an integer minor-unit representation rather than floating-point arithmetic.

But do NOT redesign the current manual-payment workflow unless requested.

---

# 33. IDEMPOTENCY RULES

The following operations should remain safe to repeat where appropriate:

- first-login application provisioning
- development user provisioning
- role assignment
- role removal
- seed operations
- controlled infrastructure setup

Duplicate role assignment should not create duplicate role records.

Repeated Google login should not create duplicate application Users.

Partial provisioning failures should be recoverable by rerunning.

---

# 34. DO NOT OVER-ENGINEER

This is extremely important.

Previous development drifted toward 20+ phases and an enterprise-style academic publishing system.

That is no longer the execution strategy.

The remaining product should be completed in a SMALL NUMBER of substantial milestones.

Codex usage is limited.

Therefore:

- inspect before coding
- reuse existing infrastructure
- bundle related work
- avoid tiny prompts
- avoid speculative architecture
- do not rewrite working systems unnecessarily
- prioritize visible product completion
- test end-to-end after each substantial milestone

---

# 35. IMMEDIATE NEXT MILESTONE

## PHASE 6 — ADMIN + EDITOR OPERATING CENTER

This is the next major product milestone.

The goal is NOT simply to add more backend functionality.

The goal is to turn the existing backend into the client's actual operating center.

The Super Admin / Journal Admin should be able to log in and immediately understand:

- what needs attention
- new submission requests
- conversations waiting for replies
- receipts awaiting confirmation
- submissions awaiting tracking IDs
- manuscripts awaiting assessment
- manuscripts currently with Editors
- reviews returned
- decisions/revisions requiring action
- users/staff requiring management

The experience should be simple enough for a non-technical academic administrator.

---

# 36. PHASE 6 — ADMIN EXPERIENCE

Build a clean operational dashboard around existing backend capabilities.

Likely primary sections:

## Overview

A simple "what needs your attention" view.

Avoid vanity analytics.

Useful counts/actions only.

---

## Submission Requests

Admin sees:

- Author
- request status
- latest message
- receipt state
- submission permission
- tracking state

Admin can open one request and operate from a unified view.

---

## Conversation

Admin communicates with Author.

Admin can:

- send payment instructions
- inspect uploaded receipt
- confirm payment
- enable submission
- see manuscript arrival
- assign tracking ID

Keep the conversation and operational controls together.

---

## Manuscripts

Once tracked:

Admin should be able to:

- open submission
- download/view manuscript
- perform initial assessment
- assign Editors
- monitor review status
- receive reviews
- make decision
- request revision where required

Do not force the Admin to navigate across many unrelated pages.

---

## Staff / Access

Super Admin:

- search users
- assign Journal Admin
- assign Editor
- remove privileged roles

Journal Admin:

- search users
- assign/remove Editor within department

The current role-management backend already exists.

Phase 6 should turn this into polished operational UX.

---

# 37. PHASE 6 — EDITOR EXPERIENCE

Editors should receive an extremely simple workspace.

Think:

"These are the papers assigned to me."

Each assignment should show:

- tracking ID
- article title where appropriate
- assignment/review status
- due/status context if later introduced

Opening one should allow:

- manuscript viewing/downloading
- review form
- comments
- recommendation
- submission of review

Do not expose unnecessary administrative information.

Do not expose payment information.

Do not expose author identity where blind review requires it.

---

# 38. AFTER PHASE 6

Once the operating center works end-to-end, remaining completion work should focus on PUBLICATION and CLIENT READINESS rather than endless workflow expansion.

Likely final milestone:

## PHASE 7 — PUBLISHING + PRODUCTION READINESS

This should include only what is necessary to make the system genuinely launchable.

Potential scope:

- accepted article publishing
- volume/issue presentation
- current issue
- archives
- article detail/download
- public discovery
- final department content
- production environment configuration
- deployment
- final permissions audit
- mobile QA
- operator usability QA
- backup/recovery documentation
- final smoke tests

DOI automation, advanced analytics, notifications, search sophistication, payment automation, realtime chat and similar features should remain deferred unless the client explicitly requires them.

---

# 39. DEFINITION OF FINISHED PRODUCT

The product is considered functionally complete when this real-world journey works:

### Author

Google login
→
start submission request
→
talk to Admin
→
receive payment instructions
→
pay externally
→
upload receipt
→
Admin confirms
→
submit article
→
receive tracking ID
→
receive updates/decision
→
submit revision if required

### Journal Admin

login
→
see operational inbox
→
reply to Author
→
inspect receipt
→
confirm payment
→
enable submission
→
receive manuscript
→
assign tracking ID
→
send/assign manuscript to Editors
→
receive reviews
→
make editorial decision
→
manage Editors

### Editor

login
→
see assigned manuscripts
→
open/download manuscript
→
review
→
submit comments/recommendation

### Super Admin

login
→
operate Psychology
→
manage privileged users
→
appoint Journal Admins
→
oversee departments
→
eventually onboard another FOSS department

### Public Reader

visit website
→
understand the journal
→
view current issue
→
browse archives
→
open/download published articles
→
start a submission when desired

If all five journeys are simple, secure, reliable and polished, the core IMSU FOSS Journals product is finished.

---

# 40. ENGINEERING PRINCIPLE FOR THE NEW ENVIRONMENT

Before making substantial changes:

1. Read this HANDOFF.
2. Read docs/PRODUCT_NORTH_STAR.md.
3. Inspect the current Prisma schema.
4. Inspect existing migrations.
5. Inspect current Phase 5 request/auth/editorial implementations.
6. Run the existing test suite.
7. Run Prisma migration status.
8. Run the application locally.
9. Manually inspect Author, Admin and Editor surfaces.
10. Reuse existing infrastructure before creating replacements.

The repository contains considerable working functionality.

Do NOT rebuild the application from scratch.

The task from here is primarily:

SIMPLIFY
→
CONNECT
→
POLISH
→
COMPLETE

rather than:

REARCHITECT
→
ADD FEATURES
→
ADD MORE PHASES

---

# 41. NORTH STAR SUMMARY

When uncertain about a product decision, ask:

"Would this make IMSU FOSS easier for an older, non-technical academic administrator to operate every day?"

If yes, it is probably aligned.

If it adds technical sophistication without making the client's work easier, it is probably unnecessary.

The final product should feel like the digital operating center of IMSU Faculty of Social Sciences journal publishing:

simple enough to learn quickly,
powerful enough to run the real workflow,
secure enough for academic manuscripts,
and structured enough to serve additional departments later.
