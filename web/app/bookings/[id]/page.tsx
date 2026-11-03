"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Clock, CheckCircle, XCircle, AlertCircle, Wrench,
  ChevronLeft, CreditCard, Star, ThumbsUp, ThumbsDown,
  User, MapPin, Shield, Loader2, Sparkles
} from "lucide-react"
import toast from "react-hot-toast"
import type { Booking, RepairStatusLog, Quotation, Payment, Warranty, Review } from "@/types/database"

const STATUS_STEPS = [
  { status: "booked",            label: "Booking Confirmed",    icon: CheckCircle, desc: "Your booking is confirmed and awaiting assignment." },
  { status: "assigned",          label: "Technician Assigned",  icon: User,        desc: "A technician has been assigned to your job." },
  { status: "diagnosis",         label: "Diagnosis In Progress", icon: Wrench,     desc: "Your device is being examined." },
  { status: "awaiting_approval", label: "Awaiting Your Approval", icon: AlertCircle, desc: "Review and approve the repair quotation." },
  { status: "in_repair",         label: "Repair In Progress",   icon: Wrench,      desc: "Your device is being repaired." },
  { status: "quality_check",     label: "Quality Check",        icon: Shield,      desc: "Final quality inspection underway." },
  { status: "completed",         label: "Repair Completed",     icon: CheckCircle, desc: "Your device is ready!" },
]

declare global {
  interface Window {
    Razorpay: new (options: object) => { open: () => void }
  }
}

