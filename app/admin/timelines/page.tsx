import { createAdminClient } from "@/lib/supabase/server"
import { MasterTimelinesClient } from "./MasterTimelinesClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Master Timelines (Global Customer & Technician Monitor) — EcoFix Admin" }

export default async function AdminMasterTimelinesPage() {
  const adminSupabase = await createAdminClient()

  // Fetch all bookings with deep relation joins
  const { data: bookings } = await adminSupabase
    .from("bookings")
    .select(`
      *,
      products (
        id,
        brand,
        model,
        issue_description,
        media_urls,
        categories (
          id,
          name
        )
      ),
      users!bookings_customer_id_fkey (
        id,
        name,
        email,
        phone
      ),
      provider_profiles (
        id,
        business_name,
        rating_avg,
        users (
          name,
          phone
        )
      ),
      repair_status_log (
        id,
        status,
        note,
        changed_at,
        users!repair_status_log_changed_by_fkey (
          name,
          role
        )
      ),
      quotations (
        id,
        diagnosis_notes,
        quoted_amount,
        parts_breakdown,
        labour_cost,
        approved_by_customer,
        responded_at
      ),
      payments (
        id,
        amount,
        method,
        status,
        transaction_ref,
        paid_at
      ),
      warranties (
        id,
        duration_days,
        starts_at,
        expires_at,
        terms
      ),
      reviews (
        id,
        rating,
        quality_score,
        price_score,
        timeliness_score,
        comment
      )
    `)
    .order("created_at", { ascending: false })

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Page Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--color-brand-400)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Real-Time Stage Operations
          </span>
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
          Master Timelines & Global Activity
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          Live end-to-end timeline tracking across every customer and technician. Inspect stage durations, quotations, payments, and immutable audit logs.
        </p>
      </div>

      <MasterTimelinesClient initialBookings={(bookings as any) || []} />
    </div>
  )
}
