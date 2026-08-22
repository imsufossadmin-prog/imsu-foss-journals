import { NextResponse } from "next/server";

import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      journalSlug: string;
      submissionId: string;
      versionId: string;
      fileKind: string;
    }>;
  },
) {
  const { journalSlug, submissionId, versionId, fileKind } = await params;
  const { journal } = await requireJournalWorkspace(
    "JOURNAL_ADMIN",
    journalSlug,
  );
  if (!new Set(["manuscript", "response"]).has(fileKind)) {
    return NextResponse.json({ error: "File unavailable." }, { status: 404 });
  }
  const version = await prisma.submissionVersion.findFirst({
    where: {
      id: versionId,
      submissionId,
      submission: { journalId: journal.id },
    },
    select: {
      manuscriptStoredFile: { select: { bucket: true, objectPath: true } },
      responseStoredFile: { select: { bucket: true, objectPath: true } },
    },
  });
  const file =
    fileKind === "response"
      ? version?.responseStoredFile
      : version?.manuscriptStoredFile;
  if (!file)
    return NextResponse.json({ error: "File unavailable." }, { status: 404 });
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(file.bucket)
    .createSignedUrl(file.objectPath, 60);
  if (error)
    return NextResponse.json({ error: "File unavailable." }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
