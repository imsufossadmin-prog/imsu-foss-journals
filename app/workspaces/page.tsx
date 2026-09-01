import { redirect } from "next/navigation";

import { WorkspaceChooser } from "@/components/app/workspace-chooser";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { getAvailableWorkspaces } from "@/lib/auth/workspaces";
import { getJournalActivationMap } from "@/lib/editorial/journal-activation";

export default async function WorkspacesPage() {
  const user = await requireAuthenticatedUser();
  const rawWorkspaces = getAvailableWorkspaces(user);

  if (rawWorkspaces.length === 0) {
    redirect("/unauthorized?reason=workspace");
  }

  if (rawWorkspaces.length === 1) {
    redirect(rawWorkspaces[0].href);
  }

  const activationMap = await getJournalActivationMap();
  const workspaces = rawWorkspaces.map((ws) => {
    if (ws.journal && activationMap[ws.journal.slug] === false) {
      return { ...ws, badge: "Configuration required" };
    }
    return ws;
  });

  return (
    <WorkspaceChooser
      displayName={user.displayName}
      workspaces={workspaces}
      title="Choose a workspace."
      description="Select the workspace you want to enter. You can switch between your assigned journals at any time."
    />
  );
}
