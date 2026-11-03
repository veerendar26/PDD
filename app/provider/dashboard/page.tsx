import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Wrench, ChevronRight, Star, Clock, CheckCircle, TrendingUp, DollarSign } from "lucide-react"

export const metadata = { title: "Provider Dashboard — EcoFix" }

export default async function ProviderDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Server-side role check (never trust frontend)
  const { data: profile } = await supabase
    .from("users")
    .select("role, name")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/auth/login")
  if (profile.role === "customer") redirect("/dashboard")
  if (profile.role === "admin") redirect("/admin")

  // Server-side verification status check
  const { data: providerProfile } = await supabase
    .from("provider_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!providerProfile) redirect("/onboarding")

  // All non-approved states are handled by middleware redirects,
  // but we add a final server-side gate here as defence-in-depth.
  if (providerProfile.is_active === false) {
    redirect("/provider/suspended")
  }

  if (providerProfile.verification_status === "pending") {
    redirect("/provider/pending")
  }

  if (providerProfile.verification_status === "rejected") {
    redirect("/provider/rejected")
  }

  // Only approved + active technicians reach this point
  if (providerProfile.verification_status !== "approved") {
    // Unknown status — deny access safely
    redirect("/provider/pending")
  }

  // Fetch assigned bookings
  const { data: activeJobs } = await supabase
    .from("bookings")
    .select(`
      *,
      products (brand, model, issue_description, categories(name)),
      users!bookings_customer_id_fkey (name, phone)
    `)
    .eq("provider_id", providerProfile.id)
    .not("status", "in", '("completed","cancelled")')
    .order("created_at", { ascending: false })

  // Completed this month
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data: completedThisMonth } = await supabase
    .from("bookings")
    .select("id, payments(amount)")
    .eq("provider_id", providerProfile.id)
    .eq("status", "completed")
    .gte("updated_at", monthStart.toISOString())

  const monthlyEarnings = (completedThisMonth ?? [])
    .reduce((sum: number, b: any) => sum + (b.payments?.amount ?? 0), 0)

  const { count: totalCompleted } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("provider_id", providerProfile.id)
    .eq("status", "completed")

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
          { href: "/provider/location",  label: "Service Area & Hours", icon: "📍" },
          { href: "/provider/earnings",  label: "Earnings",     icon: "💰" },
          { href: "/profile",            label: "Profile",      icon: "👤" },
        ].map(({ href, label, icon }) => (
          <Link key={href} href={href} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", borderRadius: "var(--radius-md)", textDecoration: "none", color: "var(--color-text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>
            <span>{icon}</span> {label}
          </Link>
        ))}
      </aside>

      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" }}>
            {providerProfile.business_name}
          </h1>
          <p style={{ color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "#fbbf24" }}>★</span>
            {providerProfile.rating_avg.toFixed(1)} ({providerProfile.total_reviews} reviews)
            <span className={`badge badge-${providerProfile.verification_status}`}>{providerProfile.verification_status}</span>
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Active Jobs",     value: activeJobs?.length ?? 0,  icon: Wrench,      color: "#34d399" },
            { label: "Completed Total", value: totalCompleted ?? 0,       icon: CheckCircle, color: "#60a5fa" },
            { label: "Rating",          value: `${providerProfile.rating_avg.toFixed(1)} ★`, icon: Star, color: "#fbbf24" },
            { label: "Earnings (Month)", value: `₹${monthlyEarnings.toLocaleString("en-IN")}`, icon: DollarSign, color: "#a78bfa" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card" style={{ padding: "1.25rem" }}>
              <Icon size={18} style={{ color, marginBottom: "0.5rem" }} />
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color, marginBottom: "0.25rem" }}>{value}</div>
              <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Active jobs */}
        <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "1rem" }}>Active Jobs</h2>
        {(activeJobs?.length ?? 0) === 0 ? (
          <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
            <CheckCircle size={40} style={{ color: "var(--color-text-muted)", margin: "0 auto 1rem" }} />
            <p style={{ color: "var(--color-text-secondary)" }}>No active jobs right now. You&apos;re all caught up! 🎉</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {activeJobs?.map((job: any) => (
              <Link key={job.id} href={`/provider/bookings/${job.id}`} style={{ textDecoration: "none" }}>
                <div className="card card-brand" style={{ padding: "1.25rem", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", gap: "0.625rem", alignItems: "center", marginBottom: "0.375rem" }}>
                        <span style={{ fontWeight: 700 }}>{job.products?.categories?.name}</span>
                        {job.products?.brand && <span style={{ color: "var(--color-text-muted)" }}>— {job.products.brand}</span>}
                        <span className={`badge badge-${job.status}`}>{job.status.replace(/_/g, " ")}</span>
                      </div>
                      <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                        {job.products?.issue_description?.slice(0, 80)}
                      </p>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", display: "flex", gap: "1rem" }}>
                        <span>👤 {job.users?.name}</span>
                        <span>📞 {job.users?.phone}</span>
                        <span style={{ textTransform: "capitalize" }}>📍 {job.service_type?.replace("_", " ")}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
