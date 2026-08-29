import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/authorization";
import {
  checkInternalChatAccess,
  getInternalChatJournal,
  listInternalChatMessages,
  sendInternalChatMessage,
} from "@/lib/editorial/internal-chat";
import {
  createInternalChatObjectPath,
  storageBuckets,
} from "@/lib/storage/paths";
import { matchesUploadSignature } from "@/lib/submissions/validation";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const allowed = new Map([
  ["application/pdf", ["pdf"]],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ["docx"],
  ],
  ["application/msword", ["doc"]],
  ["image/jpeg", ["jpg", "jpeg"]],
  ["image/png", ["png"]],
]);
const maxBytes = 20 * 1024 * 1024;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ journalSlug: string }> },
) {
  const user = await getCurrentUser();
  if (!user?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { journalSlug } = await params;
  const journal = await getInternalChatJournal(journalSlug);
  if (!journal) {
    return NextResponse.json({ error: "Journal not found" }, { status: 404 });
  }

  const hasAccess = await checkInternalChatAccess(user.id, journal.id);
  if (!hasAccess) {
    return NextResponse.json(
      {
        error:
          "Forbidden: Author and unauthorized users cannot access internal chat.",
      },
      { status: 403 },
    );
  }

  const messages = await listInternalChatMessages(journal.id);
  return NextResponse.json({ messages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ journalSlug: string }> },
) {
  const user = await getCurrentUser();
  if (!user?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { journalSlug } = await params;
  const journal = await getInternalChatJournal(journalSlug);
  if (!journal) {
    return NextResponse.json({ error: "Journal not found" }, { status: 404 });
  }

  const hasAccess = await checkInternalChatAccess(user.id, journal.id);
  if (!hasAccess) {
    return NextResponse.json(
      {
        error:
          "Forbidden: Author and unauthorized users cannot access internal chat.",
      },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const body = String(formData.get("body") ?? "").trim();
  const rawFiles = formData.getAll("files");

  const filesToUpload: File[] = [];
  for (const item of rawFiles) {
    if (item instanceof File && item.size > 0) {
      if (item.size > maxBytes) {
        return NextResponse.json(
          { error: `File "${item.name}" exceeds the 20 MB size limit.` },
          { status: 400 },
        );
      }
      const extension = item.name.split(".").pop()?.toLowerCase() ?? "";
      if (!allowed.get(item.type)?.includes(extension)) {
        return NextResponse.json(
          { error: `File "${item.name}" has an unsupported format.` },
          { status: 400 },
        );
      }
      const signature = new Uint8Array(await item.slice(0, 8).arrayBuffer());
      if (!matchesUploadSignature(item.type, signature)) {
        return NextResponse.json(
          { error: `File "${item.name}" contents do not match its file type.` },
          { status: 400 },
        );
      }
      filesToUpload.push(item);
    }
  }

  if (!body && filesToUpload.length === 0) {
    return NextResponse.json(
      { error: "Message text or file attachment is required." },
      { status: 400 },
    );
  }

  const uploadedFiles: Array<{
    bucket: string;
    objectPath: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
  }> = [];

  const bucket = storageBuckets.privateAcademicFiles;
  const supabase = createAdminClient();

  if (filesToUpload.length > 0) {
    for (const file of filesToUpload) {
      const objectPath = createInternalChatObjectPath({
        journalId: journal.id,
        originalFileName: file.name,
      });

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectPath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        if (uploadedFiles.length > 0) {
          await supabase.storage
            .from(bucket)
            .remove(uploadedFiles.map((u) => u.objectPath));
        }
        return NextResponse.json(
          { error: "Failed to upload file attachment. Please try again." },
          { status: 502 },
        );
      }

      uploadedFiles.push({
        bucket,
        objectPath,
        originalFileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    }
  }

  try {
    const message = await sendInternalChatMessage({
      journalId: journal.id,
      senderId: user.id,
      body: body || null,
      attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    });
    return NextResponse.json({ ok: true, messageId: message.id });
  } catch (error) {
    if (uploadedFiles.length > 0) {
      await supabase.storage
        .from(bucket)
        .remove(uploadedFiles.map((u) => u.objectPath));
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send message.",
      },
      { status: 500 },
    );
  }
}
