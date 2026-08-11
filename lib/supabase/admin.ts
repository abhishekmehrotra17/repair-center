import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Server-side only — uses the service-role key, which bypasses RLS. Never
// import this from a client component. Per DESIGN.md's Tech choices, no anon
// key is used anywhere in the app; RLS is enabled on repair_requests /
// status_history / the repair-photos bucket with no public policies
// (PLAN.md tasks 3-4), so this is the only way the app reaches Supabase.
export function getSupabaseAdminClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
      );
    }

    client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  return client;
}
