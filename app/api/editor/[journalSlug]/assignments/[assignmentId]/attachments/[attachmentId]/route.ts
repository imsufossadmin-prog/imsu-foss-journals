import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/authorization";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      journalSlug: string;
      assignmentId: string;
      attachmentId: string;
    }>;
  },
) {
  const user = await getCurrentUser();
  if (!user?.isActive) {
    return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  }

  const { journalSlug, assignmentId, attachmentId } = await params;
  const attachment = await prisma.reviewAttachment.findFirst({
    where: {
      id: attachmentId,
      review: {
        assignment: {
          id: assignmentId,
          reviewRound: { submission: { journal: { slug: journalSlug } } },
        },
      },
    },
    select: {
      id: true,
      review: {
        select: {
          assignment: {
            select: {
              editorId: true,
              reviewRound: {
                select: {
                  submission: {
                    select: { journal: { select: { id: true, slug: true } } },
                  },
                },
              },
            },
          },
        },
      },
      storedFile: { select: { bucket: true, objectPath: true } },
    },
  });

  if (!attachment) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const assignment = attachment.review.assignment;
  const journal = assignment.reviewRound.submission.journal;

  const isAssignedEditor = assignment.editorId === user.id;
  const isSuper = isSuperAdmin(user);
  const isJournalAdmin = user.journalRoles.some(
    (r) => r.journalId === journal.id && r.role === "JOURNAL_ADMIN",
  );

  if (!isAssignedEditor && !isSuper && !isJournalAdmin) {
    return NextResponse.json(
      { error: "Forbidden: Unauthorized access to review attachment." },
      { status: 403 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(attachment.storedFile.bucket)
    .createSignedUrl(attachment.storedFile.objectPath, 120);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "File download unavailable." },
      { status: 502 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
