import { revalidatePath } from "next/cache";

export interface InvalidateArticleOptions {
  slug: string;
  previousSlug?: string;
  journalSlug?: string;
}

/**
 * Purges Next.js full-route and Vercel Edge CDN caches for an article
 * and all its associated public surfaces (landing page, PDF stream, TOC, archives).
 */
export function invalidateArticlePublicCaches(
  options: InvalidateArticleOptions,
) {
  try {
    const slugs = new Set<string>();
    if (options.slug) slugs.add(options.slug);
    if (options.previousSlug) slugs.add(options.previousSlug);

    for (const s of slugs) {
      // 1. Invalidate HTML article landing page
      revalidatePath(`/articles/${s}`);

      // 2. Invalidate friendly public PDF URL
      revalidatePath(`/articles/${s}/${s}.pdf`);

      // 3. Invalidate API PDF endpoint
      revalidatePath(`/api/articles/${s}/pdf`);

      // 4. Invalidate cover image API endpoint if applicable
      revalidatePath(`/api/articles/${s}/cover`);
    }

    // 5. Invalidate public collection and discovery views
    revalidatePath("/");
    revalidatePath("/current-issue");
    revalidatePath("/archives");
    revalidatePath("/admin/articles");

    if (options.journalSlug) {
      revalidatePath(`/journals/${options.journalSlug}`);
    }
  } catch (err) {
    // Graceful no-op if called outside a Next.js request context (e.g., CLI migration scripts)
    console.warn("[Cache Invalidation] revalidatePath skipped:", err);
  }
}

/**
 * Optional external CDN cache purge helper (e.g. Cloudflare Zone Cache Purge).
 * Does not throw and does not expose secrets.
 */
export async function purgeExternalCdnArticleCache(urls: string[]) {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();

  if (!zoneId || !apiToken || urls.length === 0) {
    return;
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: urls }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.warn("[Cloudflare Purge Warning]:", res.status, errText);
    }
  } catch (err) {
    console.warn("[Cloudflare Purge Error]:", err);
  }
}
