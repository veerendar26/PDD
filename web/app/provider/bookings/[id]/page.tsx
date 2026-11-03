"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  ChevronLeft, Loader2, CheckCircle, ClipboardList,
  Send, Wrench, AlertCircle, MessageSquare
} from "lucide-react"
import toast from "react-hot-toast"
import type { Booking, BookingStatus } from "@/types/database"

const PROVIDER_STATUS_ACTIONS: { from: BookingStatus; to: BookingStatus; label: string; icon: React.ComponentType<{size?: number}> }[] = [
  { from: "booked",            to: "assigned",          label: "Accept & Assign to Me",     icon: CheckCircle },
  { from: "assigned",          to: "diagnosis",         label: "Start Diagnosis",            icon: ClipboardList },
  { from: "diagnosis",         to: "awaiting_approval", label: "Submit Quotation",           icon: Send },
  { from: "in_repair",         to: "quality_check",     label: "Move to Quality Check",      icon: Wrench },
  { from: "quality_check",     to: "completed",         label: "Mark as Completed",          icon: CheckCircle },
]

export default function ProviderJobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [booking, setBooking]       = useState<Booking | null>(null)
  const [providerProfile, setProviderProfile] = useState<any>(null)
  const [quotationExists, setQuotationExists] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [updating, setUpdating]     = useState(false)

  // Quotation form
  const [diagnosisNotes, setDiagnosisNotes] = useState("")
  const [quotedAmount, setQuotedAmount]     = useState("")
  const [showQuotationForm, setShowQuotationForm] = useState(false)
  const [statusNote, setStatusNote]         = useState("")

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: pp } = await supabase.from("provider_profiles").select("*").eq("user_id", user!.id).single()
    setProviderProfile(pp)

    const { data: b } = await supabase.from("bookings").select(`
      *,
      products(*, categories(name)),
      users!bookings_customer_id_fkey(name, phone, email)
    `).eq("id", id).single()
    setBooking(b as any)

    const { data: q } = await supabase.from("quotations").select("id").eq("booking_id", id).maybeSingle()
    setQuotationExists(!!q)

    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel(`provider-booking-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${id}` },
        (payload) => setBooking(payload.new as Booking))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, loadData])

  async function handleStatusUpdate(newStatus: BookingStatus) {
    if (!booking || !providerProfile) return
    setUpdating(true)

    // If moving to awaiting_approval, require quotation form
    if (newStatus === "awaiting_approval") {
      if (!diagnosisNotes || !quotedAmount) {
        toast.error("Please fill in diagnosis notes and quoted amount")
        setUpdating(false)
        return
      }

      // Insert quotation first
      const { error: qError } = await supabase.from("quotations").insert({
        booking_id: booking.id,
        diagnosis_notes: diagnosisNotes,
        quoted_amount: parseFloat(quotedAmount),
      })
      if (qError) { toast.error("Failed to submit quotation"); setUpdating(false); return }
      setQuotationExists(true)
      setShowQuotationForm(false)
    }

    const { error } = await supabase
      .from("bookings")
      .update({
        status: newStatus,
        provider_id: newStatus === "assigned" ? providerProfile.id : undefined,
      })
      .eq("id", id)

    if (error) { toast.error("Update failed — try again"); setUpdating(false); return }

    toast.success(`Status updated to: ${newStatus.replace(/_/g, " ")}`)
    await loadData()
    setUpdating(false)
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface-0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={36} className="animate-spin" style={{ color: "var(--color-brand-500)" }} />
    </div>
  )

  if (!booking) return null

  const availableAction = PROVIDER_STATUS_ACTIONS.find((a) => a.from === booking.status)
  const customerInfo = (booking as any).users
  const product = (booking as any).products

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface-0)", padding: "2rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
          <ChevronLeft size={16} /> Back to Dashboard
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{product?.categories?.name} Repair</h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>Job #{booking.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <span className={`badge badge-${booking.status}`} style={{ fontSize: "0.875rem", padding: "0.375rem 0.875rem" }}>
            {booking.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          {/* Customer info */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.875rem" }}>Customer</div>
            <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{customerInfo?.name}</div>
            <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>{customerInfo?.phone}</div>
            <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>{customerInfo?.email}</div>
          </div>

          {/* Job info */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.875rem" }}>Job Details</div>
            {product?.brand && <div style={{ fontSize: "0.875rem" }}><b>Brand:</b> {product.brand}</div>}
            {product?.model && <div style={{ fontSize: "0.875rem" }}><b>Model:</b> {product.model}</div>}
            <div style={{ fontSize: "0.875rem", marginTop: "0.5rem", color: "var(--color-text-secondary)" }}>
              {product?.issue_description}
            </div>
          </div>
        </div>

        {/* AI Diagnosis (if available) */}
        {product?.ai_diagnosis && (
          <div className="glass-brand" style={{ borderRadius: "var(--radius-lg)", padding: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 700, color: "var(--color-brand-400)", marginBottom: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <AlertCircle size={16} /> AI Pre-Diagnosis
            </div>
            {(product.ai_diagnosis as any).issue_labels?.map((label: string, i: number) => (
              <div key={label} style={{ fontSize: "0.875rem", display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                <span>{label}</span>
                <span style={{ color: "var(--color-text-muted)" }}>
                  {Math.round(((product.ai_diagnosis as any).confidence_scores?.[i] ?? 0) * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Media */}
        {product?.media_urls?.length > 0 && (
          <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.875rem" }}>Damage Photos</div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {product.media_urls.map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="damage" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "var(--radius-md)" }} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Quotation form (shown when moving to awaiting_approval) */}
        {showQuotationForm && (
          <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem", border: "2px solid var(--color-brand-500)" }}>
            <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>Submit Quotation</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="label">Diagnosis Notes</label>
                <textarea className="input" style={{ minHeight: 100, resize: "vertical" }}
                  placeholder="Describe what you found during diagnosis, parts needed, estimated labour time..."
                  value={diagnosisNotes} onChange={(e) => setDiagnosisNotes(e.target.value)} />
              </div>
              <div>
                <label className="label">Quoted Amount (₹)</label>
                <input className="input" type="number" min="0" step="0.01"
                  placeholder="e.g. 1200" value={quotedAmount} onChange={(e) => setQuotedAmount(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Status action button */}
        {availableAction && !quotationExists && (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {availableAction.to === "awaiting_approval" && !showQuotationForm && (
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => setShowQuotationForm(true)}
              >
                <MessageSquare size={16} /> Fill Quotation First
              </button>
            )}
            <button
              id="status-action-btn"
              className="btn btn-primary btn-lg"
              onClick={() => {
                if (availableAction.to === "awaiting_approval" && !showQuotationForm) {
                  setShowQuotationForm(true)
                } else {
                  handleStatusUpdate(availableAction.to)
                }
              }}
              disabled={updating}
              style={{ flex: 1 }}
            >
              {updating ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <availableAction.icon size={18} />
                  {availableAction.label}
                </>
              )}
            </button>
          </div>
        )}

        {booking.status === "completed" && (
          <div className="glass-brand" style={{ borderRadius: "var(--radius-xl)", padding: "1.25rem", textAlign: "center" }}>
            <CheckCircle size={36} style={{ color: "var(--color-brand-500)", margin: "0 auto 0.75rem" }} />
            <div style={{ fontWeight: 700, color: "var(--color-brand-400)" }}>Job Completed!</div>
          </div>
        )}
      </div>
    </div>
  )
}
