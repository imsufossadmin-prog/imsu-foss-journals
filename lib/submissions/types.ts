import type { FirstSubmissionFileType } from "@/lib/submissions/constants";

export type SubmissionAuthorInput = {
  fullName: string;
  email: string;
  affiliation: string;
  orcid: string;
  isCorrespondingAuthor: boolean;
};

export type SubmissionFileDTO = {
  id: string;
  type: FirstSubmissionFileType;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

export type AuthorSubmissionDTO = {
  id: string;
  trackingNumber: string | null;
  title: string | null;
  abstract: string | null;
  keywords: string[];
  status: string;
  version: number;
  declarationAccuracy: boolean;
  declarationAuthority: boolean;
  declarationReadiness: boolean;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  journal: {
    id: string;
    name: string;
    shortName: string | null;
    slug: string;
    description: string | null;
    isActive: boolean;
    department: { name: string; isActive: boolean };
  };
  request: { id: string } | null;
  authors: Array<SubmissionAuthorInput & { id: string; position: number }>;
  files: SubmissionFileDTO[];
};

export type ActionState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};
