import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ShieldAlert, Home, LogOut } from "lucide-react"

export const dynamic = "force-dynamic"
export const metadata = { title: "Account Suspended — EcoFix" }

export default async function ProviderSuspendedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("provider_profiles")
    .select("verification_status, business_name")
    .eq("user_id", user.id)
    .maybeSingle()

  // Redirect if status has changed
  if (!profile) redirect("/onboarding")
  const isActive = (profile as any)?.is_active !== false
  if (profile.verification_status === "approved" && isActive) {
    redirect("/provider/dashboard")
  }
  if (isActive) redirect("/provider/dashboard")

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
          <ShieldAlert size={40} style={{ color: "#f87171" }} />
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
          Account Restricted
        </div>

        <h1 style={{ fontSize: "1.625rem", fontWeight: 800, marginBottom: "0.75rem" }}>
          Your account has been suspended
        </h1>

        {profile.business_name && (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            Business: <strong style={{ color: "var(--color-text-primary)" }}>{profile.business_name}</strong>
          </p>
        )}

        <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.65, marginBottom: "2rem" }}>
          Your technician account has been temporarily restricted by an administrator.
          Dashboard access and job assignment are currently blocked.
          Please contact EcoFix support for further information or to appeal this decision.
        </p>

        <div style={{
          background: "rgba(251, 191, 36, 0.06)",
          border: "1px solid rgba(251, 191, 36, 0.2)",
          borderRadius: "var(--radius-md)",
          padding: "1rem 1.25rem",
          fontSize: "0.8125rem",
          color: "var(--color-text-secondary)",
          lineHeight: 1.6,
          marginBottom: "2rem",
          textAlign: "left",
        }}>
          <strong style={{ color: "#fbbf24" }}>Need help?</strong>
          <p style={{ marginTop: "0.375rem" }}>
            Email us at <strong>support@ecofix.in</strong> with your registered email address
            and account details. Our team will review your case within 2 business days.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
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
