import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/authorization";
import { getSubmissionEntryDestination } from "@/lib/auth/submission-entry";
import { createSubmissionRequest } from "@/lib/requests/mutations";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ journalSlug?: string }>;
}) {
  const user = await getCurrentUser();
  const { journalSlug } = await searchParams;
  if (
    !user ||
    !user.isActive ||
    !user.globalRoles.some(({ role }) => role === "AUTHOR")
  ) {
    redirect(getSubmissionEntryDestination(user));
  }
  const request = await createSubmissionRequest(user.id, journalSlug);
  redirect(`/author/requests/${request.id}`);
}
