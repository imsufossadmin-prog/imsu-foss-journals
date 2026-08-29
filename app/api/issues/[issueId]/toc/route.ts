import { NextResponse } from "next/server";
import { getIssueTOCData } from "@/lib/editorial/issue-mutations";
import { generateIssueTOCPdf } from "@/lib/editorial/toc-pdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ issueId: string }> },
) {
  const { issueId } = await params;
  const issue = await getIssueTOCData(issueId);

  if (!issue) {
    return NextResponse.json(
      { error: "Table of Contents unavailable for this issue." },
      { status: 404 },
    );
  }

  const journal = issue.volume.journal;
  const journalName = journal.name;
  const volNum = issue.volume.number;
  const issueNum = issue.number;
  const year = issue.volume.year;

  const url = new URL(request.url);
  const format = url.searchParams.get("format")?.toLowerCase();

  if (format === "pdf") {
    const pdfBytes = await generateIssueTOCPdf(issue);
    const pdfFilename = `TOC_${journal.slug.toUpperCase()}_Vol${volNum}_Issue${issueNum}_${year}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFilename}"`,
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  }

  const filename = `TOC_${journal.slug.toUpperCase()}_Vol${volNum}_Issue${issueNum}_${year}.html`;

  const articlesHtml = issue.articles.length
    ? issue.articles
        .map((art, index) => {
          const authorNames = art.authors.map((a) => a.fullName).join(", ");
          const pages = art.pageStart
            ? `${art.pageStart}${art.pageEnd ? `–${art.pageEnd}` : ""}`
            : "";
          const doi = art.doi ? `https://doi.org/${art.doi}` : "";

          return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 14px 12px; font-weight: 600; color: #64748b; vertical-align: top; width: 40px;">
              ${art.issueOrder ?? index + 1}.
            </td>
            <td style="padding: 14px 12px; vertical-align: top;">
              <div style="font-size: 15px; font-weight: 700; color: #0f172a; line-height: 1.4;">
                ${escapeHtml(art.title)}
              </div>
              <div style="font-size: 13px; color: #475569; margin-top: 4px;">
                ${escapeHtml(authorNames)}
              </div>
              ${
                doi
                  ? `<div style="font-size: 11px; color: #059669; margin-top: 4px; font-family: monospace;">DOI: ${escapeHtml(doi)}</div>`
                  : ""
              }
            </td>
            <td style="padding: 14px 12px; font-weight: 600; color: #0f172a; text-align: right; vertical-align: top; width: 100px; white-space: nowrap;">
              ${pages ? `pp. ${escapeHtml(pages)}` : "—"}
            </td>
          </tr>
        `;
        })
        .join("")
    : `
      <tr>
        <td colspan="3" style="padding: 24px; text-align: center; color: #64748b; font-style: italic;">
          No articles published in this issue yet.
        </td>
      </tr>
    `;

  const htmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Table of Contents — ${escapeHtml(journalName)} (Vol. ${volNum}, Issue ${issueNum})</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      .no-print { display: none; }
    }
    body {
      margin: 0;
      padding: 40px 20px;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 48px;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 1px solid #e2e8f0;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #059669;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .institution {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #059669;
      margin-bottom: 6px;
    }
    .journal-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 8px 0;
      font-family: Georgia, Cambria, "Times New Roman", Times, serif;
    }
    .meta {
      font-size: 14px;
      font-weight: 600;
      color: #475569;
    }
    .toc-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    .toc-table th {
      text-align: left;
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      border-bottom: 2px solid #e2e8f0;
      background: #f8fafc;
    }
    .footer {
      margin-top: 48px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="institution">Faculty of Social Sciences · Imo State University</div>
      <h1 class="journal-title">${escapeHtml(journalName)}</h1>
      <div class="meta">Volume ${volNum}, Issue ${issueNum} (${year}) · Table of Contents</div>
    </div>

    <table class="toc-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Article Details</th>
          <th style="text-align: right;">Pages</th>
        </tr>
      </thead>
      <tbody>
        ${articlesHtml}
      </tbody>
    </table>

    <div class="footer">
      Official Publication of IMSU FOSS Journals · Generated ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(htmlDocument, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
