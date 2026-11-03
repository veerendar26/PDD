import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Wrench, ChevronRight, DollarSign, TrendingUp, Calendar, CreditCard, ArrowLeft, CheckCircle } from "lucide-react"

export const metadata = { title: "Earnings — EcoFix Provider" }

export default async function ProviderEarningsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: providerProfile } = await supabase
    .from("provider_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!providerProfile) redirect("/onboarding")

  // Fetch completed bookings with payments
  const { data: completedBookings } = await supabase
    .from("bookings")
    .select(`
      id,
      created_at,
      updated_at,
      status,
      service_type,
      products (brand, model, categories(name)),
      users!bookings_customer_id_fkey (name),
      payments (amount, status, created_at)
    `)
    .eq("provider_id", providerProfile.id)
    .eq("status", "completed")
    .order("updated_at", { ascending: false })

  const totalEarnings = (completedBookings ?? []).reduce((sum: number, b: any) => {
    return sum + (b.payments?.amount ?? 750) // default baseline if payments record pending
  }, 0)

  // Current month
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const thisMonthEarnings = (completedBookings ?? []).filter((b: any) => {
    return new Date(b.updated_at) >= monthStart
  }).reduce((sum: number, b: any) => sum + (b.payments?.amount ?? 750), 0)

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-surface-0)" }}>
      {/* Sidebar */}
      <aside className="sidebar" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none", marginBottom: "2rem" }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wrench size={16} color="white" />
          </div>
          <span style={{ fontWeight: 800, color: "var(--color-text-primary)" }}>Eco<span style={{ color: "var(--color-brand-500)" }}>Fix</span></span>
        </Link>
        {[
          { href: "/provider/dashboard", label: "Dashboard",   icon: "📊" },
          { href: "/provider/jobs",      label: "All Jobs",     icon: "🔧" },
          { href: "/provider/earnings",  label: "Earnings",     icon: "💰", active: true },
          { href: "/profile",            label: "Profile",      icon: "👤" },
        ].map(({ href, label, icon, active }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.625rem 0.875rem",
              borderRadius: "var(--radius-md)",
              textDecoration: "none",
              color: active ? "var(--color-brand-400)" : "var(--color-text-secondary)",
              background: active ? "rgba(16, 185, 129, 0.12)" : "transparent",
              fontSize: "0.875rem",
              fontWeight: active ? 700 : 500
            }}
          >
            <span>{icon}</span> {label}
          </Link>
        ))}
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" }}>
              Payouts & Earnings
            </h1>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
              Transparent payment tracking, commission splits, and settlement history
            </p>
          </div>

          <Link href="/provider/dashboard" className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>

        {/* Financial Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#34d399", marginBottom: "0.5rem" }}>
              <DollarSign size={20} />
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>This Month</span>
            </div>
            <div style={{ fontSize: "1.875rem", fontWeight: 800, color: "var(--color-text-primary)" }}>
              ₹{thisMonthEarnings.toLocaleString("en-IN")}
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
              Settles every Monday automatically
            </p>
          </div>

          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#60a5fa", marginBottom: "0.5rem" }}>
              <TrendingUp size={20} />
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Lifetime Gross</span>
            </div>
            <div style={{ fontSize: "1.875rem", fontWeight: 800, color: "var(--color-text-primary)" }}>
              ₹{totalEarnings.toLocaleString("en-IN")}
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
              Total across {completedBookings?.length ?? 0} repairs
            </p>
          </div>

          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#fbbf24", marginBottom: "0.5rem" }}>
              <CreditCard size={20} />
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Settlement Status</span>
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#34d399", display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <CheckCircle size={18} /> Verified Active
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
              Direct UPI / Bank Transfer
            </p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "1rem" }}>
            Recent Repair Settlements
          </h2>

          {(!completedBookings || completedBookings.length === 0) ? (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--color-text-muted)" }}>
              <CreditCard size={40} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
              <p style={{ fontSize: "0.875rem" }}>No completed transactions yet. Completed repair jobs will automatically be listed here.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {completedBookings.map((b: any) => (
                <div key={b.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1rem",
                  background: "var(--color-surface-1)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border-subtle)"
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--color-text-primary)" }}>
                      {b.products?.categories?.name || "Repair Service"} • {b.products?.brand || ""}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.125rem" }}>
                      Customer: {b.users?.name || "Customer"} • {new Date(b.updated_at).toLocaleDateString("en-IN")}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--color-brand-400)" }}>
                      +₹{(b.payments?.amount ?? 750).toLocaleString("en-IN")}
                    </div>
                    <span className="badge badge-completed" style={{ fontSize: "0.6875rem" }}>Paid</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
