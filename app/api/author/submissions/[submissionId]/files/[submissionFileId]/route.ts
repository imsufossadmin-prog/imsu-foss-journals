import { NextResponse } from "next/server";

import { createSubmissionFileDownloadUrl } from "@/lib/storage/access";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ submissionId: string; submissionFileId: string }>;
  },
) {
  const { submissionId, submissionFileId } = await params;
  try {
    const signedUrl = await createSubmissionFileDownloadUrl(
      submissionFileId,
      submissionId,
    );
    return NextResponse.redirect(signedUrl);
  } catch {
    return NextResponse.json({ error: "File unavailable." }, { status: 404 });
  }
}
