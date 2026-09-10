export type EditorialMemberCategory =
  | "CHIEF_EDITOR"
  | "DEPUTY_EDITOR"
  | "ASSOCIATE_EDITOR"
  | "MANAGING_EDITOR"
  | "BOARD_MEMBER"
  | "CONSULTING_EDITOR"
  | "ADVISORY_BOARD";

export type EditorialBoardMember = {
  id: string;
  name: string;
  role: string;
  affiliation: string;
  category: EditorialMemberCategory;
  order?: number;
};

export type JournalMetadata = {
  slug: string;
  canonicalSlug: string;
  dbSlugs: string[];
  title: string;
  shortName: string;
  department: string;
  faculty: string;
  institution: string;
  issnPrint?: string;
  issnOnline?: string;
  frequency: string;
  aimsAndScope: string;
  peerReviewPolicy: string;
  referencingStyle: string;
  contactEmail: string;
  showMetadataOnHomepage?: boolean;
};

export const CANONICAL_JOURNAL_METADATA: Record<string, JournalMetadata> = {
  njcp: {
    slug: "njcp",
    canonicalSlug: "njcp",
    dbSlugs: ["njcp", "psychology"],
    title: "Nigerian Journal of Contemporary Psychology",
    shortName: "NJCP",
    department: "Department of Psychology",
    faculty: "Faculty of Social Sciences",
    institution: "Imo State University",
    issnPrint: "2756-4924",
    issnOnline: "2756-4932",
    frequency: "Bi-Annual (2 Issues / Year)",
    aimsAndScope:
      "The Nigerian Journal of Contemporary Psychology (NJCP) is a peer-reviewed, open-access scholarly periodical dedicated to publishing high-quality empirical, theoretical, and applied research in psychology. The journal publishes cutting-edge contributions across clinical, developmental, social, organizational, educational, experimental, and forensic psychology, with special focus on contemporary psychological issues in Nigerian, African, and global settings.",
    peerReviewPolicy:
      "Double-blind peer review by at least two independent discipline specialists evaluating methodology, empirical rigor, and theoretical contribution.",
    referencingStyle: "APA 7th Edition",
    contactEmail: "psychology.journal@imsu.edu.ng",
    showMetadataOnHomepage: false,
  },
  ajsbs: {
    slug: "ajsbs",
    canonicalSlug: "ajsbs",
    dbSlugs: ["ajsbs"],
    title: "African Journal of Social and Behavioural Sciences",
    shortName: "AJSBS",
    department: "Faculty of Social Sciences",
    faculty: "Faculty of Social Sciences",
    institution: "Imo State University",
    issnPrint: "2141-209X",
    issnOnline: "2756-5122",
    frequency: "Quarterly (4 Issues / Year)",
    aimsAndScope:
      "Launched in 2009, the African Journal of Social and Behavioural Sciences (AJSBS) is the official flagship interdisciplinary journal of the Faculty of Social Sciences at Imo State University. It publishes cutting-edge peer-reviewed research across political science, public administration, public relations, communication, geography, environmental management, information sciences, sociology, psychology, psychotherapy, criminology, and economics.",
    peerReviewPolicy:
      "Rigorous double-blind peer review ensuring objective assessment and academic excellence across multidisciplinary fields.",
    referencingStyle: "APA 7th Edition",
    contactEmail: "fossjournals@gmail.com",
    showMetadataOnHomepage: false,
  },
  njsr: {
    slug: "njsr",
    canonicalSlug: "njsr",
    dbSlugs: ["njsr", "njsbr"],
    title: "Nwaebere Journal of Scientific Research",
    shortName: "NJSR",
    department: "Faculty of Social Sciences",
    faculty: "Faculty of Social Sciences",
    institution: "Imo State University",
    issnPrint: "2814-0826",
    issnOnline: "2814-0834",
    frequency: "Bi-Annual (2 Issues / Year)",
    aimsAndScope:
      "Named to honour Imo State University academic heritage, the Nwaebere Journal of Scientific Research (NJSR) focuses on innovative empirical and theoretical scientific research inspired by African contexts while addressing global scientific and societal challenges.",
    peerReviewPolicy:
      "Double-blind peer review conducted by senior scholars and methodological experts.",
    referencingStyle: "APA 7th Edition",
    contactEmail: "njsr.editor@imsu.edu.ng",
    showMetadataOnHomepage: false,
  },
  gjcsr: {
    slug: "gjcsr",
    canonicalSlug: "gjcsr",
    dbSlugs: ["gjcsr", "gjsbr"],
    title: "Global Journal of Contemporary Social Research",
    shortName: "GJCSR",
    department: "Faculty of Social Sciences",
    faculty: "Faculty of Social Sciences",
    institution: "Imo State University",
    issnPrint: "2955-1218",
    issnOnline: "2955-1226",
    frequency: "Bi-Annual (2 Issues / Year)",
    aimsAndScope:
      "The Global Journal of Contemporary Social Research (GJCSR) is dedicated to advancing international perspectives on contemporary societal, behavioural, economic, and institutional developments worldwide, encouraging cross-regional and interdisciplinary scholarship.",
    peerReviewPolicy:
      "Double-blind international peer review emphasizing innovative methodologies and theoretical relevance.",
    referencingStyle: "APA 7th Edition",
    contactEmail: "gjcsr.journal@imsu.edu.ng",
    showMetadataOnHomepage: false,
  },
};

