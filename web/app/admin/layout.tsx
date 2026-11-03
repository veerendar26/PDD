import { ReactNode } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Wrench, 
  History, 
  Layers, 
  Users, 
  Tag, 
  FileText, 
  ExternalLink,
  Activity,
  Bell,
  CheckCircle
} from "lucide-react"
import { AdminLogoutButton } from "./AdminLogoutButton"

export const metadata = {
  title: "Admin Command Center — EcoFix",
  description: "Comprehensive administration, technician activation, and live global timelines.",
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirectTo=/admin")
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("role, name, email, avatar_url")
    .eq("id", user.id)
    .single()

  if (userProfile?.role !== "admin") {
    redirect("/dashboard")
  }

  const adminSupabase = await createAdminClient()
  const { count: pendingCount } = await adminSupabase
    .from("provider_profiles")
    .select("*", { count: "exact", head: true })
    .eq("verification_status", "pending")

  const { count: activeJobsCount } = await adminSupabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .in("status", ["assigned", "diagnosis", "awaiting_approval", "in_repair", "quality_check"])

  const navItems = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { 
      href: "/admin/providers", 
      label: "Technicians & Approvals", 
      icon: Wrench,
      badge: (pendingCount ?? 0) > 0 ? `${pendingCount} Pending` : undefined,
      badgeColor: "#fbbf24"
    },
    { 
      href: "/admin/timelines", 
      label: "Master Timelines", 
      icon: History,
      badge: (activeJobsCount ?? 0) > 0 ? `${activeJobsCount} Live` : undefined,
      badgeColor: "#34d399"
    },
    { href: "/admin/bookings", label: "All Bookings", icon: Layers },
    { href: "/admin/users", label: "Users Directory", icon: Users },
    { href: "/admin/categories", label: "Service Categories", icon: Tag },
    { href: "/admin/audit-logs", label: "Audit & Governance", icon: FileText },
  ]

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-surface-0)", color: "var(--color-text-primary)" }}>
      {/* ─── Admin Sidebar ────────────────────────────────────────── */}
      <aside 
        style={{
          width: "280px",
          background: "linear-gradient(180deg, #0d1527 0%, #080d19 100%)",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "1.75rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          position: "sticky",
          top: 0,
          height: "100vh",
          flexShrink: 0,
          zIndex: 40,
        }}
      >
        {/* Brand Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", paddingBottom: "1.25rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div 
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
            }}
          >
            <ShieldCheck size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.125rem", letterSpacing: "-0.02em", color: "#ffffff" }}>
              EcoFix <span style={{ color: "var(--color-brand-400)", fontSize: "0.8125rem", fontWeight: 700, padding: "2px 6px", background: "rgba(16, 185, 129, 0.15)", borderRadius: "4px", marginLeft: "4px" }}>ADMIN</span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Command & Governance</div>
          </div>
        </div>

        {/* Live System Pulse Bar */}
        <div 
          style={{
            padding: "0.75rem 0.875rem",
            borderRadius: "var(--radius-md)",
            background: "rgba(16, 185, 129, 0.06)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 8px #10b981" }} />
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#34d399" }}>Live Postgres Sync</span>
          </div>
          <Activity size={14} color="#10b981" />
        </div>

        {/* Navigation Links */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.375rem", flex: 1, overflowY: "auto" }}>
          {navItems.map(({ href, label, icon: Icon, badge, badgeColor }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                textDecoration: "none",
                color: "var(--color-text-secondary)",
                fontSize: "0.875rem",
                fontWeight: 500,
                transition: "all 0.15s ease",
              }}
              className="admin-nav-link"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Icon size={18} />
                <span>{label}</span>
              </div>
              {badge && (
                <span 
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: `${badgeColor}22`,
                    color: badgeColor,
                    border: `1px solid ${badgeColor}44`,
                  }}
                >
                  {badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* User / Exit Footer */}
        <div style={{ paddingTop: "1rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div 
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: "var(--color-brand-400)",
                fontSize: "0.875rem",
                flexShrink: 0,
              }}
            >
              {userProfile?.name?.charAt(0) || "A"}
            </div>
            <div style={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#ffffff" }}>
                {userProfile?.name || "Admin User"}
              </div>
              <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {userProfile?.email}
              </div>
            </div>
          </div>

          {/* Logout Button directly beneath administrator's name and email */}
          <AdminLogoutButton />

          <Link
            href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.5rem",
              borderRadius: "var(--radius-sm)",
              background: "rgba(255, 255, 255, 0.04)",
              color: "var(--color-text-muted)",
              fontSize: "0.75rem",
              textDecoration: "none",
            }}
          >
            <span>Customer Dashboard</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </aside>

      {/* ─── Admin Content Area ───────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowX: "hidden" }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: "64px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(10, 15, 26, 0.8)",
            backdropFilter: "blur(12px)",
            padding: "0 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
              Admin Portal &bull; Multi-Tenant Database
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div 
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.375rem 0.875rem",
                borderRadius: "999px",
                background: "rgba(52, 211, 153, 0.1)",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                color: "#34d399",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              <CheckCircle size={13} />
              <span>Full Access Mode</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Body */}
        <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  )
}
