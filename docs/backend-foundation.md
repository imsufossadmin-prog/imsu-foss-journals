# Backend foundation

## Trust boundary

- Supabase Auth owns Google OAuth, the development-only password compatibility identity, tokens, refresh and authentication identity.
- The application `User.id` is the corresponding Supabase Auth UUID. Prisma does not manage `auth.users` and stores no passwords or duplicate sessions.
- Prisma uses the server-only PostgreSQL connection and owns application tables in `public`. Every server action and route handler must authorize before issuing privileged Prisma mutations or returning data.
- Browser/server Supabase clients use the publishable key and the authenticated user's JWT. Browser database roles have no direct application-table privileges in Phase 1; Supabase RLS provides defense in depth through narrowly granted security-definer checks in a non-exposed `private` schema.
- `SUPABASE_SECRET_KEY` bypasses RLS and is restricted to controlled server-only operations: development-user provisioning and request attachment upload/download after application authorization. It must never be exposed to the browser.

The public authentication route is Google-only. The PKCE callback exchanges the authorization code, creates or reuses the application `User` from trusted Supabase identity data, stores the normalized Google email for restricted staff lookup, and idempotently assigns `AUTHOR`. Google metadata, URL parameters, and client input never grant privileged roles. In development, `npm run db:provision-user` remains available for controlled Super Admin QA; its email and password must be supplied through uncommitted environment values.

## Roles

Global roles are structurally separate from journal roles:

- `SUPER_ADMIN`: global platform administration.
- `AUTHOR`: global permission to use the author area; submission access is still ownership-based.
- `JOURNAL_ADMIN`: scoped to one journal.
- `EDITOR`: scoped to one journal; download access additionally requires an active review assignment and is limited to manuscript/revision records, excluding cover letters and other identity-bearing attachments.

Every normal user retains `AUTHOR`. `EDITOR`, `JOURNAL_ADMIN`, and `SUPER_ADMIN` are upgrades assigned by authorized users after the target has signed in once. Super Admins may manage privileged roles globally; Journal Admins may manage only Editor access in their own department. Mutations derive the actor from the authenticated session, reject self-escalation and inactive targets, preserve unique assignments, and record assignment/removal history.

The server authorization API lives in `lib/auth/authorization.ts`. Route layouts use it for coarse access and future operations must use journal, ownership or assignment checks as appropriate.

Phase 5 introduces `Department` as the operational boundary. Existing journal role assignments remain the compatibility layer: a staff member's assigned journal resolves to its department, and request authorization compares that department with the request department. This preserves the Phase 1–4 submission and editorial model while allowing future departments without another tenancy redesign. Routes may remain `journalSlug`-based internally, but visible workspace names use the department.

Role upgrades currently retain that same compatibility layer: Editor and Journal Admin records remain journal-scoped internally, while authorization checks the journal's department before permitting a Journal Admin mutation. This is deliberate transitional reuse, not a second role model.

## Storage

- `academic-private` is private. Manuscripts, cover letters, revisions and review material use short-lived authenticated or signed access.
- `published-articles` is public only for final published files. Upload remains restricted to authorized journal staff.
- Paths follow `department/{departmentId}/request/{requestId}/{opaque-id}.{ext}`, `journal/{journalId}/submission/{submissionId}/{opaque-id}.{ext}`, or `journal/{journalId}/article/{articleId}/{opaque-id}.{ext}`. Original filenames and author identity never appear in object paths.
- `StoredFile` records the bucket, object path, original filename, MIME type, byte size, checksum and uploader. It never stores a permanent public manuscript URL.

Apply `supabase/storage.sql` after the Prisma migration. It removes direct domain-table access from browser roles, creates the buckets, and installs Storage policies, including department-scoped request attachments. Supabase owns `auth.*` and `storage.*`; Prisma deliberately does not create cross-schema constraints or manage those schemas. The provisioning command keeps application profile UUIDs aligned with `auth.users`. Use the Storage API for object operations rather than writing to Storage metadata tables.

Request attachment routes use the service Storage client only after application-level authorization because the hosted migration database role may not own Supabase's `private` or `storage` schemas. The database policies remain defense in depth for authenticated direct Storage access and must still be applied through the Supabase SQL Editor or another owner-level connection.

## RLS scope

Storage RLS permits private-file reads for the request/submission owner, staff assigned within the matching department, assigned editors where applicable, and super administrators. Prisma's database role and the service Storage client may bypass RLS, so server-side application authorization is mandatory and RLS is not a substitute for it.

The application does not expose application-domain CRUD directly through the Supabase Data API in Phase 1. If that changes, table-level RLS policies must be designed before browser access is enabled.
