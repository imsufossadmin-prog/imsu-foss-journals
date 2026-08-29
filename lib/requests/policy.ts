export type RequestActor = {
  id: string;
  active: boolean;
  superAdmin?: boolean;
  author: boolean;
  adminDepartmentIds?: string[];
  adminJournalIds?: string[];
};

export type RequestScope = {
  authorId: string;
  journalId?: string;
  departmentId?: string | null;
};

export function canAccessRequest(actor: RequestActor, request: RequestScope) {
  return Boolean(
    actor.active &&
    (actor.superAdmin ||
      actor.id === request.authorId ||
      (request.departmentId &&
        actor.adminDepartmentIds?.includes(request.departmentId)) ||
      (request.journalId &&
        actor.adminJournalIds?.includes(request.journalId))),
  );
}

export function canManageRequest(actor: RequestActor, request: RequestScope) {
  return Boolean(
    actor.active &&
    (actor.superAdmin ||
      (request.departmentId &&
        actor.adminDepartmentIds?.includes(request.departmentId)) ||
      (request.journalId &&
        actor.adminJournalIds?.includes(request.journalId))),
  );
}

export function canUseSubmissionPermission(
  actor: RequestActor,
  request: RequestScope & { status: string },
) {
  return (
    actor.active &&
    actor.author &&
    actor.id === request.authorId &&
    request.status !== "TRACKING_ASSIGNED"
  );
}
