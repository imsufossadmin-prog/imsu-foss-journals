export const siteConfig = {
  name: "IMSU FOSS Journals",
  shortName: "FOSS Journals",
  description:
    "Digital Publishing Platform for the Faculty of Social Sciences, IMSU",
  faculty: "Faculty of Social Sciences",
  institution: "Imo State University",
  publicNavigation: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Editorial Board", href: "/editorial-board" },
    { label: "Current Issue", href: "/current-issue" },
    { label: "Archives", href: "/archives" },
    { label: "Submissions", href: "/submissions" },
  ],
} as const;