export function resolveCanonicalJournalSlug(slug: string): string {
  const norm = slug.trim().toLowerCase();
  if (norm === "psychology" || norm === "njcp") return "njcp";
  if (norm === "njsbr" || norm === "njsr") return "njsr";
  if (norm === "gjsbr" || norm === "gjcsr") return "gjcsr";
  if (norm === "ajsbs") return "ajsbs";
  return norm;
}

export function getJournalMetadata(slug: string): JournalMetadata | null {
  const canonical = resolveCanonicalJournalSlug(slug);
  return CANONICAL_JOURNAL_METADATA[canonical] ?? null;
}

export function getJournalDbSlugs(slug: string): string[] {
  const meta = getJournalMetadata(slug);
  if (meta) return meta.dbSlugs;
  const norm = slug.trim().toLowerCase();
  return [norm];
}

// ---------------------------------------------------------------------------
// Canonical Editorial Board Definitions
// ---------------------------------------------------------------------------

export const NJCP_EDITORIAL_BOARD: EditorialBoardMember[] = [
  {
    id: "njcp-chief",
    name: "Prof Nkwam C. Uwaoma",
    role: "Chief Editor",
    affiliation:
      "Department of Psychology, Imo State University, Owerri, Nigeria",
    category: "CHIEF_EDITOR",
    order: 1,
  },
  {
    id: "njcp-deputy",
    name: "Ethelbert Njoku PhD",
    role: "Deputy Editor",
    affiliation:
      "Department of Psychology, Imo State University, Owerri, Nigeria",
    category: "DEPUTY_EDITOR",
    order: 2,
  },
  {
    id: "njcp-assoc",
    name: "Ann Ukachi Madukwe PhD",
    role: "Associate Editor",
    affiliation:
      "Department of Psychology, Imo State University, Owerri, Nigeria",
    category: "ASSOCIATE_EDITOR",
    order: 3,
  },
  {
    id: "njcp-managing",
    name: "Richards E. Ebeh, PhD",
    role: "Managing Editor",
    affiliation:
      "Department of Psychology, Imo State University, Owerri, Nigeria",
    category: "MANAGING_EDITOR",
    order: 4,
  },
  // Board Members
  {
    id: "njcp-bm-1",
    name: "Prof Charles I. Mbaeze",
    role: "Editorial Board Member",
    affiliation:
      "Department of Psychology, Imo State University, Owerri, Nigeria",
    category: "BOARD_MEMBER",
    order: 5,
  },
  {
    id: "njcp-bm-2",
    name: "Prof Cletus N. Offor",
    role: "Editorial Board Member",
    affiliation:
      "Department of Psychology, Imo State University, Owerri, Nigeria",
    category: "BOARD_MEMBER",
    order: 6,
  },
  {
    id: "njcp-bm-3",
    name: "Ngozi Sydney-Agbor, PhD",
    role: "Editorial Board Member",
    affiliation:
      "Department of Psychology, Imo State University, Owerri, Nigeria",
    category: "BOARD_MEMBER",
    order: 7,
  },
  {
    id: "njcp-bm-4",
    name: "Leonard C. Onwukwe, PhD",
    role: "Editorial Board Member",
    affiliation:
      "Department of Psychology, Imo State University, Owerri, Nigeria",
    category: "BOARD_MEMBER",
    order: 8,
  },
  {
    id: "njcp-bm-5",
    name: "Helen Ihuoma Nnamdi-Annozie, PhD",
    role: "Editorial Board Member",
    affiliation:
      "Department of Psychology, Imo State University, Owerri, Nigeria",
    category: "BOARD_MEMBER",
    order: 9,
  },
  {
    id: "njcp-bm-6",
    name: "Miracle Ifeoma Mbagwu, PhD",
    role: "Editorial Board Member",
    affiliation:
      "Department of Psychology, Imo State University, Owerri, Nigeria",
    category: "BOARD_MEMBER",
    order: 10,
  },
  // Consulting Editors
  {
    id: "njcp-ce-1",
    name: "Prof R.N. Ugokwe-Ossai",
    role: "Consulting Editor",
    affiliation:
      "Department of Psychology, Nnamdi Azikiwe University, Awka, Nigeria",
    category: "CONSULTING_EDITOR",
    order: 11,
  },
  {
    id: "njcp-ce-2",
    name: "Prof Benjamin O. Ehighie",
    role: "Consulting Editor",
    affiliation:
      "Department of Psychology, University of Ibadan, Ibadan, Nigeria",
    category: "CONSULTING_EDITOR",
    order: 12,
  },
  {
    id: "njcp-ce-3",
    name: "Prof Ike Ernest Onyishi",
    role: "Consulting Editor",
    affiliation:
      "Department of Psychology, University of Nigeria, Nsukka, Nigeria",
    category: "CONSULTING_EDITOR",
    order: 13,
  },
  {
    id: "njcp-ce-4",
    name: "Prof Nnamdi Obikeze",
    role: "Consulting Editor",
    affiliation:
      "Chukwuemeka Odumegwu Ojukwu University, Anambra State, Nigeria",
    category: "CONSULTING_EDITOR",
    order: 14,
  },
];

