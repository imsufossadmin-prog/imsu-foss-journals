import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://imsufoss.com";

  // Static core routes
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/editorial-board",
    "/current-issue",
    "/archives",
    "/submit",
    "/contact",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  // Dynamic published article routes
  const publishedArticles = await prisma.article.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true, publishedAt: true },
  });

  const articleRoutes: MetadataRoute.Sitemap = publishedArticles.map(
    (article) => ({
      url: `${baseUrl}/articles/${article.slug}`,
      lastModified: article.updatedAt || article.publishedAt || new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    }),
  );

  return [...staticRoutes, ...articleRoutes];
}
