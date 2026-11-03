import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/server"
import { 
  Users, 
  Wrench, 
  Layers, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  TrendingUp, 
  Activity, 
  Calendar, 
  ShieldCheck, 
  Star, 
  Tag, 
  RotateCcw 
} from "lucide-react"
import { approveProvider, rejectProvider } from "./actions"

export const dynamic = "force-dynamic"

export default async function AdminDashboardOverview() {
  const adminSupabase = await createAdminClient()

  // Fetch comprehensive real database metrics
  const [
    { count: totalUsers },
    { count: totalCustomers },
    { count: totalTechnicians },
    { count: pendingProviders },
    { count: approvedProviders },
    { count: totalBookings },
    { count: activeBookings },
    { count: completedBookings },
    { count: cancelledBookings },
    { data: paymentsData },
    { count: activeWarranties },
    { data: pendingList },
    { data: recentStatusLogs },
    { data: reviewsData },
    { data: completedBookingsTimes },
    { data: categoriesData },
    { data: bookingsByStatusData },
  ] = await Promise.all([
    adminSupabase.from("users").select("*", { count: "exact", head: true }),
    adminSupabase.from("users").select("*", { count: "exact", head: true }).eq("role", "customer"),
    adminSupabase.from("users").select("*", { count: "exact", head: true }).eq("role", "technician"),
    adminSupabase.from("provider_profiles").select("*", { count: "exact", head: true }).eq("verification_status", "pending"),
    adminSupabase.from("provider_profiles").select("*", { count: "exact", head: true }).eq("verification_status", "approved"),
    adminSupabase.from("bookings").select("*", { count: "exact", head: true }),
    adminSupabase.from("bookings").select("*", { count: "exact", head: true }).in("status", ["assigned", "diagnosis", "awaiting_approval", "in_repair", "quality_check"]),
    adminSupabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "completed"),
    adminSupabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "cancelled"),
    adminSupabase.from("payments").select("amount, status"),
    adminSupabase.from("warranties").select("*", { count: "exact", head: true }).gt("expires_at", new Date().toISOString()),
    adminSupabase
      .from("provider_profiles")
      .select("*, users(name, email, phone, avatar_url)")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: false })
      .limit(6),
    adminSupabase
      .from("repair_status_log")
      .select(`
        *,
        bookings(
          id,
          status,
          service_type,
          products(brand, model, categories(name)),
          users!bookings_customer_id_fkey(name, email),
          provider_profiles(business_name)
        ),
        users!repair_status_log_changed_by_fkey(name, role)
      `)
      .order("changed_at", { ascending: false })
      .limit(8),
    adminSupabase.from("reviews").select("rating"),
    adminSupabase.from("bookings").select("created_at, updated_at").eq("status", "completed").limit(100),
    adminSupabase.from("categories").select("id, name, parent_id"),
    adminSupabase.from("bookings").select("status"),
  ])

  // Aggregate Payments
  const paidPayments = paymentsData?.filter((p) => p.status === "paid") || []
  const pendingPayments = paymentsData?.filter((p) => p.status === "pending") || []
  const totalGmv = paidPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0)
  const pendingVolume = pendingPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0)

  // Aggregate Reviews
  const avgRating = reviewsData && reviewsData.length > 0 
    ? (reviewsData.reduce((acc, r) => acc + Number(r.rating || 0), 0) / reviewsData.length).toFixed(1)
    : "5.0"

  // Aggregate Turnaround time
  let avgTurnaroundText = "Under 24h"
  if (completedBookingsTimes && completedBookingsTimes.length > 0) {
    const totalHours = completedBookingsTimes.reduce((acc, b) => {
      const diffMs = new Date(b.updated_at).getTime() - new Date(b.created_at).getTime()
      return acc + (diffMs / (1000 * 60 * 60))
    }, 0)
    const avgH = Math.round(totalHours / completedBookingsTimes.length)
    if (avgH >= 24) {
      avgTurnaroundText = `${(avgH / 24).toFixed(1)} days`
    } else {
      avgTurnaroundText = `${avgH || 1} hours`
    }
  }

  // Status breakdown counts
  const totalB = totalBookings || 0
  const statusCounts: Record<string, number> = {
    booked: 0,
    assigned: 0,
    diagnosis: 0,
    awaiting_approval: 0,
    in_repair: 0,
    quality_check: 0,
    completed: 0,
    cancelled: 0,
  }
  bookingsByStatusData?.forEach((b) => {
    if (statusCounts[b.status] !== undefined) {
      statusCounts[b.status]++
    }
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* ─── Hero / Header ────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-brand-400)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Global Mission Control
            </span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Platform Overview</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9375rem" }}>
            Live status metrics, technician approvals queue, financial summaries, and stage transitions.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/admin/providers" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Wrench size={16} />
            <span>Manage Technicians ({(pendingProviders ?? 0)} Pending)</span>
          </Link>
          <Link href="/admin/timelines" className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Activity size={16} />
            <span>Live Master Timelines</span>
          </Link>
        </div>
      </div>

      {/* ─── Primary 4 KPI Cards Grid ─────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
        {/* Pending Approvals */}
        <div 
          className="card" 
          style={{ 
            padding: "1.5rem", 
            border: (pendingProviders ?? 0) > 0 ? "1px solid rgba(251, 191, 36, 0.4)" : "1px solid var(--color-surface-200)",
            background: (pendingProviders ?? 0) > 0 ? "linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(15, 23, 42, 0.6) 100%)" : "var(--color-surface-100)",
            boxShadow: (pendingProviders ?? 0) > 0 ? "0 0 25px rgba(251, 191, 36, 0.1)" : undefined
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>Pending Approvals</span>
            <div style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", background: "rgba(251, 191, 36, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={18} color="#fbbf24" />
            </div>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#fbbf24", marginBottom: "0.25rem" }}>
            {pendingProviders ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            Requires trade & identity review
          </div>
        </div>

        {/* Active Repairs */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>Active Repairs</span>
            <div style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", background: "rgba(52, 211, 153, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={18} color="#34d399" />
            </div>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#34d399", marginBottom: "0.25rem" }}>
            {activeBookings ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            In diagnosis, repair, or awaiting approval
          </div>
        </div>

        {/* Total GMV / Revenue */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>Settled GMV</span>
            <div style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", background: "rgba(96, 165, 250, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DollarSign size={18} color="#60a5fa" />
            </div>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#60a5fa", marginBottom: "0.25rem" }}>
            ₹{totalGmv.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            ₹{pendingVolume.toLocaleString("en-IN")} pending payment
          </div>
        </div>

        {/* User Ecosystem */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>Total Users</span>
            <div style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", background: "rgba(192, 132, 252, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={18} color="#c084fc" />
            </div>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#c084fc", marginBottom: "0.25rem" }}>
            {totalUsers ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            {totalCustomers ?? 0} Customers &bull; {approvedProviders ?? 0} Verified Techs
          </div>
        </div>
      </div>

      {/* ─── Secondary Metrics Grid ───────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>Customer Satisfaction</div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <Star size={20} color="#fbbf24" fill="#fbbf24" />
            <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffffff" }}>{avgRating}</span>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>/ 5.0</span>
          </div>
          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            {reviewsData?.length || 0} customer reviews
          </div>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>Avg. Repair Turnaround</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#34d399" }}>{avgTurnaroundText}</div>
          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            From intake to completion
          </div>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>Active Warranties</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#60a5fa" }}>{activeWarranties ?? 0}</div>
          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            Digital guarantees in effect
          </div>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>Completed Repairs</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffffff" }}>{completedBookings ?? 0}</div>
          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            {cancelledBookings ?? 0} cancelled
          </div>
        </div>
      </div>

      {/* ─── Repair Stages Distribution Visualizer ────────────────── */}
      <div 
        style={{
          background: "var(--color-surface-100)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-surface-200)",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>Global Repair Status Distribution</h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
              Current stage breakdown across all {totalB} registered jobs.
            </p>
          </div>
          <Link href="/admin/bookings" style={{ fontSize: "0.8125rem", color: "var(--color-brand-400)", textDecoration: "none", fontWeight: 600 }}>
            View All Bookings &rarr;
          </Link>
        </div>

        {/* Multi-segment progress bar */}
        <div style={{ display: "flex", height: "12px", borderRadius: "999px", overflow: "hidden", background: "rgba(255,255,255,0.06)", gap: "2px" }}>
          {totalB > 0 && (
            <>
              {statusCounts.booked > 0 && (
                <div style={{ width: `${(statusCounts.booked / totalB) * 100}%`, background: "#94a3b8" }} title={`Booked: ${statusCounts.booked}`} />
              )}
              {statusCounts.assigned > 0 && (
                <div style={{ width: `${(statusCounts.assigned / totalB) * 100}%`, background: "#60a5fa" }} title={`Assigned: ${statusCounts.assigned}`} />
              )}
              {statusCounts.diagnosis > 0 && (
                <div style={{ width: `${(statusCounts.diagnosis / totalB) * 100}%`, background: "#a78bfa" }} title={`Diagnosis: ${statusCounts.diagnosis}`} />
              )}
              {statusCounts.awaiting_approval > 0 && (
                <div style={{ width: `${(statusCounts.awaiting_approval / totalB) * 100}%`, background: "#fbbf24" }} title={`Awaiting Approval: ${statusCounts.awaiting_approval}`} />
              )}
              {statusCounts.in_repair > 0 && (
                <div style={{ width: `${(statusCounts.in_repair / totalB) * 100}%`, background: "#f97316" }} title={`In Repair: ${statusCounts.in_repair}`} />
              )}
              {statusCounts.quality_check > 0 && (
                <div style={{ width: `${(statusCounts.quality_check / totalB) * 100}%`, background: "#38bdf8" }} title={`Quality Check: ${statusCounts.quality_check}`} />
              )}
              {statusCounts.completed > 0 && (
                <div style={{ width: `${(statusCounts.completed / totalB) * 100}%`, background: "#34d399" }} title={`Completed: ${statusCounts.completed}`} />
              )}
              {statusCounts.cancelled > 0 && (
                <div style={{ width: `${(statusCounts.cancelled / totalB) * 100}%`, background: "#ef4444" }} title={`Cancelled: ${statusCounts.cancelled}`} />
              )}
            </>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#94a3b8" }} />
            <span>Booked: <strong>{statusCounts.booked}</strong></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#60a5fa" }} />
            <span>Assigned: <strong>{statusCounts.assigned}</strong></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#a78bfa" }} />
            <span>Diagnosis: <strong>{statusCounts.diagnosis}</strong></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbf24" }} />
            <span>Approval: <strong>{statusCounts.awaiting_approval}</strong></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f97316" }} />
            <span>In Repair: <strong>{statusCounts.in_repair}</strong></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#38bdf8" }} />
            <span>QC: <strong>{statusCounts.quality_check}</strong></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399" }} />
            <span>Completed: <strong>{statusCounts.completed}</strong></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
            <span>Cancelled: <strong>{statusCounts.cancelled}</strong></span>
          </div>
        </div>
      </div>

      {/* ─── Urgent Technician Verification Queue ─────────────────── */}
      <div 
        style={{
          background: "linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "rgba(251, 191, 36, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={18} color="#fbbf24" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>Technician Verification Queue</h2>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                Review and verify technician profiles before they can accept bookings.
              </p>
            </div>
          </div>
          <Link href="/admin/providers" style={{ fontSize: "0.875rem", color: "var(--color-brand-400)", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <span>Manage All Technicians</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {(!pendingList || pendingList.length === 0) ? (
          <div style={{ padding: "2.5rem 1rem", textAlign: "center", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-lg)" }}>
            <CheckCircle size={36} color="var(--color-brand-400)" style={{ margin: "0 auto 0.75rem" }} />
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "#ffffff", marginBottom: "0.25rem" }}>
              All Technician Applications Processed!
            </div>
            <div style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
              No pending technician verifications at this moment.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
            {pendingList.map((provider) => (
              <div 
                key={provider.id} 
                className="card"
                style={{
                  padding: "1.25rem",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(251, 191, 36, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1rem", color: "#ffffff" }}>
                        {provider.business_name}
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                        Applicant: {provider.users?.name} &bull; {provider.users?.email}
                      </div>
                    </div>
                    <span className="badge badge-pending">Pending</span>
                  </div>

                  <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.75rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {provider.description || "No trade description provided."}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                    <span style={{ padding: "2px 8px", background: "var(--color-surface-200)", borderRadius: "4px" }}>
                      📍 {provider.address || "Address not provided"}
                    </span>
                    <span style={{ padding: "2px 8px", background: "var(--color-surface-200)", borderRadius: "4px" }}>
                      Radius: {provider.service_radius_km} km
                    </span>
                    <span style={{ padding: "2px 8px", background: "var(--color-surface-200)", borderRadius: "4px" }}>
                      Doorstep: {provider.doorstep_available ? "Yes" : "No"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <form 
                    action={async () => {
                      "use server"
                      await approveProvider(provider.id, "Approved from Overview")
                    }} 
                    style={{ flex: 1 }}
                  >
                    <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.5rem", fontSize: "0.8125rem" }}>
                      <CheckCircle size={14} />
                      <span>Approve & Verify</span>
                    </button>
                  </form>
                  <form 
                    action={async () => {
                      "use server"
                      await rejectProvider(provider.id, "Application details incomplete or unverified")
                    }} 
                    style={{ flex: 1 }}
                  >
                    <button type="submit" className="btn btn-danger" style={{ width: "100%", padding: "0.5rem", fontSize: "0.8125rem" }}>
                      <XCircle size={14} />
                      <span>Reject</span>
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Master Live Timeline Activity Stream ─────────────────── */}
      <div 
        style={{
          background: "var(--color-surface-100)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-surface-200)",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>Live Master Timeline (Recent Stage Transitions)</h2>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
              Every status change across all customers and technicians is recorded in real time.
            </p>
          </div>
          <Link href="/admin/timelines" style={{ fontSize: "0.875rem", color: "var(--color-brand-400)", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <span>Explore Master Timelines</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {(!recentStatusLogs || recentStatusLogs.length === 0) ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
            No timeline logs found in the database.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {recentStatusLogs.map((log: any) => {
              const booking = log.bookings
              const product = booking?.products
              const category = product?.categories?.name
              const customerName = booking?.users?.name || "Customer"
              const providerName = booking?.provider_profiles?.business_name || "Unassigned"
              const formattedTime = new Date(log.changed_at).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })

              return (
                <div 
                  key={log.id}
                  style={{
                    padding: "1rem 1.25rem",
                    borderRadius: "var(--radius-lg)",
                    background: "rgba(10, 15, 26, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span className={`badge badge-${log.status}`}>
                      {log.status.replace(/_/g, " ")}
                    </span>
                    <div>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#ffffff" }}>
                        {product ? `${product.brand || ""} ${product.model || ""}` : "Repair Item"}
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginLeft: "0.5rem" }}>
                          ({category || "General"}) &bull; Booking #{log.booking_id?.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                        Customer: <strong style={{ color: "var(--color-text-primary)" }}>{customerName}</strong> &bull; Technician: <strong style={{ color: "var(--color-text-primary)" }}>{providerName}</strong>
                      </div>
                      {log.note && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-brand-300)", marginTop: "0.125rem" }}>
                          💬 Note: {log.note}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                    <div>{formattedTime}</div>
                    <div>By: {log.users?.name || "System"} ({log.users?.role || "auto"})</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