export const AJSBS_EDITORIAL_BOARD: EditorialBoardMember[] = [
  {
    id: "ajsbs-chief",
    name: "Prof. Ikechukwu J.D. Nwosu",
    role: "Chief Editor",
    affiliation:
      "Faculty of Social Sciences, Imo State University, Owerri, Nigeria",
    category: "CHIEF_EDITOR",
    order: 1,
  },
  {
    id: "ajsbs-deputy",
    name: "Vin O. Umeh, Ph.D.",
    role: "Deputy Editor",
    affiliation:
      "Faculty of Social Sciences, Imo State University, Owerri, Nigeria",
    category: "DEPUTY_EDITOR",
    order: 2,
  },
  {
    id: "ajsbs-managing",
    name: "Richards E. Ebeh, Ph.D.",
    role: "Managing Editor",
    affiliation:
      "Faculty of Social Sciences, Imo State University, Owerri, Nigeria",
    category: "MANAGING_EDITOR",
    order: 3,
  },
  {
    id: "ajsbs-assoc-1",
    name: "Prof. Agness Osita-Njoku",
    role: "Associate Editor",
    affiliation:
      "Faculty of Social Sciences, Imo State University, Owerri, Nigeria",
    category: "ASSOCIATE_EDITOR",
    order: 4,
  },
  {
    id: "ajsbs-assoc-2",
    name: "Prof. Sam Ezeanyika",
    role: "Associate Editor",
    affiliation:
      "Faculty of Social Sciences, Imo State University, Owerri, Nigeria",
    category: "ASSOCIATE_EDITOR",
    order: 5,
  },
  {
    id: "ajsbs-assoc-3",
    name: "Prof. Okechi D. Azuwike",
    role: "Associate Editor",
    affiliation:
      "Faculty of Social Sciences, Imo State University, Owerri, Nigeria",
    category: "ASSOCIATE_EDITOR",
    order: 6,
  },
  {
    id: "ajsbs-assoc-4",
    name: "Prof. Andrew A. Igwemma",
    role: "Associate Editor",
    affiliation:
      "Faculty of Social Sciences, Imo State University, Owerri, Nigeria",
    category: "ASSOCIATE_EDITOR",
    order: 7,
  },
  {
    id: "ajsbs-assoc-5",
    name: "Prof. B.J.C. Anyanwu",
    role: "Associate Editor",
    affiliation:
      "Faculty of Social Sciences, Imo State University, Owerri, Nigeria",
    category: "ASSOCIATE_EDITOR",
    order: 8,
  },
  {
    id: "ajsbs-assoc-6",
    name: "Ngozi Sydney-Agbor, PhD",
    role: "Associate Editor",
    affiliation:
      "Faculty of Social Sciences, Imo State University, Owerri, Nigeria",
    category: "ASSOCIATE_EDITOR",
    order: 9,
  },
  // Advisory Board
  {
    id: "ajsbs-adv-1",
    name: "Prof. Nkwam C. Uwaoma",
    role: "Advisory Board Member",
    affiliation: "Founding Editor & Advisory Chair, Imo State University",
    category: "ADVISORY_BOARD",
    order: 10,
  },
  {
    id: "ajsbs-adv-2",
    name: "Prof. B.T.O. Ikegwuoha",
    role: "Advisory Board Member",
    affiliation: "Faculty of Social Sciences, Imo State University",
    category: "ADVISORY_BOARD",
    order: 11,
  },
  {
    id: "ajsbs-adv-3",
    name: "Prof. Fabian Emerenini",
    role: "Advisory Board Member",
    affiliation: "Faculty of Social Sciences, Imo State University",
    category: "ADVISORY_BOARD",
    order: 12,
  },
  {
    id: "ajsbs-adv-4",
    name: "Prof. Benjamin Ehigie",
    role: "Advisory Board Member",
    affiliation: "University of Ibadan, Ibadan, Nigeria",
    category: "ADVISORY_BOARD",
    order: 13,
  },
  {
    id: "ajsbs-adv-5",
    name: "Prof. John Sambe",
    role: "Advisory Board Member",
    affiliation: "University of Jos, Jos, Nigeria",
    category: "ADVISORY_BOARD",
    order: 14,
  },
  {
    id: "ajsbs-adv-6",
    name: "Prof. Collins Nwaogwugwu",
    role: "Advisory Board Member",
    affiliation: "Faculty of Social Sciences, Imo State University",
    category: "ADVISORY_BOARD",
    order: 15,
  },
  {
    id: "ajsbs-adv-7",
    name: "Prof. Nchor Bichene Okorn",
    role: "Advisory Board Member",
    affiliation: "University of Calabar, Calabar, Nigeria",
    category: "ADVISORY_BOARD",
    order: 16,
  },
  {
    id: "ajsbs-adv-8",
    name: "Prof. Stanley Okafor",
    role: "Advisory Board Member",
    affiliation: "Faculty of Social Sciences, Imo State University",
    category: "ADVISORY_BOARD",
    order: 17,
  },
];

