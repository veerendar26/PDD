import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Wrench, ChevronRight, CheckCircle, Clock, AlertCircle, Search, ArrowLeft } from "lucide-react"

export const metadata = { title: "All Jobs — EcoFix Provider" }

export default async function ProviderJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: providerProfile } = await supabase
    .from("provider_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!providerProfile) redirect("/onboarding")

  // Fetch all jobs for this provider
  const { data: allJobs } = await supabase
    .from("bookings")
    .select(`
      *,
      products (brand, model, issue_description, categories(name)),
      users!bookings_customer_id_fkey (name, phone, email)
    `)
    .eq("provider_id", providerProfile.id)
    .order("created_at", { ascending: false })

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
          { href: "/provider/jobs",      label: "All Jobs",     icon: "🔧", active: true },
          { href: "/provider/earnings",  label: "Earnings",     icon: "💰" },
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
              All Assigned Jobs
            </h1>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
              Manage diagnostics, quotations, repairs, and quality sign-offs
            </p>
          </div>

          <Link href="/provider/dashboard" className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>

        {/* Jobs List */}
        {(!allJobs || allJobs.length === 0) ? (
          <div className="card" style={{ padding: "4rem 2rem", textAlign: "center" }}>
            <Wrench size={48} style={{ color: "var(--color-text-muted)", margin: "0 auto 1rem" }} />
            <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.5rem" }}>No Jobs Found Yet</h3>
            <p style={{ color: "var(--color-text-secondary)", maxWidth: 440, margin: "0 auto 1.5rem", fontSize: "0.875rem" }}>
              As customers book repairs in your service areas, new jobs will appear here automatically for quotation and inspection.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {allJobs.map((job: any) => (
              <Link key={job.id} href={`/provider/bookings/${job.id}`} style={{ textDecoration: "none" }}>
                <div className="card card-brand" style={{ padding: "1.5rem", cursor: "pointer", transition: "transform 0.15s ease" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontWeight: 800, fontSize: "1.0625rem" }}>
                          {job.products?.categories?.name || "Device Repair"}
                        </span>
                        {job.products?.brand && (
                          <span style={{ color: "var(--color-text-muted)" }}>
                            • {job.products.brand} {job.products?.model || ""}
                          </span>
                        )}
                        <span className={`badge badge-${job.status}`}>
                          {job.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginBottom: "0.75rem", maxWidth: 640 }}>
                        {job.products?.issue_description || "General maintenance and repair service."}
                      </p>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                        <span>👤 {job.users?.name || "Customer"}</span>
                        <span>📞 {job.users?.phone || "N/A"}</span>
                        <span style={{ textTransform: "capitalize" }}>📍 {job.service_type?.replace(/_/g, " ")}</span>
                        <span>🕒 {new Date(job.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-brand-400)", fontWeight: 600, fontSize: "0.875rem" }}>
                      Manage Job <ChevronRight size={18} />
                    </div>
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
