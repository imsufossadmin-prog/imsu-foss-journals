import { getSafeLoginReturnPath } from "@/lib/auth/submission-entry";

export function getApplicationUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) throw new Error("NEXT_PUBLIC_APP_URL is required.");

  const url = new URL(configured);
  if (!(["http:", "https:"] as string[]).includes(url.protocol)) {
    throw new Error("NEXT_PUBLIC_APP_URL must use HTTP or HTTPS.");
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

export function getOAuthCallbackUrl(returnTo: unknown) {
  const callback = new URL("/auth/callback", getApplicationUrl());
  const safeReturn = getSafeLoginReturnPath(returnTo);
  if (safeReturn) callback.searchParams.set("next", safeReturn);
  return callback.toString();
}
