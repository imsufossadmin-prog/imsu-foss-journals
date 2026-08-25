import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AuthenticatedShell } from "@/components/app/authenticated-shell";
import { requireApplicationArea } from "@/lib/auth/authorization";
import { getAvailableWorkspaces } from "@/lib/auth/workspaces";

type AuthorLayoutProps = {
  children: ReactNode;
};

export default async function AuthorLayout({ children }: AuthorLayoutProps) {
  const user = await requireApplicationArea("author");
  const workspaces = getAvailableWorkspaces(user);

  // If user has staff responsibilities (Editor, Journal Admin, Super Admin), redirect them to their operational workspace
  const operationalWorkspace = workspaces.find((w) => w.area !== "author");
  if (operationalWorkspace) {
    redirect(operationalWorkspace.href);
  }

  const workspace = workspaces.find((item) => item.area === "author");

  if (!workspace) redirect("/unauthorized?reason=workspace");

  return (
    <AuthenticatedShell
      user={user}
      workspace={workspace}
      workspaces={workspaces}
      navigation={[
        { href: "/author", label: "Submission requests", matchSubtree: true },
        { href: "/account", label: "Account" },
      ]}
    >
      {children}
    </AuthenticatedShell>
  );
}
