import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SECRET_KEY!;

async function uploadToSupabase(
  bucket: string,
  objectPath: string,
  buffer: Buffer,
  contentType: string,
) {
  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: buffer,
    },
  );
  if (!res.ok && res.status !== 200) {
    const text = await res.text();
    console.error(`Upload error on ${bucket}/${objectPath}:`, text);
  }
}

function getPublicUrl(bucket: string, objectPath: string) {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}

const departments = [
  { slug: "psychology", name: "Psychology", code: "PSY" },
  { slug: "economics", name: "Economics", code: "ECO" },
  { slug: "political-science", name: "Political Science", code: "POL" },
  { slug: "sociology", name: "Sociology", code: "SOC" },
  { slug: "public-administration", name: "Public Administration", code: "PAD" },
  {
    slug: "criminology-security-studies",
    name: "Criminology & Security Studies",
    code: "CSS",
  },
  {
    slug: "library-information-science",
    name: "Library & Information Science",
    code: "LIS",
  },
];

async function runFullLifecycle() {
  console.log(
    "===============================================================================",
  );
  console.log(
    "STARTING FULL 35-ARTICLE END-TO-END WORKFLOW (7 DEPARTMENTS x 5 PAPERS)",
  );
  console.log(
    "===============================================================================\n",
  );

  // Clear previous test records
  await prisma.$executeRawUnsafe(`
    DELETE FROM "EditorialDecision";
    DELETE FROM "Review";
    DELETE FROM "ReviewAssignment";
    DELETE FROM "ReviewRound";
    DELETE FROM "SubmissionFile";
    DELETE FROM "SubmissionVersion";
    DELETE FROM "SubmissionAuthor";
    DELETE FROM "SubmissionEvent";
    DELETE FROM "ArticleAuthor";
    DELETE FROM "ArticleFile";
    DELETE FROM "Article";
    DELETE FROM "Issue";
    DELETE FROM "Volume";
    DELETE FROM "ConversationAttachment";
    DELETE FROM "SubmissionConversationMessage";
    DELETE FROM "Submission";
    DELETE FROM "SubmissionRequest";
    DELETE FROM "StoredFile";
  `);

  const authorUser = await prisma.user.findUniqueOrThrow({
    where: { email: "author@example.com" },
  });
  const adminUser = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@example.com" },
  });
  const editorUser = await prisma.user.findUniqueOrThrow({
    where: { email: "editor@example.com" },
  });

  let globalCount = 0;

  for (const dept of departments) {
    const journal = await prisma.journal.findFirstOrThrow({
      where: { slug: dept.slug },
      include: { department: true },
    });

    console.log(
      `\n-------------------------------------------------------------------------------`,
    );
    console.log(`DEPARTMENT: ${dept.name.toUpperCase()} (${dept.slug})`);
    console.log(
      `-------------------------------------------------------------------------------`,
    );

    const coverPath = `/Users/mac/imsu-foss-journals/scratch/covers/${dept.slug}-cover.png`;
    const coverBuffer = fs.readFileSync(coverPath);
    const coverStoragePath = `covers/${dept.slug}-vol16-iss5.png`;

    await uploadToSupabase(
      "published-articles",
      coverStoragePath,
      coverBuffer,
      "image/png",
    );
    const coverPublicUrl = getPublicUrl("published-articles", coverStoragePath);

    for (let i = 1; i <= 5; i++) {
      globalCount++;
      const pdfPath = `/Users/mac/imsu-foss-journals/scratch/manuscripts/${dept.slug}-article-${i}.pdf`;
      const receiptPath = `/Users/mac/imsu-foss-journals/scratch/receipts/${dept.slug}-receipt-${i}.png`;
      const pdfBuffer = fs.readFileSync(pdfPath);
      const receiptBuffer = fs.readFileSync(receiptPath);

      console.log(
        `\n[Article ${globalCount}/35] Starting Full Workflow for: ${dept.name} Paper #${i}`,
      );

      // 1. Author initiates submission request
      const request = await prisma.submissionRequest.create({
        data: {
          authorId: authorUser.id,
          departmentId: journal.department.id,
          journalId: journal.id,
          status: "NEW",
          version: 1,
        },
      });
      console.log(
        `  ✓ 1. Author initiated Submission Request (ID: ${request.id})`,
      );

      // 2. Author sends greeting message in chat
      await prisma.submissionConversationMessage.create({
        data: {
          requestId: request.id,
          senderId: authorUser.id,
          body: `Dear Editorial Board of ${dept.name}, I wish to initiate the submission of our empirical research paper #${i}. Attached is the proof of the N10,000 peer-review assessment fee.`,
          kind: "USER",
        },
      });

      // 3. Author uploads Payment Receipt into chat
      const receiptStoragePath = `department/${journal.department.id}/request/${request.id}/receipt-${i}.png`;
      await uploadToSupabase(
        "academic-private",
        receiptStoragePath,
        receiptBuffer,
        "image/png",
      );

      const storedReceipt = await prisma.storedFile.create({
        data: {
          bucket: "academic-private",
          objectPath: receiptStoragePath,
          originalFileName: `${dept.slug}-receipt-${i}.png`,
          mimeType: "image/png",
          sizeBytes: receiptBuffer.length,
          uploaderId: authorUser.id,
        },
      });

      await prisma.submissionConversationMessage.create({
        data: {
          requestId: request.id,
          senderId: authorUser.id,
          body: `Bank payment receipt for ₦10,000 peer review assessment.`,
          kind: "USER",
          attachments: {
            create: {
              storedFileId: storedReceipt.id,
              type: "PAYMENT_RECEIPT",
            },
          },
        },
      });

      await prisma.submissionRequest.update({
        where: { id: request.id },
        data: { status: "RECEIPT_SUBMITTED" },
      });
      console.log(
        `  ✓ 2. Author uploaded ₦10,000 Payment Receipt into Request Chat (Status: RECEIPT_SUBMITTED)`,
      );

      // 4. Journal Admin checks receipt, responds in chat, and activates submission
      await prisma.submissionConversationMessage.create({
        data: {
          requestId: request.id,
          senderId: adminUser.id,
          body: `Thank you, Prof. Okafor. Your bank transfer receipt of ₦10,000 has been verified and confirmed. Submission portal is now unlocked for you.`,
          kind: "USER",
        },
      });

      const submission = await prisma.submission.create({
        data: {
          ownerId: authorUser.id,
          journalId: journal.id,
          status: "DRAFT",
        },
      });

      await prisma.submissionRequest.update({
        where: { id: request.id },
        data: {
          status: "SUBMISSION_ENABLED",
          submissionId: submission.id,
          paymentConfirmedAt: new Date(),
          paymentConfirmedById: adminUser.id,
          submissionEnabledAt: new Date(),
          submissionEnabledById: adminUser.id,
        },
      });
      console.log(
        `  ✓ 3. Journal Admin verified receipt in chat and clicked 'Activate Submission' (Submission ID: ${submission.id})`,
      );

      // 5. Author fills 4-step submission form and uploads PDF manuscript
      const manuscriptStoragePath = `journal/${journal.id}/submission/${submission.id}/v1-manuscript.pdf`;
      await uploadToSupabase(
        "academic-private",
        manuscriptStoragePath,
        pdfBuffer,
        "application/pdf",
      );

      const storedManuscript = await prisma.storedFile.create({
        data: {
          bucket: "academic-private",
          objectPath: manuscriptStoragePath,
          originalFileName: `${dept.slug}-manuscript-${i}.pdf`,
          mimeType: "application/pdf",
          sizeBytes: pdfBuffer.length,
          uploaderId: authorUser.id,
        },
      });

      const articleTitles: Record<string, string[]> = {
        psychology: [
          "Neuropsychological Correlates of Occupational Stress in Urban Workplaces",
          "Cognitive Behavioural Interventions for Adolescent Anxiety in Secondary Schools",
          "Psychosocial Predictors of Workplace Burnout Among Healthcare Workers",
          "Emotional Intelligence and Academic Resilience Among University Undergraduates",
          "Behavioural Assessment of Trauma Recovery in Post-Crisis Rural Communities",
        ],
        economics: [
          "Monetary Policy Transmission and Inflation Dynamics in Nigeria",
          "Microfinance Credit Access and Rural Enterprise Growth in Southeastern Nigeria",
          "Fiscal Decentralisation and Regional Economic Disparities in Sub-Saharan Africa",
          "Trade Liberalisation and Domestic Manufacturing Competitiveness",
          "Exchange Rate Volatility and Foreign Direct Investment Inflows",
        ],
        "political-science": [
          "Democratic Consolidation and Electoral Integrity in West Africa",
          "Federalism, Resource Governance, and Local Autonomy in Nigeria",
          "Legislative Oversight and Public Sector Accountability",
          "Civil Society Coalitions and Democratic Policy Reforms",
          "Geopolitical Dynamics and Regional Security Architectures in the Gulf of Guinea",
        ],
        sociology: [
          "Urban Migration Patterns and Informal Settlement Dynamics in Owerri",
          "Socio-Economic Stratification and Higher Education Access in Nigeria",
          "Family Structure Transitions and Youth Socialisation in Modern Africa",
          "Community-Based Dispute Resolution Mechanisms in Rural Communities",
          "Gender Roles and Economic Empowerment in Agrarian Societies",
        ],
        "public-administration": [
          "Bureaucratic Efficiency and E-Governance Implementation in State Civil Service",
          "Public Procurement Integrity and Infrastructure Project Delivery",
          "Performance Management Systems in Nigerian Local Government Authorities",
          "Policy Implementation Gaps in Primary Healthcare Devolution",
          "Public-Private Partnerships and Urban Utility Management",
        ],
        "criminology-security-studies": [
          "Cybercrime Vulnerabilities and Digital Forensics in Financial Institutions",
          "Community Policing Strategies and Crime Prevention Efficacy",
          "Juvenile Delinquency and Institutional Rehabilitation Outcomes",
          "Border Security Governance and Transnational Contraband Networks",
          "Surveillance Technologies and Urban Crime Deterrence",
        ],
        "library-information-science": [
          "Digital Repository Adoption and Open Access Scholarly Communication",
          "Information Literacy Competencies Among University Researchers",
          "Cloud-Based Integrated Library Systems in African Academic Institutions",
          "Preservation of Indigenous Knowledge Archives Through Digitisation",
          "User Experience Design in Academic Digital Library Portals",
        ],
      };

      const title = articleTitles[dept.slug][i - 1];
      const trackingCode = `IMSU-${dept.code}-2026-00${i}`;

      const version = await prisma.submissionVersion.create({
        data: {
          submissionId: submission.id,
          versionNumber: 1,
          kind: "ORIGINAL",
          manuscriptStoredFileId: storedManuscript.id,
        },
      });

      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          title,
          abstract: `Empirical research investigation exploring ${title.toLowerCase()} within the Faculty of Social Sciences, Imo State University. This study evaluates quantitative and qualitative methodologies to formulate institutional and policy frameworks.`,
          keywords: [
            dept.name,
            "Empirical Research",
            "Nigeria",
            "Policy Reform",
          ],
          trackingNumber: trackingCode,
          status: "SUBMITTED",
          declarationAccuracy: true,
          declarationAuthority: true,
          declarationReadiness: true,
          submittedAt: new Date(),
        },
      });

      await prisma.submissionAuthor.create({
        data: {
          submissionId: submission.id,
          fullName: "Prof. Emeka Okafor",
          email: "author@example.com",
          affiliation: `Department of ${dept.name}, Faculty of Social Sciences, Imo State University`,
          isCorrespondingAuthor: true,
          position: 1,
        },
      });
      console.log(
        `  ✓ 4. Author completed 4-step wizard & uploaded manuscript (Tracking: ${trackingCode})`,
      );

      // 6. Admin assigns Editor and initiates Review Round 1
      const round = await prisma.reviewRound.create({
        data: {
          submissionId: submission.id,
          submissionVersionId: version.id,
          roundNumber: 1,
          status: "ACTIVE",
          openedAt: new Date(),
        },
      });

      const assignment = await prisma.reviewAssignment.create({
        data: {
          reviewRoundId: round.id,
          editorId: editorUser.id,
          status: "IN_REVIEW",
          assignedAt: new Date(),
        },
      });

      await prisma.submission.update({
        where: { id: submission.id },
        data: { status: "UNDER_REVIEW" },
      });
      console.log(
        `  ✓ 5. Admin assigned Reviewing Editor (editor@example.com) -> Round 1 Active`,
      );

      // 7. Editor evaluates manuscript and submits Scorecard Recommendation (ACCEPT)
      await prisma.review.create({
        data: {
          assignmentId: assignment.id,
          status: "SUBMITTED",
          originality: 5,
          methodology: 5,
          clarity: 5,
          relevance: 5,
          recommendation: "ACCEPT",
          commentsToAuthor:
            "The empirical methodology is sound, data presentation is coherent, and references strictly conform to APA 7th edition. Recommend acceptance.",
          confidentialComments:
            "Strong manuscript, well validated instrument and thorough discussion.",
          submittedAt: new Date(),
        },
      });

      await prisma.reviewAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      await prisma.reviewRound.update({
        where: { id: round.id },
        data: {
          status: "COMPLETED",
          closedAt: new Date(),
        },
      });

      await prisma.editorialDecision.create({
        data: {
          submissionId: submission.id,
          reviewRoundId: round.id,
          decidedById: editorUser.id,
          type: "ACCEPT",
          reason: "Manuscript approved for publication in Volume 16, Issue 5.",
          authorMessage:
            "Congratulations. Your manuscript has been officially accepted for publication in Volume 16, Issue 5.",
          decidedAt: new Date(),
        },
      });

      await prisma.submission.update({
        where: { id: submission.id },
        data: { status: "ACCEPTED" },
      });
      console.log(
        `  ✓ 6. Editor reviewed scorecard (Originality: 5/5) and issued formal ACCEPT decision`,
      );

      // 8. Admin publishes article into Volume 16, Issue 5 with public PDF and cover
      const volume = await prisma.volume.upsert({
        where: {
          journalId_year_number: {
            journalId: journal.id,
            year: 2026,
            number: 16,
          },
        },
        update: {},
        create: {
          journalId: journal.id,
          year: 2026,
          number: 16,
          title: `Volume 16 (2026)`,
        },
      });

      const issue = await prisma.issue.upsert({
        where: {
          volumeId_number: {
            volumeId: volume.id,
            number: 5,
          },
        },
        update: {},
        create: {
          volumeId: volume.id,
          number: 5,
          title: `Issue 5 (July, 2026)`,
          publishedAt: new Date(),
        },
      });

      const startPage = String((i - 1) * 18 + 1);
      const endPage = String(i * 18);
      const doi = `10.4314/ajsbs.v16i5.${dept.code.toLowerCase()}.${i}`;

      const publishedStoragePath = `journal/${journal.id}/article/v16-i5-art-${i}.pdf`;
      await uploadToSupabase(
        "published-articles",
        publishedStoragePath,
        pdfBuffer,
        "application/pdf",
      );

      const publishedStoredFile = await prisma.storedFile.create({
        data: {
          bucket: "published-articles",
          objectPath: publishedStoragePath,
          originalFileName: `${dept.slug}-article-${i}.pdf`,
          mimeType: "application/pdf",
          sizeBytes: pdfBuffer.length,
          uploaderId: adminUser.id,
        },
      });

      const article = await prisma.article.create({
        data: {
          issueId: issue.id,
          title,
          slug: `art-${submission.id}`,
          abstract: `Empirical research investigation exploring ${title.toLowerCase()} within the Faculty of Social Sciences, Imo State University. This study evaluates quantitative and qualitative methodologies to formulate institutional and policy frameworks.`,
          doi,
          pageStart: startPage,
          pageEnd: endPage,
          keywords: [
            dept.name,
            "Empirical Research",
            "Nigeria",
            "Policy Reform",
          ],
          isPublished: true,
          publishedAt: new Date(),
          coverImageUrl: coverPublicUrl,
          files: {
            create: {
              storedFileId: publishedStoredFile.id,
              type: "PUBLISHED_PDF",
            },
          },
          authors: {
            create: {
              fullName: "Prof. Emeka Okafor",
              email: "author@example.com",
              affiliation: `Department of ${dept.name}, Faculty of Social Sciences, Imo State University`,
              position: 1,
            },
          },
        },
      });

      console.log(
        `  ✓ 7. Article LIVE in Catalog (Slug: ${article.slug} | DOI: ${doi} | Vol 16, Iss 5)`,
      );
    }
  }

  console.log(
    "\n===============================================================================",
  );
  console.log(
    "SUCCESSFULLY COMPLETED ALL 35 FULL WORKFLOWS ACROSS 7 DEPARTMENTS!",
  );
  console.log(
    "===============================================================================",
  );
}

runFullLifecycle()
  .catch((e) => {
    console.error("FATAL ERROR IN LIFECYCLE:", e);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
    process.exit(0);
  });
