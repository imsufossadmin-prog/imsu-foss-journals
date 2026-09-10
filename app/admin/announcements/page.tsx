import { redirect } from "next/navigation";

import { AuthenticatedShell } from "@/components/app/authenticated-shell";
import { AnnouncementsManager } from "@/components/admin/announcements-manager";
import { requireApplicationArea } from "@/lib/auth/authorization";
import { getAvailableWorkspaces } from "@/lib/auth/workspaces";
import { getAnnouncements } from "@/lib/editorial/announcements-store";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const user = await requireApplicationArea("admin");
  const workspaces = getAvailableWorkspaces(user);
  const workspace =
    workspaces.find((item) => item.area === "platform") ?? workspaces[0];

  if (!workspace) {
    redirect("/unauthorized?reason=workspace");
  }

  const announcements = await getAnnouncements(user, { includeInactive: true });

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
      <AnnouncementsManager initialAnnouncements={announcements} />
    </AuthenticatedShell>
  );
}
