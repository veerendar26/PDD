"use client"

import { useState } from "react"
import { 
  Users, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  Wrench, 
  UserCheck, 
  Eye, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  CheckCircle,
  ExternalLink
} from "lucide-react"
import { updateUserRoleAdmin } from "../actions"

export interface UserRecord {
  id: string
  role: "customer" | "technician" | "admin"
  name: string
  email: string
  phone: string | null
  avatar_url: string | null
  created_at: string
  provider_profiles?: {
    id: string
    business_name: string
    verification_status: string
    rating_avg: number
    total_reviews?: number
    address?: string | null
    service_radius_km?: number
    doorstep_available?: boolean
  } | null
}

export function UserDirectoryClient({
  users,
  currentAdminId
}: {
  users: UserRecord[]
  currentAdminId: string
}) {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "customer" | "technician" | "admin">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [targetRole, setTargetRole] = useState<"customer" | "technician" | "admin">("customer")
  const [isUpdatingRole, setIsUpdatingRole] = useState(false)
  const pageSize = 12

  // Filter
  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = u.name?.toLowerCase().includes(q)
      const matchEmail = u.email?.toLowerCase().includes(q)
      const matchPhone = u.phone?.toLowerCase().includes(q)
      const matchId = u.id?.toLowerCase().includes(q)
      const matchBiz = u.provider_profiles?.business_name?.toLowerCase().includes(q)
      if (!matchName && !matchEmail && !matchPhone && !matchId && !matchBiz) return false
    }

    return true
  })

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const paginatedUsers = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const counts = {
    all: users.length,
    customer: users.filter((u) => u.role === "customer").length,
    technician: users.filter((u) => u.role === "technician").length,
    admin: users.filter((u) => u.role === "admin").length,
  }

  async function handleUpdateRole() {
    if (!selectedUser) return
    if (selectedUser.id === currentAdminId) {
      alert("You cannot change your own administrative role.")
      return
    }

    if (!confirm(`Are you sure you want to change ${selectedUser.name}'s role to ${targetRole.toUpperCase()}?`)) {
      return
    }

    setIsUpdatingRole(true)
    try {
      const res = await updateUserRoleAdmin(selectedUser.id, targetRole)
      if (!res.success) throw new Error(res.error)
      alert("User role updated successfully.")
      setSelectedUser({ ...selectedUser, role: targetRole })
    } catch (err: any) {
      alert("Failed to update role: " + err.message)
    } finally {
      setIsUpdatingRole(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ─── Search and Filters Bar ──────────────────────────────── */}
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
            placeholder="Search by name, email, phone, user ID, or business..."
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

        {/* Role Filters */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All Users", count: counts.all },
            { key: "customer", label: "Customers", count: counts.customer },
            { key: "technician", label: "Technicians", count: counts.technician },
            { key: "admin", label: "Administrators", count: counts.admin },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => {
                setRoleFilter(key as any)
                setCurrentPage(1)
              }}
              style={{
                padding: "0.5rem 0.875rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.8125rem",
                fontWeight: 600,
                border: roleFilter === key ? "1px solid var(--color-brand-500)" : "1px solid var(--color-surface-200)",
                background: roleFilter === key ? "rgba(16, 185, 129, 0.15)" : "var(--color-surface-50)",
                color: roleFilter === key ? "var(--color-brand-400)" : "var(--color-text-secondary)",
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

      {/* ─── Users Table ─────────────────────────────────────────── */}
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
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>User</th>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Role</th>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Contact Details</th>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Profile / Business</th>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Registered</th>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    <Users size={32} color="var(--color-text-muted)" style={{ margin: "0 auto 0.75rem" }} />
                    <div style={{ fontWeight: 600, color: "#ffffff" }}>No matching users found</div>
                    <div style={{ fontSize: "0.8125rem" }}>Try a different search query or filter</div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, idx) => {
                  const provider = u.provider_profiles
                  const isCurrentAdmin = u.id === currentAdminId

                  return (
                    <tr 
                      key={u.id}
                      style={{ 
                        borderBottom: idx < paginatedUsers.length - 1 ? "1px solid var(--color-surface-200)" : undefined,
                        background: isCurrentAdmin ? "rgba(96, 165, 250, 0.03)" : undefined,
                      }}
                    >
                      <td style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div 
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: u.role === "admin" ? "rgba(96, 165, 250, 0.2)" : u.role === "technician" ? "rgba(251, 191, 36, 0.2)" : "var(--color-surface-200)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              color: u.role === "admin" ? "#60a5fa" : u.role === "technician" ? "#fbbf24" : "#ffffff",
                              fontSize: "0.875rem",
                            }}
                          >
                            {u.name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "#ffffff", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                              <span>{u.name}</span>
                              {isCurrentAdmin && (
                                <span style={{ fontSize: "0.625rem", padding: "1px 5px", background: "rgba(96, 165, 250, 0.2)", color: "#60a5fa", borderRadius: "4px" }}>
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                              #{u.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "1rem" }}>
                        <span 
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "999px",
                            textTransform: "uppercase",
                            background: u.role === "admin" ? "rgba(96, 165, 250, 0.15)" : u.role === "technician" ? "rgba(251, 191, 36, 0.15)" : "rgba(16, 185, 129, 0.15)",
                            color: u.role === "admin" ? "#60a5fa" : u.role === "technician" ? "#fbbf24" : "#34d399",
                            border: `1px solid ${u.role === "admin" ? "rgba(96, 165, 250, 0.3)" : u.role === "technician" ? "rgba(251, 191, 36, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                          }}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td style={{ padding: "1rem", fontSize: "0.8125rem" }}>
                        <div style={{ color: "var(--color-text-primary)" }}>{u.email}</div>
                        <div style={{ color: "var(--color-text-muted)" }}>{u.phone || "No phone provided"}</div>
                      </td>

                      <td style={{ padding: "1rem", fontSize: "0.8125rem" }}>
                        {provider ? (
                          <div>
                            <div style={{ fontWeight: 600, color: "#ffffff" }}>{provider.business_name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                              Status: <strong style={{ color: provider.verification_status === "approved" ? "#34d399" : "#fbbf24" }}>{provider.verification_status}</strong>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)" }}>Customer Account</span>
                        )}
                      </td>

                      <td style={{ padding: "1rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                        {new Date(u.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td style={{ padding: "1rem", textAlign: "right" }}>
                        <button
                          onClick={() => {
                            setSelectedUser(u)
                            setTargetRole(u.role)
                          }}
                          className="btn btn-secondary"
                          style={{ padding: "0.375rem 0.75rem", fontSize: "0.75rem" }}
                        >
                          <Eye size={13} />
                          <span>View & Manage</span>
                        </button>
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
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} users
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

      {/* ─── User Detail & Role Management Modal ─────────────────── */}
      {selectedUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            zIndex: 100,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "540px",
              background: "var(--color-surface-100)",
              border: "1px solid var(--color-surface-300)",
              padding: "1.75rem",
              borderRadius: "var(--radius-xl)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7)",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div 
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "var(--color-surface-200)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "var(--color-brand-400)",
                  }}
                >
                  {selectedUser.name?.charAt(0) || "U"}
                </div>
                <div>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>
                    {selectedUser.name}
                  </h3>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                    UUID: {selectedUser.id}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Info Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.8125rem" }}>
              <div style={{ padding: "0.75rem", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Email</div>
                <div style={{ fontWeight: 600, color: "#ffffff", wordBreak: "break-all" }}>{selectedUser.email}</div>
              </div>
              <div style={{ padding: "0.75rem", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Phone</div>
                <div style={{ fontWeight: 600, color: "#ffffff" }}>{selectedUser.phone || "Not registered"}</div>
              </div>
              <div style={{ padding: "0.75rem", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Current Role</div>
                <div style={{ fontWeight: 700, textTransform: "uppercase", color: selectedUser.role === "admin" ? "#60a5fa" : selectedUser.role === "technician" ? "#fbbf24" : "#34d399" }}>
                  {selectedUser.role}
                </div>
              </div>
              <div style={{ padding: "0.75rem", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Registered On</div>
                <div style={{ fontWeight: 600, color: "#ffffff" }}>
                  {new Date(selectedUser.created_at).toLocaleDateString("en-IN", {
                    dateStyle: "medium"
                  })}
                </div>
              </div>
            </div>

            {/* Linked Technician Profile if exists */}
            {selectedUser.provider_profiles && (
              <div style={{ padding: "1rem", background: "rgba(251, 191, 36, 0.05)", border: "1px solid rgba(251, 191, 36, 0.2)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", marginBottom: "0.375rem" }}>
                  Linked Technician Profile
                </div>
                <div style={{ fontWeight: 700, color: "#ffffff", fontSize: "0.9375rem" }}>
                  {selectedUser.provider_profiles.business_name}
                </div>
                <div style={{ display: "flex", gap: "1rem", marginTop: "0.375rem", fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                  <span>Status: <strong>{selectedUser.provider_profiles.verification_status}</strong></span>
                  <span>Rating: <strong>{selectedUser.provider_profiles.rating_avg.toFixed(1)} ⭐</strong></span>
                  {selectedUser.provider_profiles.service_radius_km && (
                    <span>Radius: <strong>{selectedUser.provider_profiles.service_radius_km} km</strong></span>
                  )}
                </div>
              </div>
            )}

            {/* Administrative Role Assignment Guard */}
            <div style={{ paddingTop: "0.75rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Update User Role
              </label>

              {selectedUser.id === currentAdminId ? (
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", background: "var(--color-surface-0)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
                  🛡️ You cannot modify your own administrative role.
                </div>
              ) : (
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as any)}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--color-surface-0)",
                      border: "1px solid var(--color-surface-200)",
                      color: "#ffffff",
                      fontSize: "0.875rem",
                    }}
                  >
                    <option value="customer">Customer</option>
                    <option value="technician">Technician</option>
                    <option value="admin">Administrator</option>
                  </select>
                  <button
                    onClick={handleUpdateRole}
                    disabled={isUpdatingRole || targetRole === selectedUser.role}
                    className="btn btn-primary"
                    style={{ fontSize: "0.8125rem", padding: "0.5rem 1rem" }}
                  >
                    {isUpdatingRole ? "Saving..." : "Change Role"}
                  </button>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button onClick={() => setSelectedUser(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
