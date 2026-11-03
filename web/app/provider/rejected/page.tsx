import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { XCircle, ArrowRight, Home, LogOut } from "lucide-react"

export const dynamic = "force-dynamic"
export const metadata = { title: "Application Rejected — EcoFix" }

export default async function ProviderRejectedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("provider_profiles")
    .select("verification_status, business_name, updated_at")
    .eq("user_id", user.id)
    .maybeSingle()

  // Redirect if status has changed
  if (!profile) redirect("/onboarding")

  const isActive = (profile as any)?.is_active !== false

  if (profile.verification_status === "approved" && isActive) {
    redirect("/provider/dashboard")
  }
  if (profile.verification_status === "pending") redirect("/provider/pending")
  if (!isActive && profile.verification_status !== "rejected") {
    redirect("/provider/suspended")
  }

  const reviewedAt = profile.updated_at
    ? new Date(profile.updated_at).toLocaleDateString("en-IN", {
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
      <div className="card" style={{ padding: "3rem", textAlign: "center", maxWidth: 540, width: "100%" }}>
        {/* Red icon */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "rgba(239, 68, 68, 0.1)",
          border: "2px solid rgba(239, 68, 68, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 1.5rem",
        }}>
          <XCircle size={40} style={{ color: "#f87171" }} />
        </div>

        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          padding: "0.375rem 0.875rem",
          borderRadius: "9999px",
          color: "#f87171",
          fontSize: "0.75rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "1rem",
        }}>
          Application Not Approved
        </div>

        <h1 style={{ fontSize: "1.625rem", fontWeight: 800, marginBottom: "0.75rem" }}>
          Your application was not approved
        </h1>

        {profile.business_name && (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
            Business: <strong style={{ color: "var(--color-text-primary)" }}>{profile.business_name}</strong>
            {reviewedAt && <> · Reviewed on {reviewedAt}</>}
          </p>
        )}

        {/* Rejection reason */}
        {(profile as any).rejection_reason && (
          <div style={{
            background: "rgba(239, 68, 68, 0.06)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "var(--radius-md)",
            padding: "1rem 1.25rem",
            textAlign: "left",
            marginBottom: "2rem",
          }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#f87171", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Reason for Rejection
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              {(profile as any).rejection_reason}
            </p>
          </div>
        )}

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
          <strong style={{ color: "var(--color-brand-400)" }}>You can reapply.</strong>
          <p style={{ marginTop: "0.375rem" }}>
            Address the feedback above, update your profile, and resubmit your application.
            Your application will be sent back for admin review.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/onboarding"
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            Update &amp; Resubmit Application <ArrowRight size={16} />
          </Link>
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
            >
              <LogOut size={15} /> Go to Login Page
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
