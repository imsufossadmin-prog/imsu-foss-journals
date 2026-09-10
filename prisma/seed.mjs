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

    const isPsychology = item.slug === "psychology";
    const journalName = isPsychology
      ? "Nigerian Journal of Contemporary Psychology (NJCP)"
      : `${item.name} Journal Operations`;
    const shortName = isPsychology ? "NJCP" : item.shortName;
    const description = isPsychology
      ? "Official peer-reviewed journal of the Department of Psychology, Faculty of Social Sciences, Imo State University."
      : `Academic journal operations for the Department of ${item.name}.`;

    await prisma.journal.upsert({
      where: { slug: item.slug },
      update: {
        departmentId: dept.id,
        name: journalName,
        shortName: shortName,
        description: description,
        institution: "Imo State University",
        faculty: "Faculty of Social Sciences",
        isActive: true,
      },
      create: {
        slug: item.slug,
        departmentId: dept.id,
        name: journalName,
        shortName: shortName,
        description: description,
        institution: "Imo State University",
        faculty: "Faculty of Social Sciences",
        isActive: true,
      },
    });
  }

  const facultyJournals = [
    {
      slug: "ajsbs",
      name: "African Journal of Social and Behavioural Sciences (AJSBS)",
      shortName: "AJSBS",
      description:
        "Official interdisciplinary journal of the Faculty of Social Sciences, Imo State University, publishing cutting-edge peer-reviewed research across social and behavioural sciences.",
    },
    {
      slug: "gjcsr",
      name: "Global Journal of Contemporary Social Research (GJCSR)",
      shortName: "GJCSR",
      description:
        "Advancing global perspectives and multidisciplinary inquiry on contemporary social, economic, and behavioural developments.",
    },
    {
      slug: "gjsbr",
      name: "Global Journal of Contemporary Social Research (GJCSR)",
      shortName: "GJCSR",
      description:
        "Advancing global perspectives and multidisciplinary inquiry on contemporary social, economic, and behavioural developments.",
    },
    {
      slug: "njsr",
      name: "Nwaebere Journal of Scientific Research (NJSR)",
      shortName: "NJSR",
      description:
        "Named to honour IMSU heritage, focusing on innovative empirical and theoretical research inspired by African and global contexts.",
    },
    {
      slug: "njsbr",
      name: "Nwaebere Journal of Scientific Research (NJSR)",
      shortName: "NJSR",
      description:
        "Named to honour IMSU heritage, focusing on innovative empirical and theoretical research inspired by African and global contexts.",
    },
  ];

  for (const item of facultyJournals) {
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

  console.log("✓ Seeded departments and canonical active journals.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
