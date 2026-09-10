"use server";

import { getCurrentUser } from "@/lib/auth/authorization";
import {
  deleteReviewerApplication,
  updateReviewerApplicationStatus,
  type ReviewerApplicationStatus,
} from "@/lib/editorial/reviewer-applications-store";

export type AdminReviewerActionState = {
  success?: boolean;
  error?: string;
};

export async function updateReviewerStatusAction(
  _prevState: AdminReviewerActionState,
  formData: FormData,
): Promise<AdminReviewerActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Authentication required." };

  const applicationId = formData.get("applicationId")?.toString() ?? "";
  const status = (formData.get("status")?.toString() ??
    "PENDING") as ReviewerApplicationStatus;

  return updateReviewerApplicationStatus({
    applicationId,
    status,
    actor: user,
  });
}

export async function deleteReviewerAction(
  _prevState: AdminReviewerActionState,
  formData: FormData,
): Promise<AdminReviewerActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Authentication required." };

  const applicationId = formData.get("applicationId")?.toString() ?? "";

  return deleteReviewerApplication({
    applicationId,
    actor: user,
  });
}
