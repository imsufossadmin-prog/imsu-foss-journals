import { redirect } from "next/navigation";

import { WorkspaceChooser } from "@/components/app/workspace-chooser";
import { requireApplicationArea } from "@/lib/auth/authorization";
import {
  getJournalWorkspaces,
  getPostLoginDestination,
} from "@/lib/auth/workspaces";

export default async function EditorPage() {
  const user = await requireApplicationArea("editor");
  const journalWorkspaces = getJournalWorkspaces(user, "EDITOR");

  if (journalWorkspaces.length === 1) redirect(journalWorkspaces[0].href);
  if (journalWorkspaces.length === 0) {
    redirect(getPostLoginDestination(user));
  }

  return (
    <WorkspaceChooser
      displayName={user.displayName}
      workspaces={journalWorkspaces}
      title="Choose an editorial journal."
      description="Each editorial workspace is isolated. Select the journal whose assignments you want to enter."
    />
  );
}
