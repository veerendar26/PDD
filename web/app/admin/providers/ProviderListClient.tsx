"use client"

import { useState } from "react"
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Star, 
  ShieldCheck, 
  AlertTriangle,
  Layers,
  Power,
  Eye,
  X,
  FileText,
  ExternalLink,
  RotateCcw
} from "lucide-react"
import { 
  approveProvider, 
  rejectProvider, 
  toggleProviderActiveStatus,
  requestResubmissionProvider 
} from "../actions"

export interface ProviderData {
  id: string
  user_id: string
  business_name: string
  description: string | null
  categories: string[]
  verification_status: "pending" | "approved" | "rejected"
  rating_avg: number
  total_reviews: number
  service_radius_km: number
  doorstep_available: boolean
  address: string | null
  identity_doc_url?: string | null
  created_at: string
  users: {
    id: string
    name: string
    email: string
    phone: string | null
    avatar_url: string | null
  } | null
}

interface CategoryMap {
  [id: string]: string
}

export function ProviderListClient({ 
  providers, 
  categories 
}: { 
  providers: ProviderData[]
  categories: CategoryMap 
}) {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [search, setSearch] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<ProviderData | null>(null)
  const [approvalNote, setApprovalNote] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [resubmitMessage, setResubmitMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [modalType, setModalType] = useState<"detail" | "approve" | "reject" | "resubmit" | null>(null)

  // Filter logic
  const filtered = providers.filter((p) => {
    // Status filter
    if (filter === "pending" && p.verification_status !== "pending") return false
    if (filter === "approved" && p.verification_status !== "approved") return false
    if (filter === "rejected" && p.verification_status !== "rejected") return false

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = p.business_name?.toLowerCase().includes(q)
      const matchOwner = p.users?.name?.toLowerCase().includes(q)
      const matchEmail = p.users?.email?.toLowerCase().includes(q)
      const matchPhone = p.users?.phone?.toLowerCase().includes(q)
      const matchAddr = p.address?.toLowerCase().includes(q)
      if (!matchName && !matchOwner && !matchEmail && !matchPhone && !matchAddr) return false
    }

    return true
  })

  const pendingCount = providers.filter((p) => p.verification_status === "pending").length
  const approvedCount = providers.filter((p) => p.verification_status === "approved").length
  const rejectedCount = providers.filter((p) => p.verification_status === "rejected").length

  async function handleApprove(id: string) {
    setIsProcessing(true)
    try {
      const res = await approveProvider(id, approvalNote || "Approved & Verified by Administrator")
      if (!res.success) throw new Error(res.error)
      setModalType(null)
      setSelectedProvider(null)
      setApprovalNote("")
    } catch (err: any) {
      alert("Failed to approve technician: " + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejecting this technician.")
      return
    }
    setIsProcessing(true)
    try {
      const res = await rejectProvider(id, rejectReason.trim())
      if (!res.success) throw new Error(res.error)
      setModalType(null)
      setSelectedProvider(null)
      setRejectReason("")
    } catch (err: any) {
      alert("Failed to reject technician: " + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleRequestResubmission(id: string) {
    if (!resubmitMessage.trim()) {
      alert("Please specify the instructions or documents needed for resubmission.")
      return
    }
    setIsProcessing(true)
    try {
      const res = await requestResubmissionProvider(id, resubmitMessage.trim())
      if (!res.success) throw new Error(res.error)
      setModalType(null)
      setSelectedProvider(null)
      setResubmitMessage("")
    } catch (err: any) {
      alert("Failed to request resubmission: " + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleToggleStatus(id: string, isCurrentlyApproved: boolean) {
    const actionLabel = isCurrentlyApproved ? "suspend" : "activate"
    if (!confirm(`Are you sure you want to ${actionLabel} this technician's account?`)) {
      return
    }
    setIsProcessing(true)
    try {
      const res = await toggleProviderActiveStatus(id, !isCurrentlyApproved)
      if (!res.success) throw new Error(res.error)
    } catch (err: any) {
      alert("Failed to toggle status: " + err.message)
    } finally {
      setIsProcessing(false)
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
        {/* Search input */}
        <div style={{ position: "relative", minWidth: "280px", flex: 1 }}>
          <Search size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
          <input
            type="text"
            placeholder="Search by business, technician name, email, phone, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            { key: "all", label: "All Technicians", count: providers.length },
            { key: "pending", label: "Pending Approvals", count: pendingCount, highlight: pendingCount > 0 },
            { key: "approved", label: "Verified & Active", count: approvedCount },
            { key: "rejected", label: "Rejected / Suspended", count: rejectedCount },
          ].map(({ key, label, count, highlight }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              style={{
                padding: "0.5rem 0.875rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.8125rem",
                fontWeight: 600,
                border: filter === key ? "1px solid var(--color-brand-500)" : "1px solid var(--color-surface-200)",
                background: filter === key ? "rgba(16, 185, 129, 0.15)" : highlight ? "rgba(251, 191, 36, 0.1)" : "var(--color-surface-50)",
                color: filter === key ? "var(--color-brand-400)" : highlight ? "#fbbf24" : "var(--color-text-secondary)",
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

      {/* ─── Providers Data List ─────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
          <AlertTriangle size={32} color="#fbbf24" style={{ margin: "0 auto 0.75rem" }} />
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "#ffffff", marginBottom: "0.25rem" }}>
            No technicians matching your criteria
          </div>
          <div style={{ fontSize: "0.8125rem" }}>
            Try adjusting your search terms or filter selection.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>
          {filtered.map((p) => {
            const isPending = p.verification_status === "pending"
            const isApproved = p.verification_status === "approved"
            const isRejected = p.verification_status === "rejected"

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "1.25rem",
                  border: isPending 
                    ? "1px solid rgba(251, 191, 36, 0.4)" 
                    : isRejected
                    ? "1px solid rgba(239, 68, 68, 0.3)" 
                    : "1px solid var(--color-surface-200)",
                  background: isPending 
                    ? "linear-gradient(180deg, rgba(251, 191, 36, 0.04) 0%, var(--color-surface-100) 100%)" 
                    : "var(--color-surface-100)",
                }}
              >
                {/* Header */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <div>
                      <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.125rem" }}>
                        {p.business_name}
                      </h3>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                        Technician: <strong style={{ color: "var(--color-text-primary)" }}>{p.users?.name || "N/A"}</strong>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                      <span 
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "999px",
                          textTransform: "uppercase",
                          background: isApproved 
                            ? "rgba(16, 185, 129, 0.15)" 
                            : isPending 
                            ? "rgba(251, 191, 36, 0.15)" 
                            : "rgba(239, 68, 68, 0.15)",
                          color: isApproved ? "#34d399" : isPending ? "#fbbf24" : "#f87171",
                          border: `1px solid ${isApproved ? "rgba(16, 185, 129, 0.3)" : isPending ? "rgba(251, 191, 36, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                        }}
                      >
                        {isApproved ? "VERIFIED" : p.verification_status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "1rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {p.description || "No trade description provided."}
                  </p>

                  {/* Contact & Location Details */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Mail size={13} color="var(--color-text-muted)" />
                      <span>{p.users?.email || "No email"}</span>
                    </div>
                    {p.users?.phone && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Phone size={13} color="var(--color-text-muted)" />
                        <span>{p.users.phone}</span>
                      </div>
                    )}
                    {p.address && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <MapPin size={13} color="var(--color-text-muted)" />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Document & Specializations */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                      {p.categories?.slice(0, 3).map((catId) => (
                        <span key={catId} style={{ fontSize: "0.6875rem", padding: "2px 8px", background: "var(--color-surface-200)", borderRadius: "4px", color: "var(--color-brand-300)" }}>
                          {categories[catId] || catId.slice(0, 8)}
                        </span>
                      ))}
                      {(p.categories?.length || 0) > 3 && (
                        <span style={{ fontSize: "0.6875rem", padding: "2px 6px", background: "var(--color-surface-200)", borderRadius: "4px", color: "var(--color-text-muted)" }}>
                          +{p.categories.length - 3} more
                        </span>
                      )}
                    </div>

                    {p.identity_doc_url && (
                      <a 
                        href={p.identity_doc_url} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{
                          fontSize: "0.75rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          color: "#60a5fa",
                          textDecoration: "none",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: "rgba(96, 165, 250, 0.1)",
                          border: "1px solid rgba(96, 165, 250, 0.2)",
                        }}
                      >
                        <FileText size={12} />
                        <span>View Document</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>

                  {/* Metrics Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.625rem 0.875rem", background: "rgba(0,0,0,0.25)", borderRadius: "var(--radius-md)", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Star size={13} color="#fbbf24" fill="#fbbf24" />
                      <strong style={{ color: "#ffffff" }}>{p.rating_avg.toFixed(1)}</strong> ({p.total_reviews} reviews)
                    </div>
                    <div>Radius: <strong>{p.service_radius_km} km</strong></div>
                    <div>Doorstep: <strong>{p.doorstep_available ? "Yes" : "No"}</strong></div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div style={{ display: "flex", gap: "0.5rem", paddingTop: "0.875rem", borderTop: "1px solid rgba(255, 255, 255, 0.06)", flexWrap: "wrap" }}>
                  {isPending && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedProvider(p)
                          setModalType("approve")
                        }}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: "0.5rem", fontSize: "0.8125rem" }}
                      >
                        <CheckCircle size={14} />
                        <span>Approve & Verify</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProvider(p)
                          setModalType("resubmit")
                        }}
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem 0.75rem", fontSize: "0.8125rem" }}
                        title="Request Resubmission"
                      >
                        <RotateCcw size={14} />
                        <span>Resubmit</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProvider(p)
                          setModalType("reject")
                        }}
                        className="btn btn-danger"
                        style={{ padding: "0.5rem 0.75rem", fontSize: "0.8125rem" }}
                      >
                        <XCircle size={14} />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {isApproved && (
                    <>
                      <button
                        onClick={() => handleToggleStatus(p.id, true)}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: "0.5rem", fontSize: "0.8125rem" }}
                        disabled={isProcessing}
                      >
                        <Power size={14} color="#f87171" />
                        <span>Suspend Access</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProvider(p)
                          setModalType("detail")
                        }}
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem 0.75rem", fontSize: "0.8125rem" }}
                      >
                        <Eye size={14} />
                        <span>Inspect Profile</span>
                      </button>
                    </>
                  )}

                  {isRejected && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedProvider(p)
                          setModalType("approve")
                        }}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: "0.5rem", fontSize: "0.8125rem" }}
                      >
                        <CheckCircle size={14} />
                        <span>Re-verify & Approve</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProvider(p)
                          setModalType("detail")
                        }}
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem 0.75rem", fontSize: "0.8125rem" }}
                      >
                        <Eye size={14} />
                        <span>Inspect</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Modal / Dialog ───────────────────────────────────────── */}
      {modalType && selectedProvider && (
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {modalType === "approve" && <CheckCircle size={20} color="#34d399" />}
                {modalType === "reject" && <XCircle size={20} color="#f87171" />}
                {modalType === "resubmit" && <RotateCcw size={20} color="#fbbf24" />}
                {modalType === "detail" && <ShieldCheck size={20} color="#60a5fa" />}
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>
                  {modalType === "approve" && "Approve & Verify Technician"}
                  {modalType === "reject" && "Reject Technician Application"}
                  {modalType === "resubmit" && "Request Application Resubmission"}
                  {modalType === "detail" && "Technician Deep Profile"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setModalType(null)
                  setSelectedProvider(null)
                }}
                style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Provider summary in modal */}
            <div style={{ padding: "0.875rem", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontWeight: 700, color: "#ffffff" }}>{selectedProvider.business_name}</div>
              <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                {selectedProvider.users?.name} &bull; {selectedProvider.users?.email}
              </div>
            </div>

            {/* Approve Form */}
            {modalType === "approve" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                    Verification / Admin Note (Optional)
                  </label>
                  <textarea
                    placeholder="e.g. Identity & trade certificate verified. Approved for customer bookings."
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--color-surface-0)",
                      border: "1px solid var(--color-surface-200)",
                      color: "#ffffff",
                      fontSize: "0.875rem",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button onClick={() => setModalType(null)} className="btn btn-secondary">Cancel</button>
                  <button 
                    onClick={() => handleApprove(selectedProvider.id)} 
                    disabled={isProcessing}
                    className="btn btn-primary"
                  >
                    {isProcessing ? "Verifying..." : "Confirm & Verify Account"}
                  </button>
                </div>
              </div>
            )}

            {/* Reject Form */}
            {modalType === "reject" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem", color: "#f87171" }}>
                    Reason for Rejection *
                  </label>
                  <textarea
                    placeholder="Provide specific feedback so the technician knows what was unverified..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--color-surface-0)",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      color: "#ffffff",
                      fontSize: "0.875rem",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button onClick={() => setModalType(null)} className="btn btn-secondary">Cancel</button>
                  <button 
                    onClick={() => handleReject(selectedProvider.id)} 
                    disabled={isProcessing || !rejectReason.trim()}
                    className="btn btn-danger"
                  >
                    {isProcessing ? "Rejecting..." : "Confirm Rejection"}
                  </button>
                </div>
              </div>
            )}

            {/* Resubmit Form */}
            {modalType === "resubmit" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem", color: "#fbbf24" }}>
                    Resubmission Instructions *
                  </label>
                  <textarea
                    placeholder="e.g. Please re-upload a clear trade license document or update your service address."
                    value={resubmitMessage}
                    onChange={(e) => setResubmitMessage(e.target.value)}
                    rows={3}
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--color-surface-0)",
                      border: "1px solid rgba(251, 191, 36, 0.4)",
                      color: "#ffffff",
                      fontSize: "0.875rem",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button onClick={() => setModalType(null)} className="btn btn-secondary">Cancel</button>
                  <button 
                    onClick={() => handleRequestResubmission(selectedProvider.id)} 
                    disabled={isProcessing || !resubmitMessage.trim()}
                    className="btn btn-primary"
                    style={{ background: "#d97706", borderColor: "#b45309" }}
                  >
                    {isProcessing ? "Sending..." : "Send Resubmission Request"}
                  </button>
                </div>
              </div>
            )}

            {/* Detail View */}
            {modalType === "detail" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", fontSize: "0.875rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div style={{ padding: "0.75rem", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Verification Status</div>
                    <div style={{ fontWeight: 700, color: selectedProvider.verification_status === "approved" ? "#34d399" : "#fbbf24" }}>
                      {selectedProvider.verification_status === "approved" ? "VERIFIED (ACTIVE)" : selectedProvider.verification_status.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ padding: "0.75rem", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Applied On</div>
                    <div style={{ fontWeight: 700 }}>
                      {new Date(selectedProvider.created_at).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                </div>

                {selectedProvider.identity_doc_url ? (
                  <div style={{ padding: "0.75rem", background: "rgba(96, 165, 250, 0.1)", borderRadius: "var(--radius-md)", border: "1px solid rgba(96, 165, 250, 0.2)" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#60a5fa", marginBottom: "0.25rem" }}>
                      Uploaded Verification Document:
                    </div>
                    <a 
                      href={selectedProvider.identity_doc_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                    >
                      <FileText size={14} />
                      <span>Open Document in New Tab</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ) : (
                  <div style={{ padding: "0.75rem", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)", color: "var(--color-text-muted)" }}>
                    No identity/trade document uploaded.
                  </div>
                )}

                <div style={{ padding: "0.75rem", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>Service Categories</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                    {selectedProvider.categories?.map((catId) => (
                      <span key={catId} style={{ fontSize: "0.75rem", padding: "2px 8px", background: "var(--color-surface-200)", borderRadius: "4px", color: "var(--color-brand-400)" }}>
                        {categories[catId] || catId}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => setModalType(null)} className="btn btn-secondary">Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
