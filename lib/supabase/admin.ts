import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnvironment } from "@/lib/supabase/config";

export function createAdminClient() {
  const { url } = getSupabaseEnvironment();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secretKey)
    throw new Error(
      "SUPABASE_SECRET_KEY is required for server-managed request files.",
    );
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
