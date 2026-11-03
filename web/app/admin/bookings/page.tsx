import { createAdminClient } from "@/lib/supabase/server"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { BookingDirectoryClient, BookingRecord } from "./BookingDirectoryClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "All Bookings — EcoFix Admin" }

export default async function AdminBookingsPage() {
  const adminSupabase = await createAdminClient()

  // Fetch all bookings with product, customer, provider, quotation, payment, warranty
  const { data: bookings, error } = await adminSupabase
    .from("bookings")
    .select(`
      id,
      status,
      estimated_cost,
      final_cost,
      scheduled_at,
      service_type,
      customer_address,
      notes,
      created_at,
      updated_at,
      products (
        id,
        brand,
        model,
        issue_description,
        media_urls,
        categories (name)
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
        rating_avg
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
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching admin bookings:", error.message)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-brand-400)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Global Transactions
            </span>
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            All Repair Bookings ({bookings?.length ?? 0})
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Complete list of customer repair orders, assigned technicians, quotations, payments, and financial states.
          </p>
        </div>

        <Link href="/admin/timelines" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>Switch to Master Timelines</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Interactive Booking Directory */}
      <BookingDirectoryClient bookings={(bookings as unknown as BookingRecord[]) || []} />
    </div>
  )
}
