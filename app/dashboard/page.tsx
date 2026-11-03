import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, Clock, CheckCircle, XCircle, AlertCircle, Wrench, Bell, Star, ChevronRight } from "lucide-react"
import type { BookingWithDetails } from "@/types/database"
import CustomerLocationBadge from "@/components/customer/customer-location-badge"

const STATUS_CONFIG = {
  booked:            { label: "Booked",            color: "#60a5fa", icon: Clock },
  assigned:          { label: "Assigned",           color: "#c084fc", icon: Wrench },
  diagnosis:         { label: "Diagnosis",          color: "#fbbf24", icon: AlertCircle },
  awaiting_approval: { label: "Awaiting Approval",  color: "#fb923c", icon: AlertCircle },
  in_repair:         { label: "In Repair",          color: "#34d399", icon: Wrench },
  quality_check:     { label: "Quality Check",      color: "#2dd4bf", icon: CheckCircle },
  completed:         { label: "Completed",          color: "#4ade80", icon: CheckCircle },
  cancelled:         { label: "Cancelled",          color: "#f87171", icon: XCircle },
} as const

export default async function CustomerDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Fetch user profile
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()

  // Redirect providers away
  if (profile?.role === "technician") redirect("/provider/dashboard")
  if (profile?.role === "admin") redirect("/admin")

  // Fetch active bookings with full detail
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      products (*, categories (name, icon_url)),
      provider_profiles (business_name, rating_avg, users (name, avatar_url))
    `)
    .eq("customer_id", user.id)
    .not("status", "in", '("completed","cancelled")')
    .order("created_at", { ascending: false })
    .limit(5)

  // Fetch completed bookings count
  const { count: completedCount } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", user.id)
    .eq("status", "completed")

  // Fetch unread notifications
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(5)

  const activeBookings = (bookings ?? []) as unknown as BookingWithDetails[]
  const unreadCount = notifications?.length ?? 0

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-surface-0)" }}>

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="sidebar" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none", marginBottom: "2rem" }}>
          <div style={{
            width: 32, height: 32,
            background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))",
            borderRadius: "var(--radius-sm)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Wrench size={16} color="white" />
          </div>
          <span style={{ fontWeight: 800, color: "var(--color-text-primary)" }}>
            Eco<span style={{ color: "var(--color-brand-500)" }}>Fix</span>
          </span>
        </Link>

        {[
          { href: "/dashboard",          label: "Dashboard",       icon: "📊" },
          { href: "/book",               label: "Book Repair",     icon: "🔧" },
          { href: "/history",            label: "Repair History",  icon: "📋" },
          { href: "/profile",            label: "Profile",         icon: "👤" },
        ].map(({ href, label, icon }) => (
          <Link key={href} href={href} style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            padding: "0.625rem 0.875rem",
            borderRadius: "var(--radius-md)",
            textDecoration: "none",
            color: "var(--color-text-secondary)",
            fontSize: "0.875rem", fontWeight: 500,
            transition: "all 0.2s",
          }}>
            <span>{icon}</span> {label}
          </Link>
        ))}
      </aside>

      {/* ── Main ────────────────────────────────────── */}
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0 }}>
                Hey, {profile?.name?.split(" ")[0] ?? "there"} 👋
              </h1>
              <CustomerLocationBadge />
            </div>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
              {activeBookings.length > 0
                ? `You have ${activeBookings.length} active repair${activeBookings.length > 1 ? "s" : ""}`
                : "No active repairs — book one now!"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {/* Notification bell */}
            <button style={{
              position: "relative", background: "var(--color-surface-100)",
              border: "1px solid var(--color-surface-200)", borderRadius: "var(--radius-md)",
              width: 40, height: 40, display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer",
            }}>
              <Bell size={18} color="var(--color-text-secondary)" />
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: -6, right: -6,
                  background: "var(--color-brand-500)",
                  color: "white", fontSize: "0.625rem", fontWeight: 700,
                  width: 18, height: 18, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
            <Link href="/book" id="book-repair-btn" className="btn btn-primary">
              <Plus size={16} /> Book Repair
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Active Repairs",    value: activeBookings.length,    color: "#34d399" },
            { label: "Completed Repairs", value: completedCount ?? 0,       color: "#60a5fa" },
            { label: "Unread Alerts",     value: unreadCount,               color: "#fbbf24" },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "2rem", fontWeight: 800, color, marginBottom: "0.25rem" }}>{value}</div>
              <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Active bookings */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>Active Repairs</h2>
            <Link href="/history" style={{ color: "var(--color-brand-400)", textDecoration: "none", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              View all <ChevronRight size={14} />
            </Link>
          </div>

          {activeBookings.length === 0 ? (
            <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
              <Wrench size={40} style={{ color: "var(--color-text-muted)", margin: "0 auto 1rem" }} />
              <h3 style={{ marginBottom: "0.5rem", color: "var(--color-text-secondary)" }}>No active repairs</h3>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                Book your first repair and get matched with a verified technician near you.
              </p>
              <Link href="/book" className="btn btn-primary">
                <Plus size={16} /> Book a Repair
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {activeBookings.map((booking) => {
                const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.booked
                const StatusIcon = cfg.icon
                return (
                  <Link key={booking.id} href={`/bookings/${booking.id}`} style={{ textDecoration: "none" }}>
                    <div className="card card-brand" style={{ padding: "1.25rem", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                            <span style={{ fontWeight: 700, fontSize: "1rem" }}>
                              {(booking as any).products?.categories?.name ?? "Repair"}
                            </span>
                            <span className={`badge badge-${booking.status}`}>
                              <StatusIcon size={10} />
                              {cfg.label}
                            </span>
                          </div>
                          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                            {(booking as any).products?.issue_description?.slice(0, 100)}
                            {((booking as any).products?.issue_description?.length ?? 0) > 100 ? "…" : ""}
                          </p>
                          {booking.provider_id && (
                            <p style={{ fontSize: "0.8125rem", color: "var(--color-brand-400)" }}>
                              🔧 {(booking as any).provider_profiles?.business_name}
                            </p>
                          )}
                        </div>
                        <ChevronRight size={18} style={{ color: "var(--color-text-muted)", flexShrink: 0, marginLeft: "1rem" }} />
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginTop: "0.875rem" }}>
                        {(() => {
                          const steps = ["booked", "assigned", "diagnosis", "awaiting_approval", "in_repair", "quality_check", "completed"]
                          const idx = steps.indexOf(booking.status)
                          const pct = idx >= 0 ? Math.round(((idx + 1) / steps.length) * 100) : 0
                          return (
                            <div>
                              <div style={{ height: 4, background: "var(--color-surface-200)", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{
                                  height: "100%", width: `${pct}%`,
                                  background: `linear-gradient(90deg, var(--color-brand-600), var(--color-brand-400))`,
                                  borderRadius: 2, transition: "width 0.4s ease",
                                }} />
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                                {pct}% complete
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Notifications */}
        {(notifications?.length ?? 0) > 0 && (
          <div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "1rem" }}>Recent Notifications</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {notifications?.map((n) => (
                <div key={n.id} className="glass" style={{
                  padding: "0.875rem 1rem", borderRadius: "var(--radius-lg)",
                  display: "flex", gap: "0.875rem", alignItems: "flex-start",
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: "var(--color-brand-500)",
                    flexShrink: 0, marginTop: "0.375rem",
                  }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.25rem" }}>{n.title}</div>
                    <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8125rem" }}>{n.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
