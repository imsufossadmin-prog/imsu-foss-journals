import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/authorization";
import { hasGlobalRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  isFirstSubmissionFileType,
  maxSubmissionFileBytes,
} from "@/lib/submissions/constants";
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
  if (contentLength > maxSubmissionFileBytes + 1024 * 1024) {
    return NextResponse.json(
      { error: "Choose a file no larger than 20 MB." },
      { status: 413 },
    );
  }

  const { submissionId } = await params;
  const formData = await request.formData();
  const file = formData.get("file");
  const type = String(formData.get("type") ?? "");
  const version = Number(formData.get("version"));

  if (!(file instanceof File) || !isFirstSubmissionFileType(type)) {
    return NextResponse.json(
      { error: "Choose a valid file category and file." },
      { status: 400 },
    );
  }
  const fileError = validateUploadFile(file);
  if (fileError)
    return NextResponse.json({ error: fileError }, { status: 400 });
  const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!matchesUploadSignature(file.type, signature)) {
    return NextResponse.json(
      { error: "The file contents do not match its PDF or DOCX type." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(version) || version < 1) {
    return NextResponse.json(
      { error: "Refresh this draft before uploading." },
      { status: 409 },
    );
  }

  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      ownerId: user.id,
      status: "DRAFT",
      request: { authorId: user.id, status: "SUBMISSION_ENABLED" },
    },
    select: { id: true, journalId: true },
  });
  if (!submission) {
    return NextResponse.json(
      { error: "Only your editable drafts accept files." },
      { status: 403 },
    );
  }

  const objectPath = createSubmissionObjectPath({
    journalId: submission.journalId,
    submissionId,
    originalFileName: file.name,
  });
  const bucket = storageBuckets.privateAcademicFiles;
  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return NextResponse.json(
      { error: "The private upload failed. Try again." },
      { status: 502 },
    );
  }

  let oldObjectPath: string | null = null;
  try {
    await prisma.$transaction(async (transaction) => {
      const updated = await transaction.submission.updateMany({
        where: {
          id: submissionId,
          ownerId: user.id,
          status: "DRAFT",
          version,
          request: { authorId: user.id, status: "SUBMISSION_ENABLED" },
        },
        data: { version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new Error("STALE_DRAFT");

      const existing = await transaction.submissionFile.findUnique({
        where: { submissionId_type: { submissionId, type } },
        include: { storedFile: true },
      });
      if (existing) {
        oldObjectPath = existing.storedFile.objectPath;
        await transaction.submissionFile.delete({ where: { id: existing.id } });
        await transaction.storedFile.delete({
          where: { id: existing.storedFileId },
        });
      }

      const storedFile = await transaction.storedFile.create({
        data: {
          bucket,
          objectPath,
          originalFileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          uploaderId: user.id,
        },
      });
      await transaction.submissionFile.create({
        data: { submissionId, storedFileId: storedFile.id, type },
      });
    });
  } catch (error) {
    await supabase.storage.from(bucket).remove([objectPath]);
    const message =
      error instanceof Error && error.message === "STALE_DRAFT"
        ? "This draft changed in another window. Refresh before uploading."
        : "The upload could not be attached to this draft.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  if (oldObjectPath) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([oldObjectPath]);
    if (error) console.error("Replaced file cleanup failed", error.message);
  }

  return NextResponse.json({ ok: true });
}
