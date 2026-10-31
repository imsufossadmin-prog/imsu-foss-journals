import { serveArticlePdf } from "@/lib/editorial/article-pdf-stream";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ articleSlug: string }> },
) {
  const { articleSlug } = await params;
  return serveArticlePdf(articleSlug, request);
}
