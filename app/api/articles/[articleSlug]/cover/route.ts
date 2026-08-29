import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ articleSlug: string }> },
) {
  const { articleSlug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug: articleSlug },
    include: {
      files: {
        where: { type: "COVER_IMAGE" },
        include: { storedFile: true },
        take: 1,
      },
    },
  });

  if (!article || !article.isPublished) {
    return NextResponse.json(
      { error: "Article cover unavailable." },
      { status: 404 },
    );
  }

  if (article.files.length > 0 && article.files[0].storedFile) {
    const file = article.files[0].storedFile;
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(file.bucket)
      .createSignedUrl(file.objectPath, 3600);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: "Cover unavailable." },
        { status: 404 },
      );
    }
    return NextResponse.redirect(data.signedUrl);
  }

  if (article.coverImageUrl) {
    return NextResponse.redirect(article.coverImageUrl);
  }

  return NextResponse.json(
    { error: "No cover page found for this article." },
    { status: 404 },
  );
}
