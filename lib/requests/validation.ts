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
    label: "New request",
    authorGuidance: "Your request has reached the Psychology journal team.",
  },
  AWAITING_PAYMENT: {
    label: "Payment required",
    authorGuidance:
      "Follow the payment instructions, then upload your receipt.",
  },
  RECEIPT_SUBMITTED: {
    label: "Receipt sent",
    authorGuidance: "The journal will confirm your receipt shortly.",
  },
  SUBMISSION_ENABLED: {
    label: "Payment confirmed",
    authorGuidance: "You can now submit your article.",
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
