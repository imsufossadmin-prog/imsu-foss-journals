import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/authorization";
import { checkInternalChatAccess } from "@/lib/editorial/internal-chat";
import { prisma } from "@/lib/db/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ journalSlug: string; attachmentId: string }> },
) {
  const user = await getCurrentUser();
  if (!user?.isActive) {
    return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  }

  const { journalSlug, attachmentId } = await params;
  const attachment = await prisma.internalChatAttachment.findFirst({
    where: {
      id: attachmentId,
      message: { journal: { slug: journalSlug } },
    },
    select: {
      id: true,
      message: { select: { journalId: true } },
      storedFile: { select: { bucket: true, objectPath: true } },
    },
  });

  if (!attachment) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const hasAccess = await checkInternalChatAccess(
    user.id,
    attachment.message.journalId,
  );
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Forbidden: Unauthorized access." },
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
