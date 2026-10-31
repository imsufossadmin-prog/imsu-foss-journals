import { NextResponse } from "next/server";
import { serveArticlePdf } from "@/lib/editorial/article-pdf-stream";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ articleSlug: string; filename: string }>;
  },
) {
  const { articleSlug, filename } = await params;

  // Accept filename ending in .pdf, matching the slug, or "pdf"
  const isPdfRequest =
    filename.endsWith(".pdf") ||
    filename === "pdf" ||
    filename === articleSlug ||
    filename === `${articleSlug}.pdf`;

  if (!isPdfRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return serveArticlePdf(articleSlug, request);
}
