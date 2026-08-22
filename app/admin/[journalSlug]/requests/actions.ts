"use server";

import { revalidatePath } from "next/cache";

import { requireApplicationArea } from "@/lib/auth/authorization";
import {
  assignTrackingId,
  confirmPaymentAndEnableSubmission,
  RequestMutationError,
  sendRequestMessage,
} from "@/lib/requests/mutations";
import type { RequestActionState } from "@/app/author/requests/actions";

function failure(error: unknown): RequestActionState {
  return error instanceof RequestMutationError
    ? { error: error.message, fieldErrors: error.fieldErrors }
    : { error: "We couldn’t save that change. Please try again." };
}

export async function sendAdminMessageAction(
  journalSlug: string,
  requestId: string,
  _state: RequestActionState,
  formData: FormData,
) {
  const user = await requireApplicationArea("admin");
  try {
    await sendRequestMessage({
      actorId: user.id,
      requestId,
      body: String(formData.get("body") ?? ""),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/admin/${journalSlug}/requests/${requestId}`);
  return { message: "Message sent." };
}

export async function confirmPaymentAction(
  journalSlug: string,
  requestId: string,
  _state: RequestActionState,
) {
  void _state;
  const user = await requireApplicationArea("admin");
  try {
    await confirmPaymentAndEnableSubmission(user.id, requestId);
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/admin/${journalSlug}/requests/${requestId}`);
  return { message: "Payment confirmed and submission enabled." };
}

export async function assignTrackingAction(
  journalSlug: string,
  requestId: string,
  _state: RequestActionState,
  formData: FormData,
) {
  const user = await requireApplicationArea("admin");
  try {
    await assignTrackingId({
      actorId: user.id,
      requestId,
      trackingId: String(formData.get("trackingId") ?? ""),
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/admin/${journalSlug}/requests/${requestId}`);
  return { message: "Tracking ID assigned." };
}
