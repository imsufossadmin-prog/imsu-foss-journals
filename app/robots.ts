import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://imsufoss.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/editorial-board",
          "/current-issue",
          "/archives",
          "/articles/",
          "/api/articles/", // Allows Google Scholar & public academic crawlers to index PDFs
          "/api/issues/", // Allows crawling of public TOC files
          "/submit",
          "/contact",
        ],
        disallow: ["/admin/", "/author/", "/editor/", "/workspaces/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
