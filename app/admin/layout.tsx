import type { ReactNode } from "react";

import { requireApplicationArea } from "@/lib/auth/authorization";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireApplicationArea("admin");

  return <>{children}</>;
}
