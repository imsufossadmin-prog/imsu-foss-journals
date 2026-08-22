import type { ReactNode } from "react";

import { requireApplicationArea } from "@/lib/auth/authorization";

type EditorLayoutProps = {
  children: ReactNode;
};

export default async function EditorLayout({ children }: EditorLayoutProps) {
  await requireApplicationArea("editor");

  return <>{children}</>;
}
