import { NextResponse, type NextRequest } from "next/server";

import { provisionAuthenticatedUser } from "@/lib/auth/provisioning";
import { getSafeLoginReturnPath } from "@/lib/auth/submission-entry";
import { getPostLoginDestination } from "@/lib/auth/workspaces";
import { createClient } from "@/lib/supabase/server";

function localRedirect(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.nextUrl.origin));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = getSafeLoginReturnPath(request.nextUrl.searchParams.get("next"));
  if (!code)
    return localRedirect(request, "/login?error=google-sign-in-failed");

  try {
    const supabase = await createClient();
    const exchanged = await supabase.auth.exchangeCodeForSession(code);
    if (exchanged.error) {
      return localRedirect(request, "/login?error=google-sign-in-failed");
    }

    const identity = await supabase.auth.getUser();
    if (identity.error || !identity.data.user) {
      return localRedirect(request, "/login?error=google-sign-in-failed");
    }

    const user = await provisionAuthenticatedUser(identity.data.user);
    if (!user.isActive) {
      await supabase.auth.signOut();
      return localRedirect(request, "/unauthorized?reason=inactive");
    }

    return localRedirect(request, getPostLoginDestination(user, next));
  } catch {
    return localRedirect(request, "/login?error=google-sign-in-failed");
  }
}
