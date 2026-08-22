import { NextResponse } from "next/server";

import { requireJournalWorkspace } from "@/lib/auth/workspace-context";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ journalSlug: string; assignmentId: string }> },
) {
  const { journalSlug, assignmentId } = await params;
  const { user, journal } = await requireJournalWorkspace(
    "EDITOR",
    journalSlug,
  );
  const assignment = await prisma.reviewAssignment.findFirst({
    where: {
      id: assignmentId,
      editorId: user.id,
      status: { notIn: ["CANCELLED", "DECLINED"] },
      reviewRound: { submission: { journalId: journal.id } },
    },
    select: {
      reviewRound: {
        select: {
          submissionVersion: {
            select: {
              manuscriptStoredFile: {
                select: { bucket: true, objectPath: true },
              },
            },
          },
        },
      },
    },
  });
  if (!assignment) {
    return NextResponse.json(
      { error: "Manuscript unavailable." },
      { status: 404 },
    );
  }
  const file = assignment.reviewRound.submissionVersion.manuscriptStoredFile;
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(file.bucket)
    .createSignedUrl(file.objectPath, 60);
  if (error) {
    return NextResponse.json(
      { error: "Manuscript unavailable." },
      { status: 404 },
    );
  }
  return NextResponse.redirect(data.signedUrl);
}
