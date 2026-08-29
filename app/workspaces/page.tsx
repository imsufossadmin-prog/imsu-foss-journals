import { redirect } from "next/navigation";

import { WorkspaceChooser } from "@/components/app/workspace-chooser";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { getAvailableWorkspaces } from "@/lib/auth/workspaces";

export default async function WorkspacesPage() {
  const user = await requireAuthenticatedUser();
  const workspaces = getAvailableWorkspaces(user);

  if (workspaces.length === 0) {
    redirect("/unauthorized?reason=workspace");
  }

  if (workspaces.length === 1) {
    redirect(workspaces[0].href);
  }

  return (
    <WorkspaceChooser
      displayName={user.displayName}
      workspaces={workspaces}
      title="Choose a workspace."
      description="Select the workspace you want to enter. You can switch between your assigned journals at any time."
    />
  );
}
