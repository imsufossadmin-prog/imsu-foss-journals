import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/authorization";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { createRequestObjectPath, storageBuckets } from "@/lib/storage/paths";
import { matchesUploadSignature } from "@/lib/submissions/validation";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const allowed = new Map([
  ["application/pdf", ["pdf"]],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ["docx"],
  ],
  ["image/jpeg", ["jpg", "jpeg"]],
  ["image/png", ["png"]],
]);
const maxBytes = 20 * 1024 * 1024;

function validSignature(type: string, bytes: Uint8Array) {
  if (type === "image/png")
    return bytes
      .slice(0, 8)
      .every(
        (value, index) =>
          value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index],
      );
  if (type === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return matchesUploadSignature(type, bytes);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const user = await getCurrentUser();
  if (!user?.isActive)
    return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (
    Number(request.headers.get("content-length") ?? 0) >
    maxBytes + 1024 * 1024
  ) {
    return NextResponse.json(
      { error: "Choose a file no larger than 20 MB." },
      { status: 413 },
    );
  }
  const { requestId } = await params;
  const record = await prisma.submissionRequest.findUnique({
    where: { id: requestId },
    select: { id: true, authorId: true, departmentId: true, status: true },
  });
  if (!record)
    return NextResponse.json(
      { error: "Request unavailable." },
      { status: 404 },
    );
  const author = record.authorId === user.id;
  const admin =
    isSuperAdmin(user) ||
    user.journalRoles.some(
      ({ role, journal }) =>
        role === "JOURNAL_ADMIN" &&
        journal.department.id === record.departmentId,
    );
  if (!author && !admin)
    return NextResponse.json(
      { error: "Request unavailable." },
      { status: 404 },
    );

  const formData = await request.formData();
  const file = formData.get("file");
  const attachmentType =
    formData.get("attachmentType") === "PAYMENT_RECEIPT"
      ? "PAYMENT_RECEIPT"
      : "GENERAL";
  const body = String(formData.get("body") ?? "").trim();
  if (!(file instanceof File) || file.size === 0 || file.size > maxBytes) {
    return NextResponse.json(
      { error: "Choose a file no larger than 20 MB." },
      { status: 400 },
    );
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowed.get(file.type)?.includes(extension)) {
    return NextResponse.json(
      { error: "Upload a PDF, DOCX, JPG, or PNG file." },
      { status: 400 },
    );
  }
  const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!validSignature(file.type, signature)) {
    return NextResponse.json(
      { error: "The file contents do not match its file type." },
      { status: 400 },
    );
  }
  if (
    attachmentType === "PAYMENT_RECEIPT" &&
    (!author || !["NEW", "AWAITING_PAYMENT"].includes(record.status))
  ) {
    return NextResponse.json(
      { error: "A payment receipt is not expected for this request." },
      { status: 409 },
    );
  }

  const objectPath = createRequestObjectPath({
    departmentId: record.departmentId,
    requestId,
    originalFileName: file.name,
  });
  const bucket = storageBuckets.privateAcademicFiles;
  const supabase = createAdminClient();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, file, { contentType: file.type, upsert: false });
  if (uploadError)
    return NextResponse.json(
      { error: "The private upload failed. Try again." },
      { status: 502 },
    );

  try {
    await prisma.$transaction(async (transaction) => {
      if (attachmentType === "PAYMENT_RECEIPT") {
        const changed = await transaction.submissionRequest.updateMany({
          where: {
            id: requestId,
            authorId: user.id,
            status: { in: ["NEW", "AWAITING_PAYMENT"] },
          },
          data: { status: "RECEIPT_SUBMITTED", version: { increment: 1 } },
        });
        if (changed.count !== 1) throw new Error("STALE_RECEIPT");
      }
      const stored = await transaction.storedFile.create({
        data: {
          bucket,
          objectPath,
          originalFileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          uploaderId: user.id,
        },
      });
      await transaction.submissionConversationMessage.create({
        data: {
          requestId,
          senderId: user.id,
          body:
            body ||
            (attachmentType === "PAYMENT_RECEIPT"
              ? "Payment receipt"
              : "Attachment"),
          attachments: {
            create: { storedFileId: stored.id, type: attachmentType },
          },
        },
      });
      if (attachmentType === "PAYMENT_RECEIPT") {
        await transaction.submissionConversationMessage.create({
          data: {
            requestId,
            kind: "SYSTEM",
            body: "Payment receipt sent. The journal will confirm it shortly.",
          },
        });
      }
    });
  } catch {
    await supabase.storage.from(bucket).remove([objectPath]);
    return NextResponse.json(
      { error: "This request changed. Refresh and try again." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
