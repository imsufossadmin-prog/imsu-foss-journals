"use server";

import { redirect } from "next/navigation";

import { getPostLoginDestination } from "@/lib/auth/workspaces";
import { prisma } from "@/lib/db/prisma";
import { getOAuthCallbackUrl } from "@/lib/auth/oauth";
import { getSafeLoginReturnPath } from "@/lib/auth/submission-entry";
import { SupabaseConfigurationError } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
};

const invalidCredentialsMessage = "Invalid email or password.";

function loginErrorPath(returnTo: unknown, error: string) {
  const search = new URLSearchParams({ error });
  const safeReturn = getSafeLoginReturnPath(returnTo);
  if (safeReturn) search.set("next", safeReturn);
  return `/login?${search.toString()}`;
}

export async function signInWithGoogle(formData: FormData) {
  const returnTo = formData.get("returnTo");
  let destination: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getOAuthCallbackUrl(returnTo) },
    });
    if (!error && data.url) destination = data.url;
  } catch {
    destination = null;
  }

  redirect(
    destination ?? loginErrorPath(returnTo, "google-sign-in-unavailable"),
  );
}

export async function loginWithPassword(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const returnTo = formData.get("returnTo");

  if (!email.trim() || !password) return { error: invalidCredentialsMessage };

  let destination = "/unauthorized?reason=workspace";
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  try {
    supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.user) return { error: invalidCredentialsMessage };

    const applicationUser = await prisma.user.findUnique({
      where: { id: data.user.id },
      include: {
        globalRoles: true,
        journalRoles: {
          include: {
            journal: {
              select: {
                id: true,
                slug: true,
                name: true,
                shortName: true,
                isActive: true,
                department: {
                  select: {
                    id: true,
                    slug: true,
                    name: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!applicationUser) {
      await supabase.auth.signOut();
      return {
        error:
          "Your account is not ready for this journal platform. Contact an administrator.",
      };
    }

    if (!applicationUser.isActive) {
      await supabase.auth.signOut();
      return { error: "This account has been deactivated." };
    }

    await prisma.user.update({
      where: { id: applicationUser.id },
      data: { email: email.trim().toLowerCase() },
    });
    destination = getPostLoginDestination(applicationUser, returnTo);
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return { error: "Sign in is temporarily unavailable." };
    }

    await supabase?.auth.signOut().catch(() => undefined);
    return {
      error: "We couldn’t sign you in right now. Please try again shortly.",
    };
  }

  redirect(destination);
}

export async function logout() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    if (!(error instanceof SupabaseConfigurationError)) throw error;
  }

  redirect("/login");
}
