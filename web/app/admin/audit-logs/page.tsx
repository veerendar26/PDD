import { createAdminClient } from "@/lib/supabase/server"
import { AuditViewerClient, AuditRecord } from "./AuditViewerClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Admin Audit & Governance Logs — EcoFix Admin" }

export default async function AdminAuditLogsPage() {
  const adminSupabase = await createAdminClient()

  // 1. Fetch immutable repair_status_log (always present in database)
  const { data: statusLogs, error: statusErr } = await adminSupabase
    .from("repair_status_log")
    .select(`
      id,
      booking_id,
      status,
      note,
      changed_at,
      users!repair_status_log_changed_by_fkey (
        name,
        email,
        role
      )
    `)
    .order("changed_at", { ascending: false })
    .limit(150)

  if (statusErr) {
    console.error("Error fetching repair_status_log:", statusErr.message)
  }

  // 2. Fetch admin_audit_logs if table is available
  let adminLogs: any[] = []
  try {
    const { data, error } = await adminSupabase
      .from("admin_audit_logs")
      .select(`
        id,
        action,
        target_type,
        target_id,
        details,
        created_at,
        users!admin_audit_logs_admin_id_fkey (
          name,
          email,
          role
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100)

    if (!error && data) {
      adminLogs = data
    }
  } catch (err) {
    // Graceful fallback if table is not yet deployed to remote DB
  }

  // 3. Normalize into unified AuditRecord stream
  const records: AuditRecord[] = []

  // Add repair status logs
  if (statusLogs) {
    for (const log of statusLogs as any[]) {
      const isOverride = log.note?.includes("[Admin Override")
      records.push({
        id: log.id,
        source: "repair_log",
        timestamp: log.changed_at,
        actorName: log.users?.name || "System",
        actorEmail: log.users?.email,
        actorRole: log.users?.role || "system",
        action: isOverride ? "status_override" : `stage_${log.status}`,
        targetType: "booking",
        targetId: log.booking_id,
        noteOrDetails: log.note || `Stage updated to ${log.status}`,
      })
    }
  }

  // Add admin audit logs
  if (adminLogs) {
    for (const log of adminLogs) {
      records.push({
        id: log.id,
        source: "admin_audit",
        timestamp: log.created_at,
        actorName: log.users?.name || "Administrator",
        actorEmail: log.users?.email,
        actorRole: log.users?.role || "admin",
        action: log.action,
        targetType: log.target_type,
        targetId: log.target_id,
        noteOrDetails: typeof log.details === "object" ? JSON.stringify(log.details) : String(log.details || ""),
      })
    }
  }

  // Sort descending by timestamp
  records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--color-brand-400)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Security & Governance
          </span>
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
          Audit Trail & Activity Log ({records.length})
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          Immutable log of all repair stage transitions, technician approvals, manual status overrides, and system changes.
        </p>
      </div>

      {/* Interactive Audit Viewer */}
      <AuditViewerClient records={records} />
    </div>
  )
}
