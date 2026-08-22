# Author submission workflow

The operational intake journey is `Request → Conversation → Receipt → Permission → Article → Tracking ID`. Authors no longer start with a manuscript wizard. They first open a durable request with Psychology journal operations and use its conversation as the central place for payment instructions, attachments, status, and the eventual tracking ID.

## Canonical routes

- Public information: `/submissions`.
- Auth-aware submission entry used by public CTAs: `/submit`.
- Authenticated Author request creation: `/author/requests/new`.
- Author request list: `/author`.

Unauthenticated visitors entering through `/submit` are sent to the Google login page with a restricted return path. First-time users are provisioned as Authors and continue directly to request creation after the OAuth callback. Unsafe return URLs are ignored. The legacy `/author/submissions/new` route redirects to `/submit`; the Phase 3 wizard remains only as a compatibility surface for existing records.

## Request and payment

- An authenticated author may create or reopen their own active request.
- Only that author, a Journal Admin assigned within the same department, or a Super Admin may read or message the request.
- The Journal Admin sends manual payment instructions. The platform does not process or verify money.
- The author uploads a private PDF, DOCX, JPG, or PNG receipt. The Journal Admin reviews it and deliberately confirms payment.
- Confirmation records the staff actor and timestamp and enables submission in the same action. The author cannot self-confirm or use another author's permission.

## Simple article submission

After permission is enabled, the author completes one page containing:

- article title;
- one or more authors, including contact and affiliation;
- abstract and keywords; and
- one private PDF or DOCX manuscript.

The request is linked one-to-one with the resulting `Submission`. Server mutations re-check ownership, request state, department operation, submission identity, and optimistic version before saving or submitting. Direct access to the legacy upload or finalization endpoints cannot bypass permission.

The richer Phase 3 metadata and manuscript-version records remain in the backend for Phase 4 editorial compatibility. The old multi-step route structure is retained only as an internal compatibility surface; normal navigation enters through the request and one-page form.

## Tracking ID

Final submission changes the manuscript to `SUBMITTED` without assigning a tracking ID. The request becomes "Manuscript received — tracking ID pending." An authorized Journal Admin then enters the permanent ID. Format is normalized and validated on the server, and the existing unique database constraint prevents duplicates.

Editorial assessment cannot begin until the tracking ID exists. Assignment updates the request, submission, conversation, and submission event history so both parties see the same human-facing reference.

## Private files

- Bucket: `academic-private`.
- Receipt/attachment path: `department/{departmentId}/request/{requestId}/{opaque-uuid}.{extension}`.
- Manuscript path: `journal/{journalId}/submission/{submissionId}/{opaque-uuid}.{extension}`.
- Original filenames and personal identity never appear in object paths.
- Receipt formats: PDF, DOCX, JPG, and PNG. Manuscript formats: PDF and DOCX. Maximum size: 20 MB per file.
- Upload and download routes authorize the request actor before using the server-only Storage client. Short-lived signed URLs are returned only after that authorization.

Run the self-cleaning live Auth, Postgres, Storage, and editorial compatibility matrix with:

```bash
npm run validate:live:phase5
```
