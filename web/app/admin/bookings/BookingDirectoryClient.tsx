"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Layers, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Eye, 
  Calendar, 
  User, 
  Wrench, 
  DollarSign, 
  ShieldCheck, 
  Edit3, 
  X, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  AlertTriangle
} from "lucide-react"
import { updateBookingStatusAdmin } from "../actions"

export interface BookingRecord {
  id: string
  status: "booked" | "assigned" | "diagnosis" | "awaiting_approval" | "in_repair" | "quality_check" | "completed" | "cancelled"
  estimated_cost: number | null
  final_cost: number | null
  scheduled_at: string | null
  service_type: "doorstep" | "pickup" | "in_store"
  customer_address: string | null
  notes: string | null
  created_at: string
  updated_at: string
  products: {
    id: string
    brand: string | null
    model: string | null
    issue_description: string
    media_urls?: string[]
    categories: {
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
    rating_avg?: number
  } | null
  quotations?: {
    id: string
    diagnosis_notes: string
    quoted_amount: number
    parts_breakdown?: any
    labour_cost?: number | null
    approved_by_customer?: boolean | null
    responded_at?: string | null
  } | null
  payments?: {
    id: string
    amount: number
    method: string
    status: string
    transaction_ref?: string | null
    paid_at?: string | null
  } | null
  warranties?: {
    id: string
    duration_days: number
    starts_at: string
    expires_at: string
    terms?: string | null
  } | null
}

const ALL_STATUSES = [
  "booked",
  "assigned",
  "diagnosis",
  "awaiting_approval",
  "in_repair",
  "quality_check",
  "completed",
  "cancelled",
] as const

export function BookingDirectoryClient({
  bookings,
}: {
  bookings: BookingRecord[]
}) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all")
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null)
  const [overrideModal, setOverrideModal] = useState<BookingRecord | null>(null)
  const [overrideTargetStatus, setOverrideTargetStatus] = useState<any>("in_repair")
  const [overrideReason, setOverrideReason] = useState("")
  const [isOverriding, setIsOverriding] = useState(false)
  const pageSize = 12

  // Filter logic
  const filtered = bookings.filter((b) => {
    // Status
    if (statusFilter !== "all" && b.status !== statusFilter) return false

    // Service type
    if (serviceTypeFilter !== "all" && b.service_type !== serviceTypeFilter) return false

    // Date
    if (dateFilter !== "all") {
      const created = new Date(b.created_at).getTime()
      const now = Date.now()
      if (dateFilter === "today" && now - created > 24 * 60 * 60 * 1000) return false
      if (dateFilter === "week" && now - created > 7 * 24 * 60 * 60 * 1000) return false
      if (dateFilter === "month" && now - created > 30 * 24 * 60 * 60 * 1000) return false
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchId = b.id.toLowerCase().includes(q)
      const matchCust = b.users?.name?.toLowerCase().includes(q) || b.users?.email?.toLowerCase().includes(q)
      const matchTech = b.provider_profiles?.business_name?.toLowerCase().includes(q)
      const matchBrand = b.products?.brand?.toLowerCase().includes(q)
      const matchModel = b.products?.model?.toLowerCase().includes(q)
      const matchCat = b.products?.categories?.name?.toLowerCase().includes(q)
      if (!matchId && !matchCust && !matchTech && !matchBrand && !matchModel && !matchCat) return false
    }

    return true
  })

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  async function handleOverrideStatus() {
    if (!overrideModal) return
    if (!overrideReason.trim()) {
      alert("Please provide an administrative reason for overriding the status.")
      return
    }

    setIsOverriding(true)
    try {
      const res = await updateBookingStatusAdmin(overrideModal.id, overrideTargetStatus, overrideReason.trim())
      if (!res.success) throw new Error(res.error)
      alert("Booking status successfully updated and logged to audit trail.")
      setOverrideModal(null)
      setOverrideReason("")
    } catch (err: any) {
      alert("Failed to override status: " + err.message)
    } finally {
      setIsOverriding(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ─── Search and Controls Toolbar ─────────────────────────── */}
      <div 
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          background: "var(--color-surface-100)",
          padding: "1.25rem",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-surface-200)",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative", minWidth: "280px", flex: 1 }}>
            <Search size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
            <input
              type="text"
              placeholder="Search by ID, customer name, technician, device, brand..."
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

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as any)
              setCurrentPage(1)
            }}
            style={{
              padding: "0.625rem 0.875rem",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-0)",
              border: "1px solid var(--color-surface-200)",
              color: "var(--color-text-primary)",
              fontSize: "0.8125rem",
              fontWeight: 500,
            }}
          >
            <option value="all">📅 All Time</option>
            <option value="today">Today (Past 24h)</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>

          {/* Service Type Filter */}
          <select
            value={serviceTypeFilter}
            onChange={(e) => {
              setServiceTypeFilter(e.target.value)
              setCurrentPage(1)
            }}
            style={{
              padding: "0.625rem 0.875rem",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-0)",
              border: "1px solid var(--color-surface-200)",
              color: "var(--color-text-primary)",
              fontSize: "0.8125rem",
              fontWeight: 500,
            }}
          >
            <option value="all">⚡ All Service Types</option>
            <option value="doorstep">Doorstep Service</option>
            <option value="pickup">Pickup & Delivery</option>
            <option value="in_store">In-Store Repair</option>
          </select>
        </div>

        {/* Status Badges Filter Row */}
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", marginRight: "0.5rem" }}>
            STATUS:
          </span>
          <button
            onClick={() => {
              setStatusFilter("all")
              setCurrentPage(1)
            }}
            style={{
              padding: "0.375rem 0.75rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.75rem",
              fontWeight: 600,
              border: statusFilter === "all" ? "1px solid var(--color-brand-500)" : "1px solid var(--color-surface-200)",
              background: statusFilter === "all" ? "rgba(16, 185, 129, 0.15)" : "var(--color-surface-50)",
              color: statusFilter === "all" ? "var(--color-brand-400)" : "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >
            All ({bookings.length})
          </button>
          {ALL_STATUSES.map((st) => {
            const count = bookings.filter((b) => b.status === st).length
            return (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st)
                  setCurrentPage(1)
                }}
                style={{
                  padding: "0.375rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "capitalize",
                  border: statusFilter === st ? "1px solid var(--color-brand-500)" : "1px solid var(--color-surface-200)",
                  background: statusFilter === st ? "rgba(16, 185, 129, 0.15)" : "var(--color-surface-50)",
                  color: statusFilter === st ? "var(--color-brand-400)" : "var(--color-text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <span>{st.replace(/_/g, " ")}</span>
                <span style={{ fontSize: "0.6875rem", opacity: 0.75 }}>({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Bookings Data Table ─────────────────────────────────── */}
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
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>ID</th>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Device & Issue</th>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Customer</th>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Technician</th>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Service</th>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Financials</th>
                <th style={{ padding: "1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                    <Layers size={32} color="var(--color-text-muted)" style={{ margin: "0 auto 0.75rem" }} />
                    <div style={{ fontWeight: 600, color: "#ffffff" }}>No matching bookings found</div>
                    <div style={{ fontSize: "0.8125rem" }}>Try adjusting your search query, status, or date range.</div>
                  </td>
                </tr>
              ) : (
                paginated.map((b, idx) => {
                  const product = b.products
                  const customer = b.users
                  const provider = b.provider_profiles
                  const payment = b.payments
                  const quotation = b.quotations

                  return (
                    <tr 
                      key={b.id} 
                      style={{ 
                        borderBottom: idx < paginated.length - 1 ? "1px solid var(--color-surface-200)" : undefined,
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "1rem", fontFamily: "monospace", fontSize: "0.8125rem", color: "var(--color-brand-400)", fontWeight: 700 }}>
                        #{b.id.slice(0, 8).toUpperCase()}
                      </td>

                      <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                        <div style={{ fontWeight: 600, color: "#ffffff" }}>
                          {product ? `${product.brand || ""} ${product.model || ""}` : "Repair Item"}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                          {product?.categories?.name || "General"}
                        </div>
                      </td>

                      <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                        <div style={{ fontWeight: 600, color: "#ffffff" }}>{customer?.name || "Customer"}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{customer?.email}</div>
                      </td>

                      <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                        {provider?.business_name ? (
                          <span style={{ color: "#ffffff", fontWeight: 500 }}>{provider.business_name}</span>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>Unassigned</span>
                        )}
                      </td>

                      <td style={{ padding: "1rem", fontSize: "0.8125rem" }}>
                        <span style={{ padding: "2px 8px", background: "var(--color-surface-200)", borderRadius: "4px", textTransform: "capitalize" }}>
                          {b.service_type}
                        </span>
                      </td>

                      <td style={{ padding: "1rem" }}>
                        <span className={`badge badge-${b.status}`}>
                          {b.status.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                        <div style={{ fontWeight: 700, color: "var(--color-brand-400)" }}>
                          ₹{b.final_cost || b.estimated_cost || (quotation?.quoted_amount) || 0}
                        </div>
                        {payment && (
                          <div style={{ fontSize: "0.6875rem", color: payment.status === "paid" ? "#34d399" : "#fbbf24" }}>
                            Paid: {payment.status}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "1rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.375rem", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="btn btn-secondary"
                            style={{ padding: "0.375rem 0.625rem", fontSize: "0.75rem" }}
                            title="Inspect Details"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => {
                              setOverrideModal(b)
                              setOverrideTargetStatus(b.status)
                            }}
                            className="btn btn-primary"
                            style={{ padding: "0.375rem 0.625rem", fontSize: "0.75rem" }}
                            title="Override Status"
                          >
                            <Edit3 size={13} />
                            <span>Override</span>
                          </button>
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
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} bookings
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

      {/* ─── Booking Inspection Detail Modal ─────────────────────── */}
      {selectedBooking && (
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
              maxWidth: "600px",
              maxHeight: "85vh",
              overflowY: "auto",
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
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>
                    Booking #{selectedBooking.id.slice(0, 8).toUpperCase()}
                  </h3>
                  <span className={`badge badge-${selectedBooking.status}`}>
                    {selectedBooking.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Created on {new Date(selectedBooking.created_at).toLocaleString("en-IN")}
                </div>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Device & Issue */}
            <div style={{ padding: "0.875rem", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--color-brand-400)", fontWeight: 700, textTransform: "uppercase" }}>
                Device Information
              </div>
              <div style={{ fontWeight: 700, color: "#ffffff", fontSize: "1rem" }}>
                {selectedBooking.products?.brand} {selectedBooking.products?.model}
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
                <strong>Reported Issue:</strong> {selectedBooking.products?.issue_description || "N/A"}
              </div>
            </div>

            {/* Customer & Technician Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.8125rem" }}>
              <div style={{ padding: "0.75rem", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600 }}>Customer</div>
                <div style={{ fontWeight: 700, color: "#ffffff" }}>{selectedBooking.users?.name || "Customer"}</div>
                <div style={{ color: "var(--color-text-secondary)" }}>{selectedBooking.users?.email}</div>
                <div style={{ color: "var(--color-text-muted)" }}>{selectedBooking.users?.phone || "No phone"}</div>
              </div>
              <div style={{ padding: "0.75rem", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600 }}>Assigned Technician</div>
                <div style={{ fontWeight: 700, color: "#ffffff" }}>
                  {selectedBooking.provider_profiles?.business_name || "Unassigned"}
                </div>
                <div style={{ color: "var(--color-text-muted)" }}>Service: {selectedBooking.service_type}</div>
              </div>
            </div>

            {/* Address if doorstep */}
            {selectedBooking.customer_address && (
              <div style={{ padding: "0.75rem", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)", fontSize: "0.8125rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600 }}>Service Address</div>
                <div style={{ color: "var(--color-text-secondary)" }}>{selectedBooking.customer_address}</div>
              </div>
            )}

            {/* Quotation & Financials */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.8125rem" }}>
              <div style={{ padding: "0.75rem", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600 }}>Quotation</div>
                {selectedBooking.quotations ? (
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--color-brand-400)", fontSize: "1rem" }}>
                      ₹{selectedBooking.quotations.quoted_amount}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                      Status: {selectedBooking.quotations.approved_by_customer ? "Approved by Customer" : "Pending Approval"}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "var(--color-text-muted)" }}>No quotation yet</div>
                )}
              </div>

              <div style={{ padding: "0.75rem", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600 }}>Payment & Settlement</div>
                {selectedBooking.payments ? (
                  <div>
                    <div style={{ fontWeight: 700, color: "#34d399", fontSize: "1rem" }}>
                      ₹{selectedBooking.payments.amount} ({selectedBooking.payments.status})
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                      Ref: {selectedBooking.payments.transaction_ref || "N/A"}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "var(--color-text-muted)" }}>No payment record</div>
                )}
              </div>
            </div>

            {/* Warranty Details if exists */}
            {selectedBooking.warranties && (
              <div style={{ padding: "0.75rem", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "var(--radius-md)", fontSize: "0.8125rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-brand-400)", fontWeight: 700 }}>Active Warranty</div>
                <div style={{ color: "#ffffff" }}>Coverage: {selectedBooking.warranties.duration_days} days</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Expires: {new Date(selectedBooking.warranties.expires_at).toLocaleDateString("en-IN")}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem" }}>
              <Link 
                href="/admin/timelines" 
                className="btn btn-secondary"
                style={{ fontSize: "0.8125rem", display: "flex", alignItems: "center", gap: "0.375rem" }}
              >
                <span>Open in Master Timelines</span>
                <ExternalLink size={12} />
              </Link>
              <button onClick={() => setSelectedBooking(null)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Admin Status Override Modal ─────────────────────────── */}
      {overrideModal && (
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
              maxWidth: "520px",
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
                <AlertTriangle size={20} color="#fbbf24" />
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>
                  Administrative Status Override
                </h3>
              </div>
              <button
                onClick={() => setOverrideModal(null)}
                style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "0.75rem", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)", fontSize: "0.8125rem" }}>
              <div>Booking: <strong>#{overrideModal.id.slice(0, 8).toUpperCase()}</strong></div>
              <div>Current Status: <span className={`badge badge-${overrideModal.status}`}>{overrideModal.status}</span></div>
            </div>

            {/* Target Status Selection */}
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, marginBottom: "0.375rem" }}>
                Target Booking Status
              </label>
              <select
                value={overrideTargetStatus}
                onChange={(e) => setOverrideTargetStatus(e.target.value as any)}
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-surface-0)",
                  border: "1px solid var(--color-surface-200)",
                  color: "#ffffff",
                  fontSize: "0.875rem",
                }}
              >
                {ALL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Mandatory Override Reason */}
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, marginBottom: "0.375rem", color: "#fbbf24" }}>
                Administrative Override Reason (Mandatory) *
              </label>
              <textarea
                placeholder="Explain why this manual status override is being performed (e.g. Technician completed repair offline; customer confirmed receipt)."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
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
              <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                🔒 This reason will be permanently recorded in the immutable <code>repair_status_log</code>.
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button onClick={() => setOverrideModal(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleOverrideStatus}
                disabled={isOverriding || !overrideReason.trim()}
                className="btn btn-primary"
              >
                {isOverriding ? "Applying..." : "Confirm Override"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
