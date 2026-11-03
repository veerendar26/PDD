import { createAdminClient, createClient } from "@/lib/supabase/server"
import { UserDirectoryClient, UserRecord } from "./UserDirectoryClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "User Directory — EcoFix Admin" }

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminSupabase = await createAdminClient()

  // Query users joined with provider_profiles (using existing schema columns without is_active)
  const { data: users, error } = await adminSupabase
    .from("users")
    .select(`
      id,
      role,
      name,
      email,
      phone,
      avatar_url,
      created_at,
      provider_profiles (
        id,
        business_name,
        verification_status,
        rating_avg,
        total_reviews,
        address,
        service_radius_km,
        doorstep_available
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching users for admin directory:", error.message)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--color-brand-400)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Identity & Accounts
          </span>
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
          User Directory ({users?.length ?? 0})
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          Unified list of customers, technicians, and platform administrators with role oversight.
        </p>
      </div>

      <UserDirectoryClient 
        users={(users as unknown as UserRecord[]) || []} 
        currentAdminId={user?.id || ""}
      />
    </div>
  )
}
