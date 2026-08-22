import type { GlobalRole } from "@prisma/client";

export const publicSubmissionEntryPath = "/submit";
export const canonicalSubmissionEntryPath = "/author/requests/new";

type SubmissionEntrySubject = {
  isActive: boolean;
  globalRoles: Array<{ role: GlobalRole }>;
};

export function getSafeLoginReturnPath(value: unknown) {
  return value === canonicalSubmissionEntryPath
    ? canonicalSubmissionEntryPath
    : null;
}

export function getSubmissionEntryDestination(
  subject: SubmissionEntrySubject | null,
) {
  if (!subject) {
    return `/login?next=${encodeURIComponent(canonicalSubmissionEntryPath)}`;
  }
  if (!subject.isActive) return "/unauthorized?reason=inactive";
  if (!subject.globalRoles.some(({ role }) => role === "AUTHOR")) {
    return "/unauthorized?reason=author";
  }
  return canonicalSubmissionEntryPath;
}
