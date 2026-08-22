import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/authorization";
import { hasGlobalRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  EditorialMutationError,
  recordRevision,
} from "@/lib/editorial/mutations";
import { maxSubmissionFileBytes } from "@/lib/submissions/constants";
import {
  matchesUploadSignature,
  validateUploadFile,
} from "@/lib/submissions/validation";
import {
  createSubmissionObjectPath,
  storageBuckets,
} from "@/lib/storage/paths";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function validateFile(
  value: FormDataEntryValue | null,
  required: boolean,
) {
  if (!(value instanceof File) || value.size === 0) {
    return required ? "Choose a revised manuscript." : null;
  }
  const basicError = validateUploadFile(value);
  if (basicError) return basicError;
  const signature = new Uint8Array(await value.slice(0, 8).arrayBuffer());
  return matchesUploadSignature(value.type, signature)
    ? null
    : "The file contents do not match its PDF or DOCX type.";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!user.isActive || !hasGlobalRole(user, "AUTHOR")) {
    return NextResponse.json(
      { error: "This upload is not authorized." },
      { status: 403 },
    );
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxSubmissionFileBytes * 2 + 1024 * 1024) {
    return NextResponse.json(
      { error: "Each file must be no larger than 20 MB." },
      { status: 413 },
    );
  }
  const { submissionId } = await params;
  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      ownerId: user.id,
      status: { in: ["CORRECTION_REQUESTED", "REVISION_REQUESTED"] },
    },
    select: { id: true, journalId: true },
  });
  if (!submission) {
    return NextResponse.json(
      { error: "This submission is not awaiting a revision." },
      { status: 403 },
    );
  }
  const formData = await request.formData();
  const manuscript = formData.get("manuscript");
  const response = formData.get("response");
  const manuscriptError = await validateFile(manuscript, true);
  const responseError = await validateFile(response, false);
  if (manuscriptError || responseError) {
    return NextResponse.json(
      { error: manuscriptError ?? responseError },
      { status: 400 },
    );
  }
  const manuscriptFile = manuscript as File;
  const responseFile =
    response instanceof File && response.size > 0 ? response : null;
  const bucket = storageBuckets.privateAcademicFiles;
  const paths = [
    createSubmissionObjectPath({
      journalId: submission.journalId,
      submissionId,
      originalFileName: manuscriptFile.name,
    }),
    ...(responseFile
      ? [
          createSubmissionObjectPath({
            journalId: submission.journalId,
            submissionId,
            originalFileName: responseFile.name,
          }),
        ]
      : []),
  ];
  const supabase = await createClient();
  const uploaded: string[] = [];
  try {
    for (const [index, file] of [
      manuscriptFile,
      ...(responseFile ? [responseFile] : []),
    ].entries()) {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(paths[index], file, {
          contentType: file.type,
          upsert: false,
        });
      if (error) throw new Error("UPLOAD_FAILED");
      uploaded.push(paths[index]);
    }
    const metadata = (file: File, objectPath: string) => ({
      bucket,
      objectPath,
      originalFileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    const version = await recordRevision({
      ownerId: user.id,
      submissionId,
      authorNote: String(formData.get("authorNote") ?? ""),
      manuscript: metadata(manuscriptFile, paths[0]),
      response: responseFile ? metadata(responseFile, paths[1]) : null,
    });
    return NextResponse.json({
      ok: true,
      versionNumber: version.versionNumber,
    });
  } catch (error) {
    if (uploaded.length) await supabase.storage.from(bucket).remove(uploaded);
    const message =
      error instanceof EditorialMutationError
        ? error.message
        : "The revision could not be attached. Try again.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
