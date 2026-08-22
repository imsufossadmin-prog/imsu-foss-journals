-- Run in the Supabase SQL Editor after the Prisma migration has been applied.
-- Prisma owns public application tables; Supabase owns auth.* and storage.*.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- Phase 1 exposes domain data only through the server-side Prisma layer.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public
  revoke all on tables from anon, authenticated;
alter default privileges in schema public
  revoke all on sequences from anon, authenticated;

create or replace function private.can_upload_submission_file(
  requested_journal_id text,
  requested_submission_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public."Submission" submission
    join public."User" application_user
      on application_user.id = submission."ownerId"
    where submission.id = requested_submission_id
      and submission."journalId" = requested_journal_id
      and submission."ownerId" = (select auth.uid())
      and submission.status in ('DRAFT', 'CORRECTION_REQUESTED', 'REVISION_REQUESTED')
      and application_user."isActive"
  );
$$;

create or replace function private.can_delete_submission_file(
  requested_journal_id text,
  requested_submission_id text,
  requested_object_path text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public."Submission" submission
    join public."User" application_user
      on application_user.id = submission."ownerId"
    where submission.id = requested_submission_id
      and submission."journalId" = requested_journal_id
      and submission."ownerId" = (select auth.uid())
      and application_user."isActive"
      and (
        submission.status = 'DRAFT'
        or (
          submission.status in ('CORRECTION_REQUESTED', 'REVISION_REQUESTED')
          and not exists (
            select 1
            from public."StoredFile" stored_file
            where stored_file.bucket = 'academic-private'
              and stored_file."objectPath" = requested_object_path
          )
        )
      )
  );
$$;

create or replace function private.can_read_submission_file(
  requested_journal_id text,
  requested_submission_id text,
  requested_object_path text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public."Submission" submission
    join public."User" application_user
      on application_user.id = (select auth.uid())
    where submission.id = requested_submission_id
      and submission."journalId" = requested_journal_id
      and application_user."isActive"
      and (
        submission."ownerId" = (select auth.uid())
        or exists (
          select 1
          from public."UserGlobalRole" global_role
          where global_role."userId" = (select auth.uid())
            and global_role.role = 'SUPER_ADMIN'
        )
        or exists (
          select 1
          from public."JournalRoleAssignment" journal_role
          where journal_role."userId" = (select auth.uid())
            and journal_role."journalId" = submission."journalId"
            and journal_role.role = 'JOURNAL_ADMIN'
        )
        or exists (
          select 1
          from public."ReviewAssignment" assignment
          join public."ReviewRound" review_round
            on review_round.id = assignment."reviewRoundId"
          join public."SubmissionVersion" submission_version
            on submission_version.id = review_round."submissionVersionId"
          join public."StoredFile" stored_file
            on stored_file.id = submission_version."manuscriptStoredFileId"
          where assignment."editorId" = (select auth.uid())
            and review_round."submissionId" = submission.id
            and assignment.status not in ('DECLINED', 'CANCELLED')
            and exists (
              select 1
              from public."JournalRoleAssignment" editor_role
              where editor_role."userId" = (select auth.uid())
                and editor_role."journalId" = submission."journalId"
                and editor_role.role = 'EDITOR'
            )
            and stored_file.bucket = 'academic-private'
            and stored_file."objectPath" = requested_object_path
        )
      )
  );
$$;

create or replace function private.can_manage_published_article_file(
  requested_journal_id text,
  requested_article_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public."User" application_user
    join public."Article" article on article.id = requested_article_id
    join public."Issue" issue on issue.id = article."issueId"
    join public."Volume" volume on volume.id = issue."volumeId"
    where application_user.id = (select auth.uid())
      and application_user."isActive"
      and volume."journalId" = requested_journal_id
      and (
        exists (
          select 1
          from public."UserGlobalRole" global_role
          where global_role."userId" = application_user.id
            and global_role.role = 'SUPER_ADMIN'
        )
        or exists (
          select 1
          from public."JournalRoleAssignment" journal_role
          where journal_role."userId" = application_user.id
            and journal_role."journalId" = requested_journal_id
            and journal_role.role = 'JOURNAL_ADMIN'
        )
      )
  );
