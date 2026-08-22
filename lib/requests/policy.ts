export type RequestActor = {
  id: string;
  active: boolean;
  superAdmin?: boolean;
  author: boolean;
  adminDepartmentIds: string[];
};

export type RequestScope = {
  authorId: string;
  departmentId: string;
};

export function canAccessRequest(actor: RequestActor, request: RequestScope) {
  return (
    actor.active &&
    (Boolean(actor.superAdmin) ||
      actor.id === request.authorId ||
      actor.adminDepartmentIds.includes(request.departmentId))
  );
}

export function canManageRequest(actor: RequestActor, request: RequestScope) {
  return (
    actor.active &&
    (Boolean(actor.superAdmin) ||
      actor.adminDepartmentIds.includes(request.departmentId))
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
    request.status === "SUBMISSION_ENABLED"
  );
}
