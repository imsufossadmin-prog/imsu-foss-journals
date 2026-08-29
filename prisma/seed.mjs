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

  const activeDepartments = [
    {
      slug: "psychology",
      name: "Psychology",
      shortName: "PSY",
      description: "Department of Psychology, Faculty of Social Sciences",
    },
    {
      slug: "political-science",
      name: "Political Science",
      shortName: "POL",
      description:
        "Department of Political Science, Faculty of Social Sciences",
    },
    {
      slug: "sociology",
      name: "Sociology",
      shortName: "SOC",
      description: "Department of Sociology, Faculty of Social Sciences",
    },
    {
      slug: "economics",
      name: "Economics",
      shortName: "ECO",
      description: "Department of Economics, Faculty of Social Sciences",
    },
    {
      slug: "public-administration",
      name: "Public Administration",
      shortName: "PAD",
      description:
        "Department of Public Administration, Faculty of Social Sciences",
    },
    {
      slug: "criminology-security-studies",
      name: "Criminology & Security Studies",
      shortName: "CSS",
      description:
        "Department of Criminology & Security Studies, Faculty of Social Sciences",
    },
    {
      slug: "library-information-science",
      name: "Library & Information Science",
      shortName: "LIS",
      description:
        "Department of Library & Information Science, Faculty of Social Sciences",
    },
  ];

  let primaryJournal = null;

  for (const item of activeDepartments) {
    const dept = await prisma.department.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        isActive: true,
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        isActive: true,
      },
    });

    const jnl = await prisma.journal.upsert({
      where: { slug: item.slug },
      update: {
        departmentId: dept.id,
        name: `${item.name} Journal Operations`,
        shortName: item.shortName,
        description: `Academic journal operations for the Department of ${item.name}.`,
        institution: "Imo State University",
        faculty: "Faculty of Social Sciences",
        isActive: true,
      },
      create: {
        slug: item.slug,
        departmentId: dept.id,
        name: `${item.name} Journal Operations`,
        shortName: item.shortName,
        description: `Academic journal operations for the Department of ${item.name}.`,
        institution: "Imo State University",
        faculty: "Faculty of Social Sciences",
        isActive: true,
      },
    });

    if (item.slug === "psychology") primaryJournal = jnl;
  }

  const journal = primaryJournal;

  for (const item of [
    {
      slug: "ajsbs",
      name: "African Journal of Social and Behavioural Sciences",
      shortName: "AJSBS",
      description:
        "Official interdisciplinary journal of the Faculty of Social Sciences, Imo State University, publishing cutting-edge peer-reviewed research across social and behavioural sciences.",
    },
    {
      slug: "gjsbr",
      name: "Global Journal of Social and Behavioural Research",
      shortName: "GJSBR",
      description:
        "Global research and interdisciplinary inquiry advancing knowledge across social, psychological, economic, and behavioural disciplines.",
    },
    {
      slug: "njsbr",
      name: "Nigerian Journal of Social and Behavioural Research",
      shortName: "NJSBR",
      description:
        "Promoting rigorous empirical inquiry, theoretical advancements, and policy research in social and behavioural sciences.",
    },
  ]) {
    await prisma.journal.upsert({
      where: { slug: item.slug },
      update: {
        departmentId: null,
        name: item.name,
        shortName: item.shortName,
        description: item.description,
        institution: "Imo State University",
        faculty: "Faculty of Social Sciences",
        isActive: true,
      },
      create: {
        ...item,
        departmentId: null,
        institution: "Imo State University",
        faculty: "Faculty of Social Sciences",
        isActive: true,
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
