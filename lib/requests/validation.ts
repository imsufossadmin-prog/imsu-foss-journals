const trackingPattern = /^[A-Z0-9][A-Z0-9._/-]{2,49}$/;

export function normalizeTrackingId(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-");
}

export function validateTrackingId(value: string) {
  const normalized = normalizeTrackingId(value);
  if (!trackingPattern.test(normalized)) {
    return "Use 3–50 letters, numbers, hyphens, slashes, dots, or underscores.";
  }
  return null;
}

export function validateMessageBody(value: string) {
  const body = value.trim();
  if (!body) return "Write a message before sending.";
  if (body.length > 5_000) return "Keep the message within 5,000 characters.";
  return null;
}

export const requestStatusContent = {
  NEW: {
    label: "Direct manuscript",
    authorGuidance:
      "Your direct submission is active. You can track manuscript progress here.",
  },
  AWAITING_PAYMENT: {
    label: "In progress",
    authorGuidance:
      "Your submission is in progress. You can track your manuscript at any time.",
  },
  RECEIPT_SUBMITTED: {
    label: "Update sent",
    authorGuidance: "Your conversation has been updated.",
  },
  SUBMISSION_ENABLED: {
    label: "Submitted",
    authorGuidance:
      "Your manuscript has been submitted for editorial screening.",
  },
  MANUSCRIPT_SUBMITTED: {
    label: "Awaiting tracking ID",
    authorGuidance:
      "Your manuscript was received. The journal will assign its tracking ID.",
  },
  TRACKING_ASSIGNED: {
    label: "Tracking ID assigned",
    authorGuidance:
      "Use the tracking ID whenever you contact the journal about this article.",
  },
} as const;