export default function BookingTrackingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [booking, setBooking]       = useState<Booking | null>(null)
  const [statusLog, setStatusLog]   = useState<RepairStatusLog[]>([])
  const [quotation, setQuotation]   = useState<Quotation | null>(null)
  const [payment, setPayment]       = useState<Payment | null>(null)
  const [warranty, setWarranty]     = useState<Warranty | null>(null)
  const [review, setReview]         = useState<Review | null>(null)
  const [providerInfo, setProviderInfo] = useState<{ business_name: string; rating_avg: number } | null>(null)
  const [productInfo, setProductInfo]   = useState<{ issue_description: string; ai_diagnosis?: any; categories: { name: string } | null } | null>(null)

  // Review form state
  const [rating, setRating]         = useState(5)
  const [comment, setComment]       = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)
  const [loading, setLoading]       = useState(true)

  const loadBookingData = useCallback(async () => {
    const [
      { data: bookingData },
      { data: logData },
      { data: quotationData },
      { data: paymentData },
      { data: warrantyData },
      { data: reviewData },
    ] = await Promise.all([
      supabase.from("bookings").select("*").eq("id", id).single(),
      supabase.from("repair_status_log").select("*").eq("booking_id", id).order("changed_at"),
      supabase.from("quotations").select("*").eq("booking_id", id).maybeSingle(),
      supabase.from("payments").select("*").eq("booking_id", id).maybeSingle(),
      supabase.from("warranties").select("*").eq("booking_id", id).maybeSingle(),
      supabase.from("reviews").select("*").eq("booking_id", id).maybeSingle(),
    ])

    setBooking(bookingData)
    setStatusLog(logData ?? [])
    setQuotation(quotationData)
    setPayment(paymentData)
    setWarranty(warrantyData)
    setReview(reviewData)

    if (bookingData?.provider_id) {
      const { data: pp } = await supabase.from("provider_profiles").select("business_name, rating_avg").eq("id", bookingData.provider_id).single()
      setProviderInfo(pp)
    }
    if (bookingData?.product_id) {
      const { data: prod } = await supabase.from("products").select("issue_description, ai_diagnosis, categories(name)").eq("id", bookingData.product_id).single()
      setProductInfo(prod as any)
    }

    setLoading(false)
  }, [id])

  useEffect(() => {
    loadBookingData()

    // ── Realtime subscription ─────────────────────────────
    // Both Web and Android subscribe to repair_status_log for this booking.
    // Any status change from any platform (provider updating on Android,
    // admin updating on Web) will push to this channel and update UI.
    const channel = supabase
      .channel(`booking-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "repair_status_log",
          filter: `booking_id=eq.${id}`,
        },
        (payload) => {
          setStatusLog((prev) => [...prev, payload.new as RepairStatusLog])
          // Also reload booking to get latest status
          supabase.from("bookings").select("*").eq("id", id).single()
            .then(({ data }) => { if (data) setBooking(data) })
          toast.success(`Status updated: ${(payload.new as RepairStatusLog).status.replace(/_/g, " ")}`)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quotations",
          filter: `booking_id=eq.${id}`,
        },
        (payload) => {
          setQuotation(payload.new as Quotation)
          toast.success("Quotation received! Please review.")
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, loadBookingData])

  async function handleQuotationResponse(approved: boolean) {
    if (!quotation) return
    const { error } = await supabase
      .from("quotations")
      .update({ approved_by_customer: approved })
      .eq("id", quotation.id)

    if (error) { toast.error("Failed — try again"); return }
    toast.success(approved ? "Quotation approved! Repair starting." : "Quotation rejected.")
    setQuotation((prev) => prev ? { ...prev, approved_by_customer: approved } : prev)
  }

  async function handlePayment() {
    if (!booking) return
    if (!window.Razorpay) {
      toast.error("Payment gateway not loaded")
      return
    }

    const rzp = new window.Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: (booking.final_cost ?? booking.estimated_cost ?? 0) * 100,
      currency: "INR",
      name: "EcoFix",
      description: `Payment for booking #${booking.id.slice(0, 8)}`,
      notes: { booking_id: booking.id },
      handler: () => { toast.success("Payment successful! 🎉"); loadBookingData() },
    })
    rzp.open()
  }

  async function handleReviewSubmit() {
    if (!booking || !booking.provider_id) return
    setSubmittingReview(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("reviews").insert({
      booking_id: booking.id,
      customer_id: user!.id,
      provider_id: booking.provider_id,
      rating,
      comment: comment || null,
    })
    if (error) { toast.error("Failed to submit review"); setSubmittingReview(false); return }
    toast.success("Review submitted! Thank you. 🙏")
    loadBookingData()
    setSubmittingReview(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-surface-0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={36} className="animate-spin" style={{ color: "var(--color-brand-500)" }} />
      </div>
    )
  }

  if (!booking) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-surface-0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <XCircle size={48} style={{ color: "#ef4444", margin: "0 auto 1rem" }} />
          <h1>Booking not found</h1>
        </div>
      </div>
    )
  }

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.status === booking.status)

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface-0)", padding: "2rem" }}>
      {/* Load Razorpay script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Back */}
        <button
          onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer", marginBottom: "1.5rem", fontSize: "0.875rem" }}
        >
          <ChevronLeft size={16} /> Back
        </button>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.25rem" }}>
              {(productInfo as any)?.categories?.name ?? "Repair"} Tracking
            </h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
              Booking ID: {booking.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <span className={`badge badge-${booking.status}`} style={{ fontSize: "0.875rem", padding: "0.375rem 0.875rem" }}>
            {booking.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>

          {/* ── Left: Timeline ── */}
          <div>
            <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
              <h2 style={{ fontWeight: 700, marginBottom: "1.5rem", fontSize: "1rem" }}>Repair Timeline</h2>

              {STATUS_STEPS.map((step, i) => {
                const isDone    = i < currentStepIdx
                const isCurrent = i === currentStepIdx
                const isFuture  = i > currentStepIdx
                const logEntry  = statusLog.find((l) => l.status === step.status)
                const Icon      = step.icon

                return (
                  <div key={step.status} className={`timeline-item ${isCurrent ? "active" : ""}`}>
                    <div className={`timeline-dot ${isCurrent ? "timeline-dot-active" : isDone ? "timeline-dot-done" : "timeline-dot-future"}`}>
                      <Icon size={12} color={isCurrent ? "white" : isDone ? "#94a3b8" : "#475569"} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{
                          fontWeight: isCurrent ? 700 : 500,
                          fontSize: "0.875rem",
                          color: isFuture ? "var(--color-text-muted)" : "var(--color-text-primary)",
                        }}>
                          {step.label}
                        </span>
                        {logEntry && (
                          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            {new Date(logEntry.changed_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      {isCurrent && (
                        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
                          {step.desc}
                        </p>
                      )}
                      {logEntry?.note && (
                        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                          {logEntry.note}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Quotation Approval ── */}
            {quotation && quotation.approved_by_customer === null && (
              <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem", border: "2px solid var(--color-warning)" }}>
                <h2 style={{ fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <AlertCircle size={18} style={{ color: "var(--color-warning)" }} />
                  Quotation Received
                </h2>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>
                  {quotation.diagnosis_notes}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>Quoted Amount</span>
                  <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-brand-400)" }}>
                    ₹{quotation.quoted_amount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <button id="approve-quotation" className="btn btn-primary" onClick={() => handleQuotationResponse(true)}>
                    <ThumbsUp size={16} /> Approve
                  </button>
                  <button id="reject-quotation" className="btn btn-danger" onClick={() => handleQuotationResponse(false)}>
                    <ThumbsDown size={16} /> Reject
                  </button>
                </div>
              </div>
            )}

            {/* ── Payment ── */}
            {booking.status === "completed" && !payment && (
              <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem", border: "2px solid var(--color-brand-500)" }}>
                <h2 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>💳 Pay for Repair</h2>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>
                  Your repair is complete. Please proceed with payment.
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Total Amount</span>
                  <span style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--color-brand-400)" }}>
                    ₹{(booking.final_cost ?? 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <button id="pay-now-btn" className="btn btn-primary btn-lg" onClick={handlePayment} style={{ width: "100%" }}>
                  <CreditCard size={18} /> Pay Now via Razorpay
                </button>
              </div>
            )}

            {/* ── Warranty ── */}
            {warranty && (
              <div className="glass-brand" style={{ borderRadius: "var(--radius-xl)", padding: "1.25rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <Shield size={24} style={{ color: "var(--color-brand-400)" }} />
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--color-brand-400)" }}>
                      {warranty.duration_days}-Day Warranty Active
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                      Expires: {new Date(warranty.expires_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Review ── */}
            {booking.status === "completed" && payment && !review && (
              <div className="card" style={{ padding: "1.5rem" }}>
                <h2 style={{ fontWeight: 700, marginBottom: "1rem" }}>Rate Your Experience</h2>
                <div className="star-rating" style={{ justifyContent: "center", marginBottom: "1rem" }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setRating(s)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", color: s <= rating ? "#fbbf24" : "var(--color-surface-300)" }}
                    >★</button>
                  ))}
                </div>
                <textarea
                  className="input"
                  style={{ marginBottom: "1rem", resize: "vertical", minHeight: 80 }}
                  placeholder="Share your experience (optional)…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <button id="submit-review" className="btn btn-primary" onClick={handleReviewSubmit} disabled={submittingReview} style={{ width: "100%" }}>
                  {submittingReview ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />}
                  Submit Review
                </button>
              </div>
            )}

            {review && (
              <div className="glass-brand" style={{ borderRadius: "var(--radius-xl)", padding: "1.25rem" }}>
                <div style={{ fontWeight: 700, color: "var(--color-brand-400)", marginBottom: "0.5rem" }}>
                  ⭐ Your Review — {review.rating}/5
                </div>
                {review.comment && <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>{review.comment}</p>}
              </div>
            )}
          </div>

          {/* ── Right: Info Panel ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Provider info */}
            {providerInfo && (
              <div className="card" style={{ padding: "1.25rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.875rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Your Technician
                </div>
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{providerInfo.business_name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.875rem", color: "#fbbf24" }}>
                  ★ {providerInfo.rating_avg.toFixed(1)}
                </div>
              </div>
            )}

            {/* Job details */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.875rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Job Details
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", fontSize: "0.875rem" }}>
                <div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", marginBottom: "0.125rem" }}>Issue</div>
                  <div>{productInfo?.issue_description?.slice(0, 80)}</div>
                </div>
                <div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", marginBottom: "0.125rem" }}>Service</div>
                  <div style={{ textTransform: "capitalize" }}>{booking.service_type.replace("_", " ")}</div>
                </div>
                {booking.scheduled_at && (
                  <div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", marginBottom: "0.125rem" }}>Scheduled</div>
                    <div>{new Date(booking.scheduled_at).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                )}
                {booking.estimated_cost && (
                  <div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", marginBottom: "0.125rem" }}>Estimate</div>
                    <div style={{ fontWeight: 700, color: "var(--color-brand-400)" }}>₹{booking.estimated_cost.toLocaleString("en-IN")}</div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Diagnosis (if available) */}
            {productInfo?.ai_diagnosis && (
              <div className="glass-brand" style={{ borderRadius: "var(--radius-lg)", padding: "1.25rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--color-brand-400)", marginBottom: "0.625rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <Sparkles size={16} /> AI Pre-Diagnosis
                </div>
                {(productInfo.ai_diagnosis as any).summary && (
                  <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", marginBottom: "0.75rem", lineHeight: 1.4 }}>
                    {(productInfo.ai_diagnosis as any).summary}
                  </div>
                )}
                {(productInfo.ai_diagnosis as any).issue_labels?.map((label: string, i: number) => (
                  <div key={label} style={{ fontSize: "0.8125rem", display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                    <span>{label}</span>
                    <span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>
                      {Math.round(((productInfo.ai_diagnosis as any).confidence_scores?.[i] ?? 0) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Payment status */}
            {payment && (
              <div className="card" style={{ padding: "1.25rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.875rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Payment
                </div>
                <div className={`badge badge-${payment.status}`} style={{ fontSize: "0.875rem", padding: "0.375rem 0.875rem" }}>
                  {payment.status.toUpperCase()}
                </div>
                <div style={{ marginTop: "0.75rem", fontWeight: 800, fontSize: "1.25rem", color: "var(--color-brand-400)" }}>
                  ₹{payment.amount.toLocaleString("en-IN")}
                </div>
                {payment.paid_at && (
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                    Paid on {new Date(payment.paid_at).toLocaleDateString("en-IN")}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
