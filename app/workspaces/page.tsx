import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { getPostLoginDestination } from "@/lib/auth/workspaces";

export default async function WorkspacesPage() {
  const user = await requireAuthenticatedUser();
  redirect(getPostLoginDestination(user));
}