export const NJSR_EDITORIAL_BOARD: EditorialBoardMember[] = [
  {
    id: "njsr-chief",
    name: "Prof. Nkwam C. Uwaoma",
    role: "Chief Editor",
    affiliation:
      "Faculty of Social Sciences, Imo State University, Owerri, Nigeria",
    category: "CHIEF_EDITOR",
    order: 1,
  },
  {
    id: "njsr-deputy",
    name: "Prof. Fabian Emerenini",
    role: "Deputy Editor",
    affiliation:
      "Faculty of Social Sciences, Imo State University, Owerri, Nigeria",
    category: "DEPUTY_EDITOR",
    order: 2,
  },
  {
    id: "njsr-managing",
    name: "Richards E. Ebeh, Ph.D.",
    role: "Managing Editor",
    affiliation:
      "Faculty of Social Sciences, Imo State University, Owerri, Nigeria",
    category: "MANAGING_EDITOR",
    order: 3,
  },
  {
    id: "njsr-bm-1",
    name: "Prof. Charles I. Mbaeze",
    role: "Editorial Board Member",
    affiliation: "Faculty of Social Sciences, Imo State University",
    category: "BOARD_MEMBER",
    order: 4,
  },
  {
    id: "njsr-bm-2",
    name: "Prof. Cletus N. Offor",
    role: "Editorial Board Member",
    affiliation: "Faculty of Social Sciences, Imo State University",
    category: "BOARD_MEMBER",
    order: 5,
  },
  {
    id: "njsr-bm-3",
    name: "Leonard C. Onwukwe, PhD",
    role: "Editorial Board Member",
    affiliation: "Faculty of Social Sciences, Imo State University",
    category: "BOARD_MEMBER",
    order: 6,
  },
  {
    id: "njsr-bm-4",
    name: "Ann Ukachi Madukwe PhD",
    role: "Editorial Board Member",
    affiliation: "Faculty of Social Sciences, Imo State University",
    category: "BOARD_MEMBER",
    order: 7,
  },
  {
    id: "njsr-ce-1",
    name: "Prof. Stanley Okafor",
    role: "Consulting Editor",
    affiliation: "Imo State University, Owerri, Nigeria",
    category: "CONSULTING_EDITOR",
    order: 8,
  },
  {
    id: "njsr-ce-2",
    name: "Prof. Benjamin Ehigie",
    role: "Consulting Editor",
    affiliation: "University of Ibadan, Ibadan, Nigeria",
    category: "CONSULTING_EDITOR",
    order: 9,
  },
];

