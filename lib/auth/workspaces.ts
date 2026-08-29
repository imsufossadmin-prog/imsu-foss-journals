import type { GlobalRole, JournalRole } from "@prisma/client";

import {
  canonicalSubmissionEntryPath,
  getSafeLoginReturnPath,
} from "@/lib/auth/submission-entry";

export type WorkspaceJournal = {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  isActive: boolean;
  department?: {
    id: string;
    slug: string;
    name: string;
    isActive: boolean;
  } | null;
};

export type WorkspaceSubject = {
  globalRoles: Array<{ role: GlobalRole }>;
  journalRoles: Array<{
    journalId: string;
    role: JournalRole;
    journal: WorkspaceJournal;
  }>;
};

export type ProductWorkspace = {
  id: string;
  href: string;
  area: "platform" | "journal-admin" | "editor" | "author";
  roleLabel: string;
  title: string;
  description: string;
  journal: WorkspaceJournal | null;
};

const workspaceOrder: ProductWorkspace["area"][] = [
  "platform",
  "journal-admin",
  "editor",
  "author",
];

export function getAvailableWorkspaces(subject: WorkspaceSubject) {
  const workspaces: ProductWorkspace[] = [];
  const hasStaffRole =
    subject.globalRoles.some(({ role }) => role === "SUPER_ADMIN") ||
    subject.journalRoles.some(({ journal }) => journal.isActive);

  if (subject.globalRoles.some(({ role }) => role === "SUPER_ADMIN")) {
    workspaces.push({
      id: "platform:super-admin",
      href: "/admin",
      area: "platform",
      roleLabel: "Super Administrator",
      title: "Platform administration",
      description: "Oversee the journal platform at the institutional level.",
      journal: null,
    });
  }

  for (const assignment of subject.journalRoles) {
    if (!assignment.journal.isActive) continue;

    if (assignment.role === "JOURNAL_ADMIN") {
      workspaces.push({
        id: `journal-admin:${assignment.journalId}`,
        href: `/admin/${assignment.journal.slug}`,
        area: "journal-admin",
        roleLabel: "Journal Administrator",
        title: assignment.journal.department
          ? `${assignment.journal.department.name} operations`
          : `${assignment.journal.name} operations`,
        description: assignment.journal.department
          ? "Manage journal activity for this department."
          : "Manage faculty journal operations.",
        journal: assignment.journal,
      });
    } else {
      workspaces.push({
        id: `editor:${assignment.journalId}`,
        href: `/editor/${assignment.journal.slug}`,
        area: "editor",
        roleLabel: "Editor",
        title: assignment.journal.department
          ? `${assignment.journal.department.name} editor workspace`
          : `${assignment.journal.name} editor workspace`,
        description: "Enter the editorial review workspace.",
        journal: assignment.journal,
      });
    }
  }

  if (
    !hasStaffRole &&
    subject.globalRoles.some(({ role }) => role === "AUTHOR")
  ) {
    workspaces.push({
      id: "author:personal",
      href: "/author",
      area: "author",
      roleLabel: "Author",
      title: "Research workspace",
      description: "Manage your work as a submitting author.",
      journal: null,
    });
  }

  return workspaces.sort(
    (left, right) =>
      workspaceOrder.indexOf(left.area) - workspaceOrder.indexOf(right.area) ||
      left.title.localeCompare(right.title),
  );
}

export function getPostLoginDestination(
  subject: WorkspaceSubject,
  requestedPath?: unknown,
) {
  const returnPath = getSafeLoginReturnPath(requestedPath);
  if (returnPath) {
    return subject.globalRoles.some(({ role }) => role === "AUTHOR")
      ? canonicalSubmissionEntryPath
      : "/unauthorized?reason=author";
  }

  if (subject.globalRoles.some(({ role }) => role === "SUPER_ADMIN")) {
    return "/admin";
  }

  const workspaces = getAvailableWorkspaces(subject);

  if (workspaces.length === 1) {
    return workspaces[0].href;
  }

  if (workspaces.length > 1) {
    return "/workspaces";
  }

  if (subject.globalRoles.some(({ role }) => role === "AUTHOR")) {
    return "/author";
  }

  return "/unauthorized?reason=workspace";
}

export function getJournalWorkspaces(
  subject: WorkspaceSubject,
  role: JournalRole,
) {
  const area = role === "JOURNAL_ADMIN" ? "journal-admin" : "editor";

  return getAvailableWorkspaces(subject).filter(
    (workspace) => workspace.area === area,
  );
}
