export const activeJournalsConfig = [
  {
    name: "Nigerian Journal of Contemporary Psychology (NJCP)",
    shortName: "NJCP",
    slug: "njcp",
    aliasSlug: "psychology",
    href: "/journals/njcp",
    description: "Department of Psychology",
  },
  {
    name: "African Journal of Social and Behavioural Sciences (AJSBS)",
    shortName: "AJSBS",
    slug: "ajsbs",
    href: "/journals/ajsbs",
    description: "Faculty Flagship Journal",
  },
  {
    name: "Nwaebere Journal of Scientific Research (NJSR)",
    shortName: "NJSR",
    slug: "njsr",
    aliasSlug: "njsbr",
    href: "/journals/njsr",
    description: "Scientific & African Studies",
  },
  {
    name: "Global Journal of Contemporary Social Research (GJCSR)",
    shortName: "GJCSR",
    slug: "gjcsr",
    aliasSlug: "gjsbr",
    href: "/journals/gjcsr",
    description: "Contemporary Social Research",
  },
] as const;

export const siteConfig = {
  name: "IMSU FOSS Journals",
  shortName: "FOSS Journals",
  description:
    "Digital Publishing Platform for the Faculty of Social Sciences, IMSU",
  faculty: "Faculty of Social Sciences",
  institution: "Imo State University",
  activeJournals: activeJournalsConfig,
  publicNavigation: [
    { label: "Home", href: "/" },
    {
      label: "Journals",
      href: "/archives",
      children: [
        {
          label: "Nigerian Journal of Contemporary Psychology (NJCP)",
          shortName: "NJCP",
          href: "/journals/njcp",
          description: "Department of Psychology",
        },
        {
          label: "African Journal of Social and Behavioural Sciences (AJSBS)",
          shortName: "AJSBS",
          href: "/journals/ajsbs",
          description: "Faculty Flagship Journal",
        },
        {
          label: "Nwaebere Journal of Scientific Research (NJSR)",
          shortName: "NJSR",
          href: "/journals/njsr",
          description: "Scientific & African Studies",
        },
        {
          label: "Global Journal of Contemporary Social Research (GJCSR)",
          shortName: "GJCSR",
          href: "/journals/gjcsr",
          description: "Contemporary Social Research",
        },
      ],
    },
    { label: "Archives", href: "/archives" },
    { label: "Announcements", href: "/announcements" },
    { label: "Submissions", href: "/submissions" },
  ],
  footerNavigation: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Editorial Board", href: "/editorial-board" },
    { label: "Announcements", href: "/announcements" },
    { label: "Current Issue", href: "/current-issue" },
    { label: "Archives", href: "/archives" },
    { label: "Submissions", href: "/submissions" },
    { label: "Apply as a Reviewer", href: "/apply-reviewer" },
    { label: "Contact", href: "/contact" },
  ],
} as const;
