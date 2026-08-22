import { redirect } from "next/navigation";

import { WorkspaceChooser } from "@/components/app/workspace-chooser";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import {
  getAvailableWorkspaces,
  getPostLoginDestination,
} from "@/lib/auth/workspaces";

export default async function WorkspacesPage() {
  const user = await requireAuthenticatedUser();
  const workspaces = getAvailableWorkspaces(user);

  if (workspaces.length < 2) redirect(getPostLoginDestination(user));

  return (
    <WorkspaceChooser displayName={user.displayName} workspaces={workspaces} />
  );
}
