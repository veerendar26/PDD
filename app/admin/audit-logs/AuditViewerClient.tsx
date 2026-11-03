"use client"

import { useState } from "react"
import { 
  ShieldCheck, 
  FileText, 
  Clock, 
  Search, 
  Filter, 
  User, 
  AlertCircle, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowRight
} from "lucide-react"

export interface AuditRecord {
  id: string
  source: "admin_audit" | "repair_log"
  timestamp: string
  actorName: string
  actorEmail?: string
  actorRole: string
  action: string
  targetType: string
  targetId?: string | null
  noteOrDetails: string
}

export function AuditViewerClient({
  records,
}: {
  records: AuditRecord[]
}) {
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<"all" | "admin_override" | "technician_action" | "stage_transition">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Filtering
  const filtered = records.filter((r) => {
    if (filterType === "admin_override") {
      const isOverride = r.action.toLowerCase().includes("override") || r.noteOrDetails.toLowerCase().includes("[admin")
      if (!isOverride) return false
    } else if (filterType === "technician_action") {
      const isTech = r.action.toLowerCase().includes("technician") || r.actorRole === "technician"
      if (!isTech) return false
    } else if (filterType === "stage_transition") {
      if (r.source !== "repair_log") return false
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      const matchActor = r.actorName.toLowerCase().includes(q)
      const matchAction = r.action.toLowerCase().includes(q)
      const matchTarget = r.targetType.toLowerCase().includes(q) || (r.targetId && r.targetId.toLowerCase().includes(q))
      const matchNote = r.noteOrDetails.toLowerCase().includes(q)
      if (!matchActor && !matchAction && !matchTarget && !matchNote) return false
    }

    return true
  })

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ─── Search and Filter Bar ───────────────────────────────── */}
      <div 
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          background: "var(--color-surface-100)",
          padding: "1rem 1.25rem",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-surface-200)",
        }}
      >
        <div style={{ position: "relative", minWidth: "280px", flex: 1 }}>
          <Search size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
          <input
            type="text"
            placeholder="Search audit trail by actor, action, booking ID, or note..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            style={{
              width: "100%",
              padding: "0.625rem 1rem 0.625rem 2.5rem",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-0)",
              border: "1px solid var(--color-surface-200)",
              color: "var(--color-text-primary)",
              fontSize: "0.875rem",
            }}
          />
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All Audit Events", count: records.length },
            { key: "admin_override", label: "Admin Overrides", count: records.filter(r => r.action.toLowerCase().includes("override") || r.noteOrDetails.toLowerCase().includes("[admin")).length },
            { key: "stage_transition", label: "Repair Transitions", count: records.filter(r => r.source === "repair_log").length },
            { key: "technician_action", label: "Technician Approvals", count: records.filter(r => r.action.toLowerCase().includes("technician")).length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => {
                setFilterType(key as any)
                setCurrentPage(1)
              }}
              style={{
                padding: "0.5rem 0.875rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.8125rem",
                fontWeight: 600,
                border: filterType === key ? "1px solid var(--color-brand-500)" : "1px solid var(--color-surface-200)",
                background: filterType === key ? "rgba(16, 185, 129, 0.15)" : "var(--color-surface-50)",
                color: filterType === key ? "var(--color-brand-400)" : "var(--color-text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              <span>{label}</span>
              <span style={{ fontSize: "0.6875rem", opacity: 0.8, background: "rgba(255, 255, 255, 0.1)", padding: "1px 6px", borderRadius: "999px" }}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Audit Trail Data Table ──────────────────────────────── */}
      <div 
        style={{
          background: "var(--color-surface-100)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-surface-200)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-surface-200)", background: "rgba(0,0,0,0.2)" }}>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Timestamp</th>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Actor / User</th>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Action / Status</th>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Target Entity</th>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Notes & Audit Trail Details</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "3.5rem 1rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    <ShieldCheck size={36} color="var(--color-brand-400)" style={{ margin: "0 auto 0.75rem" }} />
                    <div style={{ fontWeight: 700, color: "#ffffff", marginBottom: "0.25rem" }}>
                      No Matching Audit Records Found
                    </div>
                    <div style={{ fontSize: "0.8125rem" }}>
                      Stage changes, approvals, and overrides will automatically appear here.
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((r, idx) => {
                  const isApproved = r.action.toLowerCase().includes("approved") || r.action.toLowerCase().includes("completed")
                  const isRejected = r.action.toLowerCase().includes("rejected") || r.action.toLowerCase().includes("cancelled") || r.action.toLowerCase().includes("suspended")
                  const isOverride = r.action.toLowerCase().includes("override") || r.noteOrDetails.toLowerCase().includes("[admin")

                  const formattedTime = new Date(r.timestamp).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  })

                  return (
                    <tr 
                      key={r.id + idx}
                      style={{ borderBottom: idx < paginated.length - 1 ? "1px solid var(--color-surface-200)" : undefined }}
                    >
                      <td style={{ padding: "1rem", fontSize: "0.8125rem", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                        {formattedTime}
                      </td>

                      <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                        <div style={{ fontWeight: 600, color: "#ffffff" }}>{r.actorName}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.125rem" }}>
                          <span 
                            style={{
                              fontSize: "0.625rem",
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: "4px",
                              textTransform: "uppercase",
                              background: r.actorRole === "admin" ? "rgba(96, 165, 250, 0.2)" : r.actorRole === "technician" ? "rgba(251, 191, 36, 0.2)" : "rgba(16, 185, 129, 0.2)",
                              color: r.actorRole === "admin" ? "#60a5fa" : r.actorRole === "technician" ? "#fbbf24" : "#34d399",
                            }}
                          >
                            {r.actorRole}
                          </span>
                          {r.actorEmail && (
                            <span style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>{r.actorEmail}</span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "1rem" }}>
                        <span 
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            textTransform: "uppercase",
                            background: isApproved 
                              ? "rgba(16, 185, 129, 0.15)" 
                              : isRejected
                              ? "rgba(239, 68, 68, 0.15)" 
                              : isOverride
                              ? "rgba(251, 191, 36, 0.15)"
                              : "rgba(96, 165, 250, 0.15)",
                            color: isApproved 
                              ? "#34d399" 
                              : isRejected
                              ? "#f87171" 
                              : isOverride
                              ? "#fbbf24"
                              : "#60a5fa",
                            border: `1px solid ${
                              isApproved 
                                ? "rgba(16, 185, 129, 0.3)" 
                                : isRejected
                                ? "rgba(239, 68, 68, 0.3)" 
                                : isOverride
                                ? "rgba(251, 191, 36, 0.3)"
                                : "rgba(96, 165, 250, 0.3)"
                            }`,
                          }}
                        >
                          {r.action.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td style={{ padding: "1rem", fontSize: "0.8125rem" }}>
                        <div style={{ color: "var(--color-text-secondary)" }}>
                          Type: <strong style={{ color: "#ffffff" }}>{r.targetType}</strong>
                        </div>
                        {r.targetId && (
                          <div style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--color-brand-400)", marginTop: "0.125rem" }}>
                            #{r.targetId.slice(0, 8).toUpperCase()}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "1rem", fontSize: "0.8125rem" }}>
                        <div 
                          style={{
                            padding: "0.5rem 0.75rem",
                            borderRadius: "var(--radius-sm)",
                            background: "var(--color-surface-0)",
                            border: "1px solid var(--color-surface-200)",
                            color: isOverride ? "#fbbf24" : "var(--color-text-primary)",
                            fontSize: "0.8125rem",
                            maxWidth: "420px",
                            wordBreak: "break-word",
                          }}
                        >
                          {r.noteOrDetails}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div 
            style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              padding: "0.875rem 1.25rem", 
              borderTop: "1px solid var(--color-surface-200)",
              fontSize: "0.8125rem",
              color: "var(--color-text-secondary)",
            }}
          >
            <div>
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} audit records
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary"
                style={{ padding: "0.375rem 0.75rem", fontSize: "0.75rem" }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>
              <span style={{ fontWeight: 600, color: "#ffffff" }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary"
                style={{ padding: "0.375rem 0.75rem", fontSize: "0.75rem" }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
