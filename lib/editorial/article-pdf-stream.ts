import "server-only";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getSupabaseEnvironment,
  hasSupabaseEnvironment,
} from "@/lib/supabase/config";

interface ParsedRange {
  start: number;
  end: number;
}

export function parseRangeHeader(
  rangeHeader: string,
  totalSize: number,
): ParsedRange | "invalid" | "unsatisfiable" {
  const match = rangeHeader.trim().match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return "invalid";

  const [, startStr, endStr] = match;
  if (startStr === "" && endStr === "") return "invalid";

  let start: number;
  let end: number;

  if (startStr === "") {
    const suffixLength = parseInt(endStr, 10);
    if (isNaN(suffixLength) || suffixLength <= 0) return "invalid";
    start = Math.max(0, totalSize - suffixLength);
    end = totalSize - 1;
  } else if (endStr === "") {
    start = parseInt(startStr, 10);
    if (isNaN(start) || start < 0) return "invalid";
    if (start >= totalSize) return "unsatisfiable";
    end = totalSize - 1;
  } else {
    start = parseInt(startStr, 10);
    end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end) || start < 0 || start > end)
      return "invalid";
    if (start >= totalSize) return "unsatisfiable";
    end = Math.min(end, totalSize - 1);
  }

  return { start, end };
}

