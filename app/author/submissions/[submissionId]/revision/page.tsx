import { redirect } from "next/navigation";

import { requireApplicationArea } from "@/lib/auth/authorization";
import { getAuthorSubmission } from "@/lib/submissions/data";

export default async function RevisionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const user = await requireApplicationArea("author");
  const { submissionId } = await params;
  const submission = await getAuthorSubmission(user.id, submissionId);
  if (!submission) redirect("/unauthorized?reason=workspace");
  redirect(`/author/submissions/${submission.id}?mode=correction`);
}
