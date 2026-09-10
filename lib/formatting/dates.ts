export const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export const dayMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatShortDate(
  dateInput: string | number | Date | null | undefined,
): string {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    return shortDateFormatter.format(d);
  } catch {
    return "";
  }
}

export function formatLongDate(
  dateInput: string | number | Date | null | undefined,
): string {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    return longDateFormatter.format(d);
  } catch {
    return "";
  }
}

export function formatDayMonthDate(
  dateInput: string | number | Date | null | undefined,
): string {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    return dayMonthFormatter.format(d);
  } catch {
    return "";
  }
}
