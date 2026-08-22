# IMSU FOSS Journals

Digital publishing operations platform for the Faculty of Social Sciences, Imo State University. Psychology is the first active department context.

## Requirements

- Node.js 20 or newer
- PostgreSQL supplied by a Supabase project
- A Supabase project with email/password Auth enabled

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and supply:
   - public `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` values;
   - server-only `DATABASE_URL` for Supabase Postgres;
   - `SUPABASE_SECRET_KEY` for controlled server-only Auth and private request-attachment operations;
   - `NEXT_PUBLIC_APP_URL` for the local or deployed application URL.
3. Apply the Prisma migration with `npm run db:migrate` against an empty development database. Deploy existing migrations in hosted environments with `npm run db:migrate:deploy`.
4. Generate the client with `npm run db:generate`.
5. Load application fixtures with `npm run db:seed`.
6. Run [supabase/storage.sql](supabase/storage.sql) in the Supabase SQL Editor to restrict browser database access and create the private/public buckets and Storage policies.
7. Configure the Supabase Auth site URL and allowed redirect URLs for the application URL.

Prisma manages only the `public` application schema. Do not make Prisma own Supabase's `auth` or `storage` schemas.

## Development users

Public registration is intentionally disabled in the application. Provision controlled development identities by passing credentials in the shell, never in source control:

```bash
DEV_USER_EMAIL=user@example.test \
DEV_USER_PASSWORD='use-a-long-local-password' \
DEV_USER_DISPLAY_NAME='Development User' \
DEV_USER_ROLE=AUTHOR \
npm run db:provision-user
```

Supported global roles are `SUPER_ADMIN` and `AUTHOR`. `JOURNAL_ADMIN` and `EDITOR` also require `DEV_USER_JOURNAL_SLUG`.

## Run and validate

```bash
npm run dev
npm run format:check
npm run lint
npm test
npm run db:generate
npx prisma validate
npm run build
```

See [docs/backend-foundation.md](docs/backend-foundation.md) for the trust boundary and storage model.
See [docs/author-submission-workflow.md](docs/author-submission-workflow.md) for the Phase 5 request, manual payment, simple submission, and tracking flow.