$$;

create or replace function private.can_access_submission_request(
  requested_department_id text,
  requested_request_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public."SubmissionRequest" request
    join public."User" application_user
      on application_user.id = (select auth.uid())
    where request.id = requested_request_id
      and request."departmentId" = requested_department_id
      and application_user."isActive"
      and (
        request."authorId" = (select auth.uid())
        or exists (
          select 1
          from public."UserGlobalRole" global_role
          where global_role."userId" = (select auth.uid())
            and global_role.role = 'SUPER_ADMIN'
        )
        or exists (
          select 1
          from public."JournalRoleAssignment" journal_role
          join public."Journal" journal
            on journal.id = journal_role."journalId"
          where journal_role."userId" = (select auth.uid())
            and journal_role.role = 'JOURNAL_ADMIN'
            and journal."departmentId" = request."departmentId"
        )
      )
  );
$$;

revoke all on function private.can_upload_submission_file(text, text) from public, anon, authenticated, service_role;
revoke all on function private.can_delete_submission_file(text, text, text) from public, anon, authenticated, service_role;
revoke all on function private.can_read_submission_file(text, text, text) from public, anon, authenticated, service_role;
revoke all on function private.can_manage_published_article_file(text, text) from public, anon, authenticated, service_role;
revoke all on function private.can_access_submission_request(text, text) from public, anon, authenticated, service_role;
grant execute on function private.can_upload_submission_file(text, text) to authenticated;
grant execute on function private.can_delete_submission_file(text, text, text) to authenticated;
grant execute on function private.can_read_submission_file(text, text, text) to authenticated;
grant execute on function private.can_manage_published_article_file(text, text) to authenticated;
grant execute on function private.can_access_submission_request(text, text) to authenticated;

insert into storage.buckets (id, name, public)
values
  ('academic-private', 'academic-private', false),
  ('published-articles', 'published-articles', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "submission owners upload private files" on storage.objects;
create policy "submission owners upload private files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'academic-private'
  and (storage.foldername(name))[1] = 'journal'
  and (storage.foldername(name))[3] = 'submission'
  and (select private.can_delete_submission_file(
    (storage.foldername(name))[2],
    (storage.foldername(name))[4],
    name
  ))
);

drop policy if exists "submission owners delete draft private files" on storage.objects;
create policy "submission owners delete draft private files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'academic-private'
  and (storage.foldername(name))[1] = 'journal'
  and (storage.foldername(name))[3] = 'submission'
  and (select private.can_upload_submission_file(
    (storage.foldername(name))[2],
    (storage.foldername(name))[4]
  ))
);

drop policy if exists "authorized users read private academic files" on storage.objects;
create policy "authorized users read private academic files"
on storage.objects for select to authenticated
using (
  bucket_id = 'academic-private'
  and (storage.foldername(name))[1] = 'journal'
  and (storage.foldername(name))[3] = 'submission'
  and (select private.can_read_submission_file(
    (storage.foldername(name))[2],
    (storage.foldername(name))[4],
    name
  ))
);

drop policy if exists "request participants upload private files" on storage.objects;
create policy "request participants upload private files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'academic-private'
  and (storage.foldername(name))[1] = 'department'
  and (storage.foldername(name))[3] = 'request'
  and (select private.can_access_submission_request(
    (storage.foldername(name))[2],
    (storage.foldername(name))[4]
  ))
);

drop policy if exists "request participants read private files" on storage.objects;
create policy "request participants read private files"
on storage.objects for select to authenticated
using (
  bucket_id = 'academic-private'
  and (storage.foldername(name))[1] = 'department'
  and (storage.foldername(name))[3] = 'request'
  and (select private.can_access_submission_request(
    (storage.foldername(name))[2],
    (storage.foldername(name))[4]
  ))
);

drop policy if exists "journal staff upload published article files" on storage.objects;
create policy "journal staff upload published article files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'published-articles'
  and (storage.foldername(name))[1] = 'journal'
  and (storage.foldername(name))[3] = 'article'
  and (select private.can_manage_published_article_file(
    (storage.foldername(name))[2],
    (storage.foldername(name))[4]
  ))
);
