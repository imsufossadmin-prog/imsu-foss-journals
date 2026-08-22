import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  await prisma.department.updateMany({
    where: { slug: "faculty-social-sciences" },
    data: { isActive: false },
  });

  const department = await prisma.department.upsert({
    where: { slug: "psychology" },
    update: {
      name: "Psychology",
      description: "Department of Psychology, Faculty of Social Sciences",
      isActive: true,
    },
    create: {
      name: "Psychology",
      slug: "psychology",
      description: "Department of Psychology, Faculty of Social Sciences",
    },
  });

  const journal = await prisma.journal.upsert({
    where: { slug: "psychology" },
    update: {
      departmentId: department.id,
      name: "Psychology Journal Operations",
      shortName: "PSY",
      description:
        "Academic journal operations for the Department of Psychology.",
      institution: "Imo State University",
      faculty: "Faculty of Social Sciences",
      isActive: true,
    },
    create: {
      slug: "psychology",
      departmentId: department.id,
      name: "Psychology Journal Operations",
      shortName: "PSY",
      description:
        "Academic journal operations for the Department of Psychology.",
      institution: "Imo State University",
      faculty: "Faculty of Social Sciences",
      isActive: true,
    },
  });

  const references = await prisma.department.upsert({
    where: { slug: "reference-materials" },
    update: { name: "Reference Materials", isActive: false },
    create: {
      name: "Reference Materials",
      slug: "reference-materials",
      isActive: false,
    },
  });

  for (const item of [
    {
      slug: "ajsbs",
      name: "African Journal of Social and Behavioural Sciences",
      shortName: "AJSBS",
      description: "Historical/reference material supplied to IMSU FOSS.",
    },
    {
      slug: "gjsbr",
      name: "Global Journal of Social and Behavioural Research",
      shortName: "GJSBR",
      description:
        "Global research and interdisciplinary inquiry in social and behavioural sciences.",
    },
    {
      slug: "njsbr",
      name: "Nwaebere Journal of Social and Behavioural Research",
      shortName: "NJSBR",
      description:
        "Research advancing knowledge across social and behavioural disciplines.",
    },
  ]) {
    await prisma.journal.upsert({
      where: { slug: item.slug },
      update: {
        departmentId: references.id,
        name: item.name,
        shortName: item.shortName,
        description: item.description,
        institution: "Imo State University",
        faculty: "Faculty of Social Sciences",
        isActive: false,
      },
      create: {
        ...item,
        departmentId: references.id,
        institution: "Imo State University",
        faculty: "Faculty of Social Sciences",
        isActive: false,
      },
    });
  }

  const developmentDepartment = await prisma.department.upsert({
    where: { slug: "sociology" },
    update: { name: "Sociology", isActive: true },
    create: { name: "Sociology", slug: "sociology", isActive: true },
  });

  await prisma.journal.upsert({
    where: { slug: "imsu-foss-development-journal" },
    update: {
      departmentId: developmentDepartment.id,
      name: "IMSU FOSS Development Journal",
      shortName: "FOSS Development",
      description: "Development fixture for cross-journal authorization checks",
      institution: "Imo State University",
      faculty: "Faculty of Social Sciences",
      isActive: false,
    },
    create: {
      departmentId: developmentDepartment.id,
      name: "IMSU FOSS Development Journal",
      slug: "imsu-foss-development-journal",
      shortName: "FOSS Development",
      description: "Development fixture for cross-journal authorization checks",
      institution: "Imo State University",
      faculty: "Faculty of Social Sciences",
      isActive: false,
    },
  });

  const volume = await prisma.volume.upsert({
    where: {
      journalId_year_number: { journalId: journal.id, year: 2026, number: 1 },
    },
    update: { title: "2026 Volume" },
    create: {
      journalId: journal.id,
      year: 2026,
      number: 1,
      title: "2026 Volume",
    },
  });

  const issue = await prisma.issue.upsert({
    where: { volumeId_number: { volumeId: volume.id, number: 1 } },
    update: { title: "Issue 1", isPublished: false },
    create: {
      volumeId: volume.id,
      number: 1,
      title: "Issue 1",
      isPublished: false,
    },
  });

  const article = await prisma.article.upsert({
    where: { slug: "sample-academic-article" },
    update: {
      issueId: issue.id,
      title: "Sample Academic Article",
      abstract: "Development fixture for the publishing data model.",
      issueOrder: 1,
      isPublished: false,
    },
    create: {
      issueId: issue.id,
      title: "Sample Academic Article",
      slug: "sample-academic-article",
      abstract: "Development fixture for the publishing data model.",
      issueOrder: 1,
      isPublished: false,
    },
  });

  await prisma.articleAuthor.upsert({
    where: { articleId_position: { articleId: article.id, position: 1 } },
    update: {
      fullName: "Development Author",
      affiliation: "Imo State University",
    },
    create: {
      articleId: article.id,
      fullName: "Development Author",
      affiliation: "Imo State University",
      position: 1,
    },
  });

  console.log("Seeded operational department: Psychology");
  console.log("Retained AJSBS, GJSBR and NJSBR as inactive references");
  console.log(`Seeded development article: ${article.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
