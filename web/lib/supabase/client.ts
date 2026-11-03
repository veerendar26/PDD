import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"

// Client-side Supabase client (browser)
// Uses the public anon key — RLS policies enforce all access rules
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
