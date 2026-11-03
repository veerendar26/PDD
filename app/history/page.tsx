import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Clock, CheckCircle, XCircle, Shield, ChevronRight, Plus, ArrowLeft } from "lucide-react"
import type { Booking } from "@/types/database"

export const metadata = { title: "Repair History — EcoFix" }

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      products (brand, model, issue_description, categories(name)),
      provider_profiles (business_name),
      payments (*),
      warranties (*),
      reviews (rating, comment)
    `)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })

  const allBookings = (bookings ?? []) as any[]
  const completed = allBookings.filter((b) => b.status === "completed")
  const others    = allBookings.filter((b) => b.status !== "completed")

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface-0)", padding: "2rem" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Top back arrow to home screen */}
        <Link
          href="/dashboard"
          id="back-to-home"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--color-text-secondary)",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: 500,
            marginBottom: "1.5rem",
            transition: "all 0.2s",
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface-100)",
            border: "1px solid var(--color-surface-200)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-primary)",
          }}>
            <ArrowLeft size={18} />
          </div>
          <span>Back to Home</span>
        </Link>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" }}>Repair History</h1>
            <p style={{ color: "var(--color-text-secondary)" }}>{allBookings.length} total bookings</p>
          </div>
          <Link href="/book" className="btn btn-primary">
            <Plus size={16} /> New Repair
          </Link>
        </div>

        {/* Active bookings */}
        {others.length > 0 && (
          <div style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "1rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Active
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {others.map((b) => <BookingCard key={b.id} booking={b} />)}
            </div>
          </div>
        )}

        {/* Completed bookings */}
        {completed.length > 0 && (
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "1rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Completed
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {completed.map((b) => <BookingCard key={b.id} booking={b} />)}
            </div>
          </div>
        )}

        {allBookings.length === 0 && (
          <div className="card" style={{ padding: "4rem", textAlign: "center" }}>
            <Clock size={48} style={{ color: "var(--color-text-muted)", margin: "0 auto 1rem" }} />
            <h2 style={{ marginBottom: "0.5rem" }}>No repairs yet</h2>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>
              Book your first repair and track it in real time.
            </p>
            <Link href="/book" className="btn btn-primary">Book a Repair</Link>
          </div>
        )}
      </div>
    </div>
  )
}

function BookingCard({ booking }: { booking: any }) {
  const isCompleted = booking.status === "completed"
  const isCancelled = booking.status === "cancelled"

  return (
    <Link href={`/bookings/${booking.id}`} style={{ textDecoration: "none" }}>
      <div className="card card-brand" style={{ padding: "1.25rem", cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.375rem" }}>
              <span style={{ fontWeight: 700 }}>
                {booking.products?.categories?.name ?? "Repair"}
                {booking.products?.brand ? ` — ${booking.products.brand}` : ""}
              </span>
              <span className={`badge badge-${booking.status}`}>
                {booking.status.replace(/_/g, " ")}
              </span>
            </div>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
              {booking.products?.issue_description?.slice(0, 80)}
            </p>
            <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.8125rem", color: "var(--color-text-muted)", flexWrap: "wrap" }}>
              <span>🔧 {booking.provider_profiles?.business_name ?? "Unassigned"}</span>
              <span>📅 {new Date(booking.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</span>
              {isCompleted && booking.payments?.amount && (
                <span>💰 ₹{booking.payments.amount.toLocaleString("en-IN")}</span>
              )}
              {isCompleted && booking.warranties && (
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--color-brand-400)" }}>
                  <Shield size={12} />
                  Warranty till {new Date(booking.warranties.expires_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                </span>
              )}
              {isCompleted && booking.reviews && (
                <span style={{ color: "#fbbf24" }}>★ {booking.reviews.rating}</span>
              )}
            </div>
          </div>
          <ChevronRight size={18} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
        </div>
      </div>
    </Link>
  )
}
