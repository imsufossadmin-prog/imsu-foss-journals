import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/authorization";

export const metadata: Metadata = {
  title: "Apply as a Peer Reviewer | IMSU FOSS Journals",
  description:
    "Join the editorial review board and referee academic manuscripts across the Faculty of Social Sciences, Imo State University.",
};

export default async function ApplyReviewerPage({
  searchParams,
}: {
  searchParams: Promise<{ journal?: string }>;
}) {
  const { journal } = await searchParams;
  const user = await getCurrentUser();

  const destination =
    "/author/apply-reviewer" +
    (journal ? `?journal=${encodeURIComponent(journal)}` : "");

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(destination)}`);
  }

  redirect(destination);
}
