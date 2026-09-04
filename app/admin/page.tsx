import { redirect } from "next/navigation";

import { SuperAdminDashboard } from "@/components/admin/super-admin-dashboard";
import { AuthenticatedShell } from "@/components/app/authenticated-shell";
import { WorkspaceChooser } from "@/components/app/workspace-chooser";
import { requireApplicationArea } from "@/lib/auth/authorization";
import { isSuperAdmin } from "@/lib/auth/permissions";
import {
  getActiveDepartmentJournals,
  getPlatformOperationalCounts,
  getPlatformStaffCounts,
} from "@/lib/requests/data";
import {
  getAvailableWorkspaces,
  getJournalWorkspaces,
} from "@/lib/auth/workspaces";
import {
  getJournalActivationMap,
  isLeadSystemOwner,
} from "@/lib/editorial/journal-activation";
import { setJournalOperationalStateAction } from "@/app/admin/journal-activation-actions";

export default async function AdminPage() {
  const user = await requireApplicationArea("admin");
  const workspaces = getAvailableWorkspaces(user);

  if (!isSuperAdmin(user)) {
    const journalWorkspaces = getJournalWorkspaces(user, "JOURNAL_ADMIN");

    if (journalWorkspaces.length === 1) redirect(journalWorkspaces[0].href);
    if (journalWorkspaces.length === 0) {
      redirect("/unauthorized?reason=workspace");
    }

    return (
      <WorkspaceChooser
        displayName={user.displayName}
        workspaces={journalWorkspaces}
        title="Choose a journal to administer."
        description="Your access is scoped to the journal you select. You can change context later from the workspace header."
      />
    );
  }

  const workspace = workspaces.find((item) => item.area === "platform");
  if (!workspace) redirect("/unauthorized?reason=workspace");

  const [operational, staff, journals, activationMap] = await Promise.all([
    getPlatformOperationalCounts(),
    getPlatformStaffCounts(),
    getActiveDepartmentJournals(),
    getJournalActivationMap(),
  ]);

  const augmentedJournals = journals.map((j) => ({
    ...j,
    isActivated: Boolean(activationMap[j.slug]),
  }));

  const isBreakGlass = isLeadSystemOwner(user);

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
        { href: "/admin/access", label: "Users" },
      ]}
    >
      <SuperAdminDashboard
        operational={operational}
        staff={staff}
        journals={augmentedJournals}
        isBreakGlass={isBreakGlass}
        activateAction={setJournalOperationalStateAction}
      />
    </AuthenticatedShell>
  );
}
