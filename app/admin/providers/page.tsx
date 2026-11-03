import { createAdminClient } from "@/lib/supabase/server"
import { ProviderListClient } from "./ProviderListClient"
import { Wrench, ShieldCheck, Clock } from "lucide-react"

export const dynamic = "force-dynamic"
export const metadata = { title: "Technician Approvals & Management — EcoFix Admin" }

export default async function AdminProvidersPage() {
  const adminSupabase = await createAdminClient()

  // Fetch all provider profiles with attached user info
  const { data: providers } = await adminSupabase
    .from("provider_profiles")
    .select(`
      *,
      users (
        id,
        name,
        email,
        phone,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false })

  // Fetch all categories for label lookup
  const { data: categoriesData } = await adminSupabase
    .from("categories")
    .select("id, name")

  const categoryMap: { [id: string]: string } = {}
  categoriesData?.forEach((c) => {
    categoryMap[c.id] = c.name
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--color-brand-400)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Provider Governance
          </span>
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
          Technician Approvals & Activation
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          Approve, reject, activate, or suspend repair technicians and inspect their trade credentials.
        </p>
      </div>

      {/* Interactive Provider List & Approval Drawer */}
      <ProviderListClient 
        providers={(providers as any) || []} 
        categories={categoryMap} 
      />
    </div>
  )
}
