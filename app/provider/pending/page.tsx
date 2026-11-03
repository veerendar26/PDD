import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Clock, LogOut, RefreshCw, Home } from "lucide-react"

export const dynamic = "force-dynamic"
export const metadata = { title: "Verification Pending — EcoFix" }

export default async function ProviderPendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Server-side: confirm they really are pending (not a mis-navigation)
  const { data: profile } = await supabase
    .from("provider_profiles")
    .select("verification_status, business_name, created_at")
    .eq("user_id", user.id)
    .maybeSingle()

  const isActive = (profile as any)?.is_active !== false

  // If already approved, let them through
  if (profile?.verification_status === "approved" && isActive) {
    redirect("/provider/dashboard")
  }

  if (profile?.verification_status === "rejected") {
    redirect("/provider/rejected")
  }

  if (!isActive) {
    redirect("/provider/suspended")
  }

  const submittedAt = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--color-surface-0)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
    }}>
      <div className="card" style={{ padding: "3rem", textAlign: "center", maxWidth: 520, width: "100%" }}>
        {/* Animated clock icon */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "rgba(251, 191, 36, 0.12)",
          border: "2px solid rgba(251, 191, 36, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 1.5rem",
        }}>
          <Clock size={40} style={{ color: "#fbbf24" }} />
        </div>

        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "rgba(251, 191, 36, 0.1)",
          border: "1px solid rgba(251, 191, 36, 0.3)",
          padding: "0.375rem 0.875rem",
          borderRadius: "9999px",
          color: "#fbbf24",
          fontSize: "0.75rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "1rem",
        }}>
          ⏳ Awaiting Admin Review
        </div>

        <h1 style={{ fontSize: "1.625rem", fontWeight: 800, marginBottom: "0.75rem" }}>
          Your application is under review
        </h1>

        <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.65, marginBottom: "0.5rem" }}>
          Your technician account is awaiting admin verification. You will receive access after approval.
        </p>

        {profile?.business_name && (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
            Application: <strong style={{ color: "var(--color-text-primary)" }}>{profile.business_name}</strong>
          </p>
        )}

        {submittedAt && (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginBottom: "2rem" }}>
            Submitted on {submittedAt}
          </p>
        )}

        {!submittedAt && <div style={{ marginBottom: "2rem" }} />}

        <div style={{
          background: "rgba(16, 185, 129, 0.06)",
          border: "1px solid rgba(16, 185, 129, 0.15)",
          borderRadius: "var(--radius-md)",
          padding: "1rem 1.25rem",
          textAlign: "left",
          marginBottom: "2rem",
          fontSize: "0.8125rem",
          color: "var(--color-text-secondary)",
          lineHeight: 1.6,
        }}>
          <strong style={{ color: "var(--color-brand-400)" }}>What happens next?</strong>
          <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <li>Our admin team reviews your credentials and business details</li>
            <li>Review typically completes within 1–2 business days</li>
            <li>You will receive a notification once a decision is made</li>
            <li>Once approved, you can start receiving repair job bookings</li>
          </ul>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <form action={async () => {
            "use server"
            redirect("/provider/pending")
          }}>
            <button
              type="submit"
              className="btn btn-outline"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}
            >
              <RefreshCw size={15} /> Check Status
            </button>
          </form>

          <Link
            href="/"
            className="btn btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", textDecoration: "none" }}
          >
            <Home size={15} /> Go to Home Page
          </Link>

          <form action={async () => {
            "use server"
            const supabase = await createClient()
            await supabase.auth.signOut()
            redirect("/auth/login")
          }}>
            <button
              type="submit"
              className="btn btn-ghost"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}
              title="Sign out of this technician account and return to the login screen"
            >
              <LogOut size={15} /> Go to Login Page
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
