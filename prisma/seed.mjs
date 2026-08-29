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

  console.log(
    "✓ Seeded 7 departments and 10 active journals (3 Faculty, 7 Departmental).",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
