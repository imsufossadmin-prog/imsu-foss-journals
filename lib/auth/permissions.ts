import type { GlobalRole, JournalRole } from "@prisma/client";

export type AuthorizationSubject = {
  globalRoles: Array<{ role: GlobalRole }>;
  journalRoles: Array<{ journalId: string; role: JournalRole }>;
};

export type ApplicationArea = "admin" | "editor" | "author";

export function hasGlobalRole(subject: AuthorizationSubject, role: GlobalRole) {
  return subject.globalRoles.some((assignment) => assignment.role === role);
}

export function isSuperAdmin(subject: AuthorizationSubject) {
  return hasGlobalRole(subject, "SUPER_ADMIN");
}

export function hasJournalRole(
  subject: AuthorizationSubject,
  journalId: string,
  roles: JournalRole | JournalRole[],
) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return subject.journalRoles.some(
    (assignment) =>
      assignment.journalId === journalId &&
      allowedRoles.includes(assignment.role),
  );
}

export function canAccessApplicationArea(
  subject: AuthorizationSubject,
  area: ApplicationArea,
) {
  if (isSuperAdmin(subject)) {
    return true;
  }

  if (area === "admin") {
    return subject.journalRoles.some(
      (assignment) => assignment.role === "JOURNAL_ADMIN",
    );
  }

  if (area === "editor") {
    return subject.journalRoles.some(
      (assignment) => assignment.role === "EDITOR",
    );
  }

  return hasGlobalRole(subject, "AUTHOR");
}

export function getRoleLandingPage(subject: AuthorizationSubject) {
  if (canAccessApplicationArea(subject, "admin")) return "/admin";
  if (canAccessApplicationArea(subject, "editor")) return "/editor";
  if (canAccessApplicationArea(subject, "author")) return "/author";

  return "/unauthorized";
}
