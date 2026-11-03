import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"

/**
 * Standard server client for Route Handlers and Server Components.
 * Uses the anon key with RLS enforced — safe for user-scoped operations.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()                { return cookieStore.getAll() },
        setAll(cookiesToSet)    {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}

/**
 * Admin client using the service_role key.
 * Bypasses RLS — ONLY use in Server Actions and Route Handlers, NEVER in the browser.
 * Used for:
 *  - Admin panel operations (provider verification)
 *  - Reading data across all users (admin dashboard stats)
 */
export async function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (serviceRoleKey && serviceRoleKey.trim() !== "") {
    return createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession:   false,
        },
      }
    )
  }

  // Fallback: If no service role key is set, use the cookie-backed client
  // so the logged-in admin's auth JWT is passed and database RLS evaluates get_my_role() = 'admin'
  return await createClient()
}
