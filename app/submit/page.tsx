import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/authorization";
import { getSubmissionEntryDestination } from "@/lib/auth/submission-entry";

export default async function SubmissionEntryPage() {
  redirect(getSubmissionEntryDestination(await getCurrentUser()));
}