export const GJCSR_EDITORIAL_BOARD: EditorialBoardMember[] = [
  {
    id: "gjcsr-chief",
    name: "Prof. B.T.O. Ikegwuoha",
    role: "Chief Editor",
    affiliation:
      "Faculty of Social Sciences, Imo State University, Owerri, Nigeria",
    category: "CHIEF_EDITOR",
    order: 1,
  },
  {
    id: "gjcsr-deputy",
    name: "Vin O. Umeh, Ph.D.",
    role: "Deputy Editor",
    affiliation:
      "Faculty of Social Sciences, Imo State University, Owerri, Nigeria",
    category: "DEPUTY_EDITOR",
    order: 2,
  },
  {
    id: "gjcsr-managing",
    name: "Richards E. Ebeh, Ph.D.",
    role: "Managing Editor",
    affiliation:
      "Faculty of Social Sciences, Imo State University, Owerri, Nigeria",
    category: "MANAGING_EDITOR",
    order: 3,
  },
  {
    id: "gjcsr-bm-1",
    name: "Prof. Sam Ezeanyika",
    role: "Editorial Board Member",
    affiliation: "Faculty of Social Sciences, Imo State University",
    category: "BOARD_MEMBER",
    order: 4,
  },
  {
    id: "gjcsr-bm-2",
    name: "Prof. Okechi D. Azuwike",
    role: "Editorial Board Member",
    affiliation: "Faculty of Social Sciences, Imo State University",
    category: "BOARD_MEMBER",
    order: 5,
  },
  {
    id: "gjcsr-bm-3",
    name: "Prof. Andrew A. Igwemma",
    role: "Editorial Board Member",
    affiliation: "Faculty of Social Sciences, Imo State University",
    category: "BOARD_MEMBER",
    order: 6,
  },
  {
    id: "gjcsr-bm-4",
    name: "Ethelbert Njoku PhD",
    role: "Editorial Board Member",
    affiliation: "Faculty of Social Sciences, Imo State University",
    category: "BOARD_MEMBER",
    order: 7,
  },
  {
    id: "gjcsr-ce-1",
    name: "Prof. Collins Nwaogwugwu",
    role: "Consulting Editor",
    affiliation: "Faculty of Social Sciences, Imo State University",
    category: "CONSULTING_EDITOR",
    order: 8,
  },
  {
    id: "gjcsr-ce-2",
    name: "Prof. Ike Ernest Onyishi",
    role: "Consulting Editor",
    affiliation: "University of Nigeria, Nsukka, Nigeria",
    category: "CONSULTING_EDITOR",
    order: 9,
  },
];

export const CANONICAL_EDITORIAL_BOARDS: Record<
  string,
  EditorialBoardMember[]
> = {
  njcp: NJCP_EDITORIAL_BOARD,
  ajsbs: AJSBS_EDITORIAL_BOARD,
  njsr: NJSR_EDITORIAL_BOARD,
  gjcsr: GJCSR_EDITORIAL_BOARD,
};

export function getDefaultEditorialBoard(slug: string): EditorialBoardMember[] {
  const canonical = resolveCanonicalJournalSlug(slug);
  return CANONICAL_EDITORIAL_BOARDS[canonical] || [];
}
