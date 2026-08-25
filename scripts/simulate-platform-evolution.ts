import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const adapter = new PrismaPg(databaseUrl);
const prisma = new PrismaClient({ adapter });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function createMinimalPdfBuffer(title: string, text: string): Buffer {
  const safeTitle = title.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 60);
  const safeText = text.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 80);
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 16 Tf
50 720 Td
(${safeTitle}) Tj
/F1 11 Tf
0 -30 Td
(${safeText}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000494 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
565
%%EOF`;
  return Buffer.from(content, "binary");
}

function createSvgCoverBuffer(title: string, dept: string): Buffer {
  const safeTitle = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
    <rect width="400" height="500" fill="#122420"/>
    <rect x="20" y="20" width="360" height="460" fill="none" stroke="#10b981" stroke-width="2"/>
    <text x="40" y="70" fill="#10b981" font-family="monospace" font-size="12" font-weight="bold" letter-spacing="2">${dept.toUpperCase()}</text>
    <text x="40" y="140" fill="#f1f5f3" font-family="serif" font-size="22" font-weight="bold">${safeTitle.slice(0, 25)}</text>
    <text x="40" y="170" fill="#f1f5f3" font-family="serif" font-size="22" font-weight="bold">${safeTitle.slice(25, 50)}</text>
    <text x="40" y="440" fill="#94a3b8" font-family="monospace" font-size="11">IMSU FOSS JOURNALS — OFFICIAL ARCHIVE</text>
  </svg>`;
  return Buffer.from(svg, "utf-8");
}

const ACADEMIC_TOPICS = [
  {
    dept: "Psychology",
    journalSlug: "ajsbs",
    journalName: "African Journal of Social and Behavioural Sciences",
  },
  {
    dept: "Sociology",
    journalSlug: "gjsbr",
    journalName: "Global Journal of Social and Behavioural Research",
  },
  {
    dept: "Criminology",
    journalSlug: "njsbr",
    journalName: "Nwaebere Journal of Social and Behavioural Research",
  },
];

const SAMPLE_TITLES = [
  "An Empirical Investigation into Workplace Stress and Employee Resilience in South-East Nigeria",
  "Cognitive Behavioural Interventions in Managing Youth Anxiety within Academic Environments",
  "Social Dynamics of Community-Led Conflict Resolution in Imo State",
  "Evaluating the Impact of Digital Transformation on Public Administration Efficiency",
  "Psychosocial Determinants of Academic Motivation Among Undergraduate Students",
  "A Comparative Analysis of Rural-Urban Migration Patterns and Family Support Systems",
  "Crime Prevention Strategies and Neighbourhood Watch Effectiveness in Urban Centers",
  "The Influence of Social Media Consumption on Political Engagement in West Africa",
  "Behavioural Health and Coping Mechanisms in Post-Pandemic Educational Institutions",
  "Institutional Governance and Sustainable Economic Policies in Developing Nations",
];

const AUTHOR_NAMES = [
  "Prof. Nkwam C. Uwaoma",
  "Prof. Ikechukwu J.D. Nwosu",
  "Dr. Vin O. Umeh",
  "Dr. Richards E. Ebeh",
  "Prof. Agness Osita-Njoku",
  "Prof. Sam Ezeanyika",
  "Prof. Okechi D. Azuwike",
  "Prof. Andrew A. Igwemma",
  "Dr. Ngozi Sydney-Agbor",
  "Dr. Chidi E. Okafor",
  "Dr. Amaka P. Nwosu",
  "Prof. Emeka B. Nwachukwu",
];

