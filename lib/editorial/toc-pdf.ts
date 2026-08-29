import { PDFDocument, PDFFont, rgb, StandardFonts } from "pdf-lib";

export type IssueTOCData = {
  id: string;
  number: number;
  volume: {
    number: number;
    year: number;
    journal: {
      name: string;
      shortName?: string | null;
      slug: string;
      institution?: string | null;
      faculty?: string | null;
      department?: { name: string } | null;
    };
  };
  articles: Array<{
    id: string;
    title: string;
    issueOrder?: number | null;
    pageStart?: string | null;
    pageEnd?: string | null;
    doi?: string | null;
    authors: Array<{ fullName: string }>;
  }>;
};

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length ? lines : [""];
}

export async function generateIssueTOCPdf(
  issue: IssueTOCData,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const colorPrimary = rgb(0.06, 0.09, 0.16); // #0f172a
  const colorAccent = rgb(0.02, 0.59, 0.41); // #059669
  const colorMuted = rgb(0.39, 0.45, 0.55); // #64748b
  const colorBorder = rgb(0.89, 0.91, 0.94); // #e2e8f0

  // 1. Institution Header
  page.drawText("FACULTY OF SOCIAL SCIENCES · IMO STATE UNIVERSITY", {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: colorAccent,
  });
  y -= 22;

  // 2. Journal Title
  const journalTitleLines = wrapText(
    issue.volume.journal.name,
    fontBold,
    18,
    contentWidth,
  );
  for (const line of journalTitleLines) {
    page.drawText(line, {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: colorPrimary,
    });
    y -= 22;
  }

  // 3. Issue Meta
  const metaText = `Volume ${issue.volume.number}, Issue ${issue.number} (${issue.volume.year}) · Table of Contents`;
  page.drawText(metaText, {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: colorMuted,
  });
  y -= 14;

  // Header Divider
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1.5,
    color: colorAccent,
  });
  y -= 20;

  // Table Column Headers
  page.drawText("#", {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: colorMuted,
  });
  page.drawText("ARTICLE TITLE & AUTHORS", {
    x: margin + 30,
    y,
    size: 9,
    font: fontBold,
    color: colorMuted,
  });
  page.drawText("PAGES", {
    x: pageWidth - margin - 50,
    y,
    size: 9,
    font: fontBold,
    color: colorMuted,
  });
  y -= 10;

  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: colorBorder,
  });
  y -= 18;

  if (issue.articles.length === 0) {
    page.drawText("No published articles in this issue yet.", {
      x: margin,
      y,
      size: 11,
      font: fontOblique,
      color: colorMuted,
    });
  } else {
    for (let i = 0; i < issue.articles.length; i++) {
      const art = issue.articles[i];
      const orderNum = `${art.issueOrder ?? i + 1}.`;
      const authors =
        art.authors.map((a) => a.fullName).join(", ") || "Unknown Author";
      const pageRange = art.pageStart
        ? `pp. ${art.pageStart}${art.pageEnd ? `–${art.pageEnd}` : ""}`
        : "—";
      const doi = art.doi ? `DOI: https://doi.org/${art.doi}` : null;

      const titleLines = wrapText(art.title, fontBold, 11, 350);
      const authorLines = wrapText(authors, fontOblique, 9.5, 350);
      const doiLines = doi ? wrapText(doi, fontRegular, 8.5, 350) : [];

      const requiredHeight =
        titleLines.length * 14 +
        authorLines.length * 12 +
        (doiLines.length ? doiLines.length * 11 : 0) +
        24;

      // Check if page overflow
      if (y - requiredHeight < margin + 40) {
        page = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin - 10;
      }

      // Draw Order Number
      page.drawText(orderNum, {
        x: margin,
        y,
        size: 10,
        font: fontBold,
        color: colorMuted,
      });

      // Draw Title Lines
      let textY = y;
      for (const line of titleLines) {
        page.drawText(line, {
          x: margin + 30,
          y: textY,
          size: 11,
          font: fontBold,
          color: colorPrimary,
        });
        textY -= 14;
      }

      // Draw Authors
      textY -= 2;
      for (const line of authorLines) {
        page.drawText(line, {
          x: margin + 30,
          y: textY,
          size: 9.5,
          font: fontOblique,
          color: colorMuted,
        });
        textY -= 12;
      }

      // Draw DOI if present
      if (doiLines.length) {
        textY -= 2;
        for (const line of doiLines) {
          page.drawText(line, {
            x: margin + 30,
            y: textY,
            size: 8.5,
            font: fontRegular,
            color: colorAccent,
          });
          textY -= 11;
        }
      }

      // Draw Pages (right aligned)
      const pageTextWidth = fontBold.widthOfTextAtSize(pageRange, 10);
      page.drawText(pageRange, {
        x: pageWidth - margin - pageTextWidth,
        y,
        size: 10,
        font: fontBold,
        color: colorPrimary,
      });

      y = textY - 8;

      // Draw item divider line
      page.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 0.5,
        color: colorBorder,
      });
      y -= 14;
    }
  }

  // Add Footers to all pages
  const totalPages = doc.getPageCount();
  for (let idx = 0; idx < totalPages; idx++) {
    const p = doc.getPage(idx);
    const footerText = `Official Publication of IMSU FOSS Journals · Page ${idx + 1} of ${totalPages}`;
    p.drawText(footerText, {
      x: margin,
      y: margin - 20,
      size: 8.5,
      font: fontRegular,
      color: colorMuted,
    });
  }

  return doc.save();
}