export async function serveArticlePdf(
  articleSlug: string,
  request?: Request,
): Promise<Response> {
  const article = await prisma.article.findUnique({
    where: { slug: articleSlug },
    include: {
      files: {
        where: { type: { in: ["PRODUCTION_FILE", "PUBLISHED_PDF"] } },
        include: { storedFile: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!article || !article.isPublished) {
    return NextResponse.json(
      { error: "Article unavailable." },
      { status: 404 },
    );
  }

  // Generate deterministic ETag based on article slug and update timestamp
  const lastModifiedTime = article.updatedAt ? article.updatedAt.getTime() : 0;
  const etag = `"${article.slug}-${lastModifiedTime}"`;

  const commonCacheHeaders: Record<string, string> = {
    ETag: etag,
    "Cache-Control":
      "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400",
    "CDN-Cache-Control": "public, s-maxage=31536000",
    "Vercel-CDN-Cache-Control": "public, s-maxage=31536000",
    "Accept-Ranges": "bytes",
    "X-Robots-Tag": "all",
  };

  if (article.updatedAt) {
    commonCacheHeaders["Last-Modified"] = article.updatedAt.toUTCString();
  }

  // Handle conditional GET / HEAD: If-None-Match
  const clientEtag = request?.headers.get("if-none-match");
  if (clientEtag) {
    const cleanClientEtag = clientEtag.trim().replace(/^W\//, "");
    if (cleanClientEtag === etag || clientEtag.includes(etag)) {
      return new Response(null, {
        status: 304,
        headers: commonCacheHeaders,
      });
    }
  }

  // Handle conditional GET / HEAD: If-Modified-Since
  const clientModifiedSince = request?.headers.get("if-modified-since");
  if (clientModifiedSince && article.updatedAt) {
    const clientTime = new Date(clientModifiedSince).getTime();
    const lastModifiedSec = Math.floor(lastModifiedTime / 1000) * 1000;
    if (!isNaN(clientTime) && clientTime >= lastModifiedSec) {
      return new Response(null, {
        status: 304,
        headers: commonCacheHeaders,
      });
    }
  }

  let fileBucket: string | null = null;
  let fileObjectPath: string | null = null;
  let fileSizeBytes: bigint | null = null;

  if (article.files.length > 0 && article.files[0].storedFile) {
    fileBucket = article.files[0].storedFile.bucket;
    fileObjectPath = article.files[0].storedFile.objectPath;
    fileSizeBytes = article.files[0].storedFile.sizeBytes;
  } else {
    const submissionId = article.slug.startsWith("art-")
      ? article.slug.replace("art-", "")
      : null;

    if (submissionId) {
      const version = await prisma.submissionVersion.findFirst({
        where: { submissionId },
        orderBy: { versionNumber: "desc" },
        select: {
          manuscriptStoredFile: {
            select: { bucket: true, objectPath: true, sizeBytes: true },
          },
        },
      });
      if (version?.manuscriptStoredFile) {
        fileBucket = version.manuscriptStoredFile.bucket;
        fileObjectPath = version.manuscriptStoredFile.objectPath;
        fileSizeBytes = version.manuscriptStoredFile.sizeBytes;
      }
    }
  }

  if (!fileBucket || !fileObjectPath) {
    return NextResponse.json({ error: "PDF unavailable." }, { status: 404 });
  }

  const filename = `${article.slug}.pdf`;
  const totalSize = fileSizeBytes ? Number(fileSizeBytes) : null;

  // Handle HEAD requests: return exact headers with 0 bytes body, skipping Supabase Storage entirely
  const isHead = request?.method?.toUpperCase() === "HEAD";
  if (isHead) {
    return new Response(null, {
      status: 200,
      headers: {
        ...commonCacheHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        ...(totalSize !== null ? { "Content-Length": String(totalSize) } : {}),
      },
    });
  }

  // Handle Range requests
  const rangeHeader = request?.headers.get("range");
  let parsedRange: ParsedRange | null = null;

  if (rangeHeader && totalSize !== null) {
    const rangeResult = parseRangeHeader(rangeHeader, totalSize);
    if (rangeResult === "unsatisfiable") {
      return new Response(null, {
        status: 416,
        headers: {
          ...commonCacheHeaders,
          "Content-Range": `bytes */${totalSize}`,
        },
      });
    } else if (rangeResult !== "invalid") {
      parsedRange = rangeResult;
    }
  }

  // Attempt direct public streaming if bucket is public, falling back to admin download
  let streamResponse: Response | null = null;

  if (hasSupabaseEnvironment() && fileBucket === "published-articles") {
    try {
      const { url: supabaseUrl } = getSupabaseEnvironment();
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${fileBucket}/${fileObjectPath}`;
      const upstreamHeaders: Record<string, string> = {};
      if (parsedRange) {
        upstreamHeaders["Range"] =
          `bytes=${parsedRange.start}-${parsedRange.end}`;
      }

      const upstreamRes = await fetch(publicUrl, {
        headers: upstreamHeaders,
        cache: "no-store",
      });

      if (upstreamRes.ok) {
        if (upstreamRes.status === 206) {
          const contentRange =
            upstreamRes.headers.get("content-range") ||
            (parsedRange
              ? `bytes ${parsedRange.start}-${parsedRange.end}/${totalSize}`
              : undefined);
          const contentLength =
            upstreamRes.headers.get("content-length") ||
            (parsedRange
              ? String(parsedRange.end - parsedRange.start + 1)
              : undefined);

          streamResponse = new Response(upstreamRes.body, {
            status: 206,
            headers: {
              ...commonCacheHeaders,
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="${filename}"`,
              ...(contentRange ? { "Content-Range": contentRange } : {}),
              ...(contentLength ? { "Content-Length": contentLength } : {}),
            },
          });
        } else if (parsedRange) {
          // Upstream returned 200 for a range request: slice the buffer in memory
          const fullBuffer = await upstreamRes.arrayBuffer();
          const sliced = fullBuffer.slice(
            parsedRange.start,
            parsedRange.end + 1,
          );
          streamResponse = new Response(sliced, {
            status: 206,
            headers: {
              ...commonCacheHeaders,
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="${filename}"`,
              "Content-Range": `bytes ${parsedRange.start}-${parsedRange.end}/${totalSize ?? fullBuffer.byteLength}`,
              "Content-Length": String(sliced.byteLength),
            },
          });
        } else {
          // Standard 200 response
          const contentLength =
            upstreamRes.headers.get("content-length") ||
            (totalSize !== null ? String(totalSize) : undefined);

          streamResponse = new Response(upstreamRes.body, {
            status: 200,
            headers: {
              ...commonCacheHeaders,
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="${filename}"`,
              ...(contentLength ? { "Content-Length": contentLength } : {}),
            },
          });
        }
      }
    } catch {
      // Fallback to admin client below
    }
  }

  if (streamResponse) {
    return streamResponse;
  }

  // Fallback: Admin SDK download
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(fileBucket)
      .download(fileObjectPath);

    if (error || !data) {
      return NextResponse.json({ error: "PDF unavailable." }, { status: 404 });
    }

    if (parsedRange) {
      const arrayBuffer = await data.arrayBuffer();
      const sliced = arrayBuffer.slice(parsedRange.start, parsedRange.end + 1);
      return new Response(sliced, {
        status: 206,
        headers: {
          ...commonCacheHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${filename}"`,
          "Content-Range": `bytes ${parsedRange.start}-${parsedRange.end}/${totalSize ?? arrayBuffer.byteLength}`,
          "Content-Length": String(sliced.byteLength),
        },
      });
    }

    return new Response(data.stream(), {
      status: 200,
      headers: {
        ...commonCacheHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(data.size),
      },
    });
  } catch {
    return NextResponse.json({ error: "PDF unavailable." }, { status: 404 });
  }
}
