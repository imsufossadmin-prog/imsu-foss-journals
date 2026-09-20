import type { GlobalRole } from "@prisma/client";

export const publicSubmissionEntryPath = "/submit";
export const canonicalSubmissionEntryPath = "/author/submissions/new";

type SubmissionEntrySubject = {
  isActive: boolean;
  globalRoles: Array<{ role: GlobalRole }>;
};

export function getSafeLoginReturnPath(value: unknown) {
  if (typeof value === "string") {
    if (
      value === canonicalSubmissionEntryPath ||
      value === "/author/requests/new" ||
      value.startsWith(`${canonicalSubmissionEntryPath}?`)
    ) {
      return value;
    }
  }
  return null;
}

export function getSubmissionEntryDestination(
  subject: SubmissionEntrySubject | null,
  journalSlug?: string,
) {
  const targetPath = journalSlug
    ? `${canonicalSubmissionEntryPath}?journal=${encodeURIComponent(journalSlug)}`
    : canonicalSubmissionEntryPath;

  if (!subject) {
    return `/login?next=${encodeURIComponent(targetPath)}`;
  }
  if (!subject.isActive) return "/unauthorized?reason=inactive";
  if (!subject.globalRoles.some(({ role }) => role === "AUTHOR")) {
    return "/unauthorized?reason=author";
  }
  return targetPath;
}