async function runPlatformSimulation() {
  process.stdout.write(
    "🚀 Starting Platform Evolution & 50+ Article Simulation...\n",
  );

  const adminUser = await prisma.user.findFirst({
    where: { globalRoles: { some: { role: "SUPER_ADMIN" } } },
  });

  if (!adminUser) {
    process.stdout.write(
      "No Super Admin found. Please run provisioning script first.\n",
    );
    process.exit(1);
  }

  const departmentMap = new Map<string, string>();

  for (const topic of ACADEMIC_TOPICS) {
    const deptSlug = topic.dept.toLowerCase().replace(/[^a-z0-9]/g, "-");

    const dept = await prisma.department.upsert({
      where: { slug: deptSlug },
      update: {},
      create: {
        name: topic.dept,
        slug: deptSlug,
        isActive: true,
      },
    });

    const journal = await prisma.journal.upsert({
      where: { slug: topic.journalSlug },
      update: {},
      create: {
        departmentId: dept.id,
        name: topic.journalName,
        slug: topic.journalSlug,
        shortName: topic.journalSlug.toUpperCase(),
        isActive: true,
      },
    });

    departmentMap.set(topic.journalSlug, journal.id);
  }

  const articlesToCreate = 52;
  process.stdout.write(
    `Generating ${articlesToCreate} synthetic peer-reviewed articles across departments...\n`,
  );

  for (let i = 1; i <= articlesToCreate; i++) {
    const topicIndex = (i - 1) % ACADEMIC_TOPICS.length;
    const topic = ACADEMIC_TOPICS[topicIndex];
    const journalId = departmentMap.get(topic.journalSlug)!;

    const titleBase = SAMPLE_TITLES[(i - 1) % SAMPLE_TITLES.length];
    const title = `${titleBase} (Study Part ${Math.floor(i / 10) + 1})`;

    const volumeNum = Math.floor((i - 1) / 4) + 1;
    const issueNum = ((i - 1) % 4) + 1;
    const pubYear = 2020 + Math.floor((i - 1) / 8);

    const volume = await prisma.volume.upsert({
      where: {
        journalId_year_number: {
          journalId,
          year: pubYear,
          number: volumeNum,
        },
      },
      update: {},
      create: {
        journalId,
        number: volumeNum,
        year: pubYear,
      },
    });

    const issue = await prisma.issue.upsert({
      where: {
        volumeId_number: {
          volumeId: volume.id,
          number: issueNum,
        },
      },
      update: {},
      create: {
        volumeId: volume.id,
        number: issueNum,
        isPublished: true,
        publishedAt: new Date(pubYear, issueNum * 2, 15),
      },
    });

    const slug = `sim-${topic.journalSlug}-v${volumeNum}i${issueNum}-${i}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const doi = `10.4314/imsufoss.${topic.journalSlug}.v${volumeNum}i${issueNum}.${i}.${Date.now().toString(36)}`;

    const pdfBuffer = createMinimalPdfBuffer(
      title,
      `Abstract and empirical findings for ${title}.`,
    );
    const pdfPath = `published-simulation/${topic.journalSlug}/${Date.now()}_article_${i}.pdf`;

    await supabase.storage
      .from("published-articles")
      .upload(pdfPath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    const svgBuffer = createSvgCoverBuffer(title, topic.dept);
    const coverPath = `published-covers-sim/${topic.journalSlug}/${Date.now()}_cover_${i}.svg`;

    await supabase.storage
      .from("published-articles")
      .upload(coverPath, svgBuffer, {
        contentType: "image/svg+xml",
        upsert: true,
      });

    const { data: publicCoverData } = supabase.storage
      .from("published-articles")
      .getPublicUrl(coverPath);

    const storedFile = await prisma.storedFile.create({
      data: {
        bucket: "published-articles",
        objectPath: pdfPath,
        originalFileName: `article_${i}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: BigInt(pdfBuffer.length),
        uploaderId: adminUser.id,
      },
    });

    const author1 = AUTHOR_NAMES[(i - 1) % AUTHOR_NAMES.length];
    const author2 = AUTHOR_NAMES[i % AUTHOR_NAMES.length];

    await prisma.article.create({
      data: {
        issueId: issue.id,
        title,
        slug,
        abstract: `This paper presents empirical findings on ${titleBase.toLowerCase()}. Utilizing quantitative and qualitative methodologies, the study evaluates institutional framework effectiveness and offers strategic recommendations for policy makers.`,
        keywords: [
          topic.dept,
          "Social Sciences",
          "Behavioural Research",
          "IMSU",
        ],
        doi,
        pageStart: `${(i - 1) * 15 + 1}`,
        pageEnd: `${i * 15}`,
        coverImageUrl: publicCoverData.publicUrl,
        isPublished: true,
        publishedAt: new Date(pubYear, issueNum * 2, 15),
        authors: {
          create: [
            {
              position: 1,
              fullName: author1,
              affiliation: "Faculty of Social Sciences, IMSU",
            },
            {
              position: 2,
              fullName: author2,
              affiliation: "Imo State University, Owerri",
            },
          ],
        },
        files: {
          create: {
            storedFileId: storedFile.id,
            type: "PUBLISHED_PDF",
          },
        },
      },
    });

    process.stdout.write(
      `  ✓ Created article ${i}/${articlesToCreate}: ${topic.dept} - Vol ${volumeNum} Issue ${issueNum}\n`,
    );
  }

  process.stdout.write(`\n🎉 Platform Evolution Simulation Complete!\n`);
  process.stdout.write(
    `Total Synthetic Articles Created: ${articlesToCreate}\n`,
  );
  process.stdout.write(
    `Departments Simulated: Psychology, Sociology, Criminology\n`,
  );
}

runPlatformSimulation()
  .catch((err) => {
    process.stdout.write(`Simulation failed: ${err}\n`);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
