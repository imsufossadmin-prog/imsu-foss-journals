import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/authorization";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ requestId: string; attachmentId: string }> },
) {
  const user = await getCurrentUser();
  if (!user?.isActive)
    return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const { requestId, attachmentId } = await params;
  const attachment = await prisma.conversationAttachment.findFirst({
    where: { id: attachmentId, message: { requestId } },
    select: {
      storedFile: { select: { bucket: true, objectPath: true } },
      message: {
        select: { request: { select: { authorId: true, journalId: true } } },
      },
    },
  });
  if (!attachment)
    return NextResponse.json({ error: "File unavailable." }, { status: 404 });
  const scope = attachment.message.request;
  const allowed =
    scope.authorId === user.id ||
    isSuperAdmin(user) ||
    user.journalRoles.some(
      ({ role, journal }) =>
        role === "JOURNAL_ADMIN" && journal.id === scope.journalId,
    );
  if (!allowed)
    return NextResponse.json({ error: "File unavailable." }, { status: 404 });
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(attachment.storedFile.bucket)
    .createSignedUrl(attachment.storedFile.objectPath, 60);
  if (error)
    return NextResponse.json({ error: "File unavailable." }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
