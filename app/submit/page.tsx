import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/authorization";
import { getSubmissionEntryDestination } from "@/lib/auth/submission-entry";

export default async function SubmissionEntryPage({
  searchParams,
}: {
  searchParams?: Promise<{ journal?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  redirect(
    getSubmissionEntryDestination(await getCurrentUser(), params?.journal),
  );
}
