"use client"

import { useState, useEffect } from "react"
import { 
  History, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Wrench, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  ShieldCheck, 
  Star, 
  FileText, 
  Radio, 
  Layers, 
  ArrowRight,
  MessageSquare,
  Edit3
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { updateBookingStatusAdmin } from "../actions"

const STAGES = [
  "booked",
  "assigned",
  "diagnosis",
  "awaiting_approval",
  "in_repair",
  "quality_check",
  "completed",
] as const

interface TimelineBooking {
  id: string
  status: string
  service_type: string
  scheduled_at: string | null
  estimated_cost: number | null
  final_cost: number | null
  customer_address: string | null
  created_at: string
  updated_at: string
  products: {
    id: string
    brand: string | null
    model: string | null
    issue_description: string
    media_urls: string[]
    categories: {
      id: string
      name: string
    } | null
  } | null
  users: {
    id: string
    name: string
    email: string
    phone: string | null
  } | null
  provider_profiles: {
    id: string
    business_name: string
    rating_avg: number
    users: {
      name: string
      phone: string | null
    } | null
  } | null
  repair_status_log: Array<{
    id: string
    status: string
    note: string | null
    changed_at: string
    users: {
      name: string
      role: string
    } | null
  }>
  quotations: {
    id: string
    diagnosis_notes: string
    quoted_amount: number
    parts_breakdown: any
    labour_cost: number | null
    approved_by_customer: boolean | null
    responded_at: string | null
  } | null
  payments: {
    id: string
    amount: number
    method: string
    status: string
    transaction_ref: string | null
    paid_at: string | null
  } | null
  warranties: {
    id: string
    duration_days: number
    starts_at: string
    expires_at: string
    terms: string | null
  } | null
  reviews: {
    id: string
    rating: number
    quality_score: number | null
    price_score: number | null
    timeliness_score: number | null
    comment: string | null
  } | null
}

export function MasterTimelinesClient({ 
  initialBookings 
}: { 
  initialBookings: TimelineBooking[] 
}) {
  const [bookings, setBookings] = useState<TimelineBooking[]>(initialBookings)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [providerFilter, setProviderFilter] = useState("all")
  const [customerFilter, setCustomerFilter] = useState("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [overrideModalId, setOverrideModalId] = useState<string | null>(null)
  const [overrideStatus, setOverrideStatus] = useState<any>("in_repair")
  const [overrideNote, setOverrideNote] = useState("")
  const [isLiveActive, setIsLiveActive] = useState(true)

  // Realtime Supabase Subscription for Master Timeline updates
  useEffect(() => {
    if (!isLiveActive) return

    const supabase = createClient()
    const channel = supabase
      .channel("admin-master-timelines")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "repair_status_log" },
        (payload) => {
          // Re-fetch or trigger reload
          console.log("Realtime timeline event received:", payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isLiveActive])

  // Extract unique providers and customers for dropdowns
  const uniqueProviders = Array.from(
    new Map(
      bookings
        .filter((b) => b.provider_profiles)
        .map((b) => [b.provider_profiles!.id, b.provider_profiles!.business_name])
    ).entries()
  )

  const uniqueCustomers = Array.from(
    new Map(
      bookings
        .filter((b) => b.users)
        .map((b) => [b.users!.id, b.users!.name])
    ).entries()
  )

  // Filtering
  const filtered = bookings.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false
    if (providerFilter !== "all" && b.provider_profiles?.id !== providerFilter) return false
    if (customerFilter !== "all" && b.users?.id !== customerFilter) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      const matchId = b.id.toLowerCase().includes(q)
      const matchCust = b.users?.name?.toLowerCase().includes(q) || b.users?.email?.toLowerCase().includes(q)
      const matchTech = b.provider_profiles?.business_name?.toLowerCase().includes(q)
      const matchProd = `${b.products?.brand || ""} ${b.products?.model || ""}`.toLowerCase().includes(q)
      const matchIssue = b.products?.issue_description?.toLowerCase().includes(q)
      if (!matchId && !matchCust && !matchTech && !matchProd && !matchIssue) return false
    }

    return true
  })

  async function handleStatusOverride(bookingId: string) {
    if (!overrideNote.trim()) {
      alert("An administrative reason / note is mandatory for this override.")
      return
    }
    try {
      const res = await updateBookingStatusAdmin(bookingId, overrideStatus, overrideNote.trim())
      if (!res.success) throw new Error(res.error)
      setOverrideModalId(null)
      setOverrideNote("")
    } catch (err: any) {
      alert("Override failed: " + err.message)
    }
  }

  function getStageIndex(currentStatus: string) {
    if (currentStatus === "cancelled") return -1
    return STAGES.indexOf(currentStatus as any)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ─── Control & Filter Bar ─────────────────────────────────── */}
      <div 
        style={{
          background: "var(--color-surface-100)",
          padding: "1.25rem",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-surface-200)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          {/* Search box */}
          <div style={{ position: "relative", minWidth: "300px", flex: 1 }}>
            <Search size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
            <input
              type="text"
              placeholder="Search across all timelines by Booking ID, Customer, Tech, Brand, or Issue..."
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

          {/* Live Stream Switch */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => setIsLiveActive(!isLiveActive)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.875rem",
                borderRadius: "var(--radius-md)",
                background: isLiveActive ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                border: isLiveActive ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--color-surface-200)",
                color: isLiveActive ? "#34d399" : "var(--color-text-muted)",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Radio size={14} className={isLiveActive ? "animate-pulse" : undefined} />
              <span>{isLiveActive ? "Live WebSocket Active" : "Live Paused"}</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Status Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Stage:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface-0)",
                border: "1px solid var(--color-surface-200)",
                color: "var(--color-text-primary)",
                fontSize: "0.8125rem",
              }}
            >
              <option value="all">All Status Stages ({bookings.length})</option>
              <option value="booked">Booked</option>
              <option value="assigned">Assigned</option>
              <option value="diagnosis">Diagnosis</option>
              <option value="awaiting_approval">Awaiting Customer Approval</option>
              <option value="in_repair">In Repair</option>
              <option value="quality_check">Quality Check</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Technician Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Tech:</span>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface-0)",
                border: "1px solid var(--color-surface-200)",
                color: "var(--color-text-primary)",
                fontSize: "0.8125rem",
                maxWidth: "200px",
              }}
            >
              <option value="all">All Technicians</option>
              {uniqueProviders.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          {/* Customer Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Customer:</span>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface-0)",
                border: "1px solid var(--color-surface-200)",
                color: "var(--color-text-primary)",
                fontSize: "0.8125rem",
                maxWidth: "200px",
              }}
            >
              <option value="all">All Customers</option>
              {uniqueCustomers.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          {(statusFilter !== "all" || providerFilter !== "all" || customerFilter !== "all" || search) && (
            <button
              onClick={() => {
                setStatusFilter("all")
                setProviderFilter("all")
                setCustomerFilter("all")
                setSearch("")
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-brand-400)",
                fontSize: "0.75rem",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ─── Timeline Feed Cards ──────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
          <History size={36} color="var(--color-brand-400)" style={{ margin: "0 auto 0.75rem" }} />
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "#ffffff", marginBottom: "0.25rem" }}>
            No timelines matched your query
          </div>
          <div style={{ fontSize: "0.8125rem" }}>Try clearing your filters or search terms.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {filtered.map((b) => {
            const isExpanded = expandedId === b.id
            const currentStageIdx = getStageIndex(b.status)
            const isCancelled = b.status === "cancelled"
            const product = b.products
            const customer = b.users
            const provider = b.provider_profiles
            const quote = b.quotations
            const payment = b.payments
            const warranty = b.warranties
            const review = b.reviews

            return (
              <div
                key={b.id}
                className="card"
                style={{
                  background: "var(--color-surface-100)",
                  border: isExpanded ? "1px solid var(--color-brand-500)" : "1px solid var(--color-surface-200)",
                  borderRadius: "var(--radius-xl)",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                }}
              >
                {/* ── Card Main Header ──────────────────────────────── */}
                <div style={{ padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "0.8125rem", color: "var(--color-brand-400)", fontWeight: 700, background: "rgba(16, 185, 129, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                          #{b.id.slice(0, 8).toUpperCase()}
                        </span>
                        <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>
                          {product?.brand || ""} {product?.model || "Device"}
                        </h3>
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                          ({product?.categories?.name || "General"})
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                        Issue: &ldquo;{product?.issue_description || "No issue details"}&rdquo;
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span className={`badge badge-${b.status}`} style={{ fontSize: "0.8125rem", padding: "0.375rem 0.875rem" }}>
                        {b.status.replace(/_/g, " ").toUpperCase()}
                      </span>
                      <button
                        onClick={() => setOverrideModalId(b.id)}
                        className="btn btn-secondary"
                        style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.375rem" }}
                      >
                        <Edit3 size={12} />
                        <span>Override</span>
                      </button>
                    </div>
                  </div>

                  {/* Customer & Technician Participants Strip */}
                  <div 
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "1rem",
                      padding: "0.875rem 1rem",
                      borderRadius: "var(--radius-md)",
                      background: "rgba(0, 0, 0, 0.25)",
                      marginBottom: "1.25rem",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                        👤 Customer
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#ffffff" }}>{customer?.name || "Unknown"}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{customer?.email} &bull; {customer?.phone || "No phone"}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                        🔧 Technician / Business
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#ffffff" }}>
                        {provider?.business_name || "Unassigned"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                        {provider?.users?.name ? `Contact: ${provider.users.name}` : "Pending assignment"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                        📦 Service Mode & Pricing
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-brand-400)" }}>
                        {b.service_type.toUpperCase()} &bull; Final: ₹{b.final_cost || b.estimated_cost || "TBD"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        Created: {new Date(b.created_at).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                  </div>

                  {/* ── Visual Step Progress Bar ────────────────────── */}
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", position: "relative", alignItems: "center" }}>
                      {/* Connecting line */}
                      <div 
                        style={{
                          position: "absolute",
                          left: "2%",
                          right: "2%",
                          height: "3px",
                          background: "var(--color-surface-300)",
                          top: "50%",
                          transform: "translateY(-50%)",
                          zIndex: 1,
                        }}
                      />
                      
                      {STAGES.map((st, idx) => {
                        const isDone = !isCancelled && currentStageIdx >= idx
                        const isCurrent = !isCancelled && currentStageIdx === idx

                        return (
                          <div 
                            key={st}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              zIndex: 2,
                              position: "relative",
                            }}
                          >
                            <div 
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: isCurrent 
                                  ? "var(--color-brand-500)" 
                                  : isDone 
                                  ? "#10b981" 
                                  : "var(--color-surface-200)",
                                border: isCurrent ? "3px solid rgba(16, 185, 129, 0.4)" : "none",
                                boxShadow: isCurrent ? "0 0 10px #10b981" : undefined,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "0.375rem",
                              }}
                            >
                              {isDone && <CheckCircle2 size={12} color="#ffffff" />}
                            </div>
                            <span 
                              style={{
                                fontSize: "0.6875rem",
                                fontWeight: isCurrent ? 700 : 500,
                                color: isCurrent ? "#34d399" : isDone ? "var(--color-text-primary)" : "var(--color-text-muted)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {st.replace(/_/g, " ")}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Expand / Collapse Button */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      color: "var(--color-text-secondary)",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.375rem",
                    }}
                  >
                    <span>{isExpanded ? "Hide Full Timeline Audit & Details" : "View Full Timeline History & Audit Trail"}</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* ── Expanded Full Audit Trail & Details ─────────────── */}
                {isExpanded && (
                  <div 
                    style={{
                      borderTop: "1px solid var(--color-surface-200)",
                      background: "rgba(10, 15, 26, 0.5)",
                      padding: "1.75rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.5rem",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
                      {/* Left Column: Chronological Audit Log */}
                      <div>
                        <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <History size={16} color="var(--color-brand-400)" />
                          <span>Immutable Status Transition Log</span>
                        </h4>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          {b.repair_status_log?.map((log, lIdx) => (
                            <div 
                              key={log.id || lIdx}
                              style={{
                                padding: "0.875rem",
                                borderRadius: "var(--radius-md)",
                                background: "var(--color-surface-100)",
                                border: "1px solid var(--color-surface-200)",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                                <span className={`badge badge-${log.status}`}>
                                  {log.status.replace(/_/g, " ")}
                                </span>
                                <span style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>
                                  {new Date(log.changed_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                                </span>
                              </div>
                              {log.note && (
                                <div style={{ fontSize: "0.8125rem", color: "var(--color-text-primary)", marginTop: "0.375rem" }}>
                                  {log.note}
                                </div>
                              )}
                              <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                                Recorded by: {log.users?.name || "System"} ({log.users?.role || "auto"})
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right Column: Quotes, Payments & Warranty */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {/* Quotation */}
                        <div style={{ padding: "1rem", borderRadius: "var(--radius-md)", background: "var(--color-surface-100)", border: "1px solid var(--color-surface-200)" }}>
                          <h5 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.5rem", color: "#60a5fa" }}>
                            📄 Quotation & Diagnosis
                          </h5>
                          {quote ? (
                            <div style={{ fontSize: "0.8125rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                              <div>Diagnosis: <em>{quote.diagnosis_notes}</em></div>
                              <div>Quoted Amount: <strong>₹{quote.quoted_amount}</strong></div>
                              <div>Labor: ₹{quote.labour_cost || 0}</div>
                              <div>
                                Customer Response:{" "}
                                <span style={{ fontWeight: 700, color: quote.approved_by_customer === true ? "#34d399" : quote.approved_by_customer === false ? "#f87171" : "#fbbf24" }}>
                                  {quote.approved_by_customer === true ? "Approved" : quote.approved_by_customer === false ? "Declined" : "Pending Customer Decision"}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>No quote submitted yet.</div>
                          )}
                        </div>

                        {/* Payment */}
                        <div style={{ padding: "1rem", borderRadius: "var(--radius-md)", background: "var(--color-surface-100)", border: "1px solid var(--color-surface-200)" }}>
                          <h5 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.5rem", color: "#34d399" }}>
                            💳 Payment & Settlement
                          </h5>
                          {payment ? (
                            <div style={{ fontSize: "0.8125rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                              <div>Amount: <strong>₹{payment.amount}</strong> &bull; Method: {payment.method}</div>
                              <div>Status: <span className={`badge badge-${payment.status}`}>{payment.status}</span></div>
                              {payment.transaction_ref && <div style={{ fontSize: "0.6875rem", fontFamily: "monospace", color: "var(--color-text-muted)" }}>Txn Ref: {payment.transaction_ref}</div>}
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Payment pending completion.</div>
                          )}
                        </div>

                        {/* Warranty */}
                        {warranty && (
                          <div style={{ padding: "1rem", borderRadius: "var(--radius-md)", background: "var(--color-surface-100)", border: "1px solid var(--color-surface-200)" }}>
                            <h5 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.5rem", color: "#c084fc" }}>
                              🛡️ Active Digital Warranty
                            </h5>
                            <div style={{ fontSize: "0.8125rem" }}>
                              Duration: <strong>{warranty.duration_days} Days</strong> (Expires: {new Date(warranty.expires_at).toLocaleDateString("en-IN")})
                            </div>
                          </div>
                        )}

                        {/* Review */}
                        {review && (
                          <div style={{ padding: "1rem", borderRadius: "var(--radius-md)", background: "var(--color-surface-100)", border: "1px solid var(--color-surface-200)" }}>
                            <h5 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.5rem", color: "#fbbf24" }}>
                              ⭐ Customer Review
                            </h5>
                            <div style={{ fontSize: "0.8125rem" }}>
                              Rating: <strong>{review.rating}/5</strong> &mdash; &ldquo;{review.comment}&rdquo;
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Admin Status Override Modal ──────────────────────────── */}
      {overrideModalId && (
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
              maxWidth: "500px",
              background: "var(--color-surface-100)",
              border: "1px solid var(--color-surface-300)",
              padding: "1.75rem",
              borderRadius: "var(--radius-xl)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>
              Admin Booking Status Override
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
              Manually advance, roll back, or cancel this repair stage. An immutable audit record will be logged.
            </p>

            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                Target Status
              </label>
              <select
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-surface-0)",
                  border: "1px solid var(--color-surface-200)",
                  color: "#ffffff",
                }}
              >
                <option value="booked">Booked</option>
                <option value="assigned">Assigned</option>
                <option value="diagnosis">Diagnosis</option>
                <option value="awaiting_approval">Awaiting Approval</option>
                <option value="in_repair">In Repair</option>
                <option value="quality_check">Quality Check</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                Administrative Override Reason / Note
              </label>
              <textarea
                placeholder="State the reason for this manual intervention..."
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-surface-0)",
                  border: "1px solid var(--color-surface-200)",
                  color: "#ffffff",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setOverrideModalId(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => handleStatusOverride(overrideModalId)} className="btn btn-primary">
                Save & Apply Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
