import { redirect } from "next/navigation";

import { AuthenticatedShell } from "@/components/app/authenticated-shell";
import { ReviewerApplicationsManager } from "@/components/admin/reviewer-applications-manager";
import { requireApplicationArea } from "@/lib/auth/authorization";
import { getAvailableWorkspaces } from "@/lib/auth/workspaces";
import { getReviewerApplications } from "@/lib/editorial/reviewer-applications-store";

export const dynamic = "force-dynamic";

export default async function AdminReviewersPage() {
  const user = await requireApplicationArea("admin");
  const workspaces = getAvailableWorkspaces(user);
  const workspace =
    workspaces.find((item) => item.area === "platform") ?? workspaces[0];

  if (!workspace) {
    redirect("/unauthorized?reason=workspace");
  }

  const applications = await getReviewerApplications(user);

  return (
    <AuthenticatedShell
      user={user}
      workspace={workspace}
      workspaces={workspaces}
      navigation={[
        { href: "/admin", label: "Overview" },
        { href: "/admin/requests", label: "Requests" },
        { href: "/admin/submissions", label: "Manuscripts" },
        { href: "/admin/articles", label: "Articles & Content" },
        { href: "/admin/editorial-board", label: "Editorial Board" },
        { href: "/admin/reviewers", label: "Reviewers" },
        { href: "/admin/announcements", label: "Announcements" },
        { href: "/admin/access", label: "Users" },
      ]}
    >
      <ReviewerApplicationsManager initialApplications={applications} />
    </AuthenticatedShell>
  );
}
