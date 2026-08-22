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
  const workspace =
    workspaces.find((item) => item.area === "author") ??
    (user.globalRoles.some(({ role }) => role === "SUPER_ADMIN")
      ? {
          id: "author:super-admin",
          href: "/author",
          area: "author" as const,
          roleLabel: "Author workspace",
          title: "Research workspace",
          description: "Personal author workspace.",
          journal: null,
        }
      : null);

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
