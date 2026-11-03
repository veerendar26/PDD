"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Wrench, Mail, ArrowLeft, Loader2, CheckCircle2, RefreshCw, AlertCircle, Edit3, ArrowRight } from "lucide-react"
import toast from "react-hot-toast"

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email
  const [local, domain] = email.split("@")
  if (!local || !domain) return email
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`
  }
  const first = local[0]
  const last = local[local.length - 1]
  const maskedLength = Math.max(local.length - 2, 3)
  return `${first}${"*".repeat(maskedLength)}${last}@${domain}`
}

function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialEmail = (searchParams.get("email") ?? "").trim().toLowerCase()
  const roleHint = searchParams.get("role") ?? ""
  const redirectTo = searchParams.get("redirectTo") ?? ""
  const isUnverifiedParam = searchParams.get("unverified") === "true"

  const [email, setEmail] = useState(initialEmail)
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail)
  const [emailInput, setEmailInput] = useState(initialEmail)

  // 6-digit OTP states
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(60)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [infoMessage, setInfoMessage] = useState(
    isUnverifiedParam
      ? "Please verify your email address to access your EcoFix dashboard."
      : "We've sent a 6-digit verification code to your email."
  )

  const supabase = createClient()

  // Cooldown timer for resend code
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // Focus first digit box on mount
  useEffect(() => {
    if (!isEditingEmail && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [isEditingEmail])

  // Handle individual digit input
  function handleDigitChange(index: number, val: string) {
    setError("")
    const cleaned = val.replace(/\D/g, "")
    const newDigits = [...digits]

    if (cleaned.length === 0) {
      newDigits[index] = ""
      setDigits(newDigits)
      return
    }

    // Handle single character
    const char = cleaned.slice(-1)
    newDigits[index] = char
    setDigits(newDigits)

    // Move to next input box if available
    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit if all 6 digits are filled
    const fullCode = newDigits.join("")
    if (fullCode.length === 6 && !newDigits.includes("")) {
      verifyOtpCode(fullCode)
    }
  }

  // Handle backspace and arrow navigation
  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits]
        newDigits[index - 1] = ""
        setDigits(newDigits)
        inputRefs.current[index - 1]?.focus()
      } else {
        const newDigits = [...digits]
        newDigits[index] = ""
        setDigits(newDigits)
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Handle paste of complete 6-digit code
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    setError("")
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasteData) return

    const newDigits = [...digits]
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasteData[i] || ""
    }
    setDigits(newDigits)

    const focusIdx = Math.min(pasteData.length, 5)
    inputRefs.current[focusIdx]?.focus()

    if (pasteData.length === 6) {
      verifyOtpCode(pasteData)
    }
  }

  // Verify OTP submission to Supabase Auth
  async function verifyOtpCode(codeToVerify?: string) {
    const token = (codeToVerify ?? digits.join("")).trim()
    const targetEmail = email.trim().toLowerCase()

    if (!targetEmail || !targetEmail.includes("@")) {
      setError("Please provide a valid email address.")
      setIsEditingEmail(true)
      return
    }

    if (token.length !== 6) {
      setError("Please enter all 6 digits of the verification code.")
      return
    }

    setError("")
    setLoading(true)

    try {
      // 1. Primary signup OTP verification via Supabase Auth
      const verifyResult = await supabase.auth.verifyOtp({
        email: targetEmail,
        token,
        type: "signup",
      })

      if (verifyResult.error) {
        const msg = verifyResult.error.message.toLowerCase()
        const code = (verifyResult.error as any).code?.toLowerCase() || ""
        if (msg.includes("expired") || code === "otp_expired") {
          setError("This verification code has expired. Request a new code.")
        } else if (msg.includes("rate limit") || msg.includes("too many requests") || code.includes("rate")) {
          setError("Too many requests. Please wait before requesting another code.")
        } else if (msg.includes("invalid") || msg.includes("token has expired or is invalid") || code === "bad_code") {
          setError("Invalid verification code. Please try again.")
        } else {
          setError(verifyResult.error.message || "Invalid verification code. Please try again.")
        }
        setLoading(false)
        return
      }

      // Check session state
      const verifiedUser = verifyResult.data.user
      if (!verifiedUser) {
        setError("Could not retrieve verified user profile. Please try logging in.")
        setLoading(false)
        return
      }

      setSuccess(true)
      toast.success("Email verification successful.")

      // Fetch authoritative role from users table
      const { data: userProfile } = await supabase
        .from("users")
        .select("role")
        .eq("id", verifiedUser.id)
        .maybeSingle()

      const effectiveRole = userProfile?.role || roleHint || "customer"

      // Determine proper destination
      let destination = "/dashboard"

      if (redirectTo && !redirectTo.startsWith("/auth")) {
        destination = redirectTo
      } else if (effectiveRole === "admin") {
        destination = "/admin"
      } else if (effectiveRole === "technician") {
        // Check technician application/profile status
        const { data: provProfile } = await supabase
          .from("provider_profiles")
          .select("verification_status, is_active")
          .eq("user_id", verifiedUser.id)
          .maybeSingle()

        if (!provProfile) {
          destination = "/onboarding"
        } else if (provProfile.verification_status === "approved" && provProfile.is_active !== false) {
          destination = "/provider/dashboard"
        } else if (provProfile.verification_status === "rejected") {
          destination = "/provider/rejected"
        } else {
          destination = "/provider/pending"
        }
      } else {
        destination = "/dashboard"
      }

      router.refresh()
      setTimeout(() => {
        router.push(destination)
      }, 1200)
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during verification.")
      setLoading(false)
    }
  }

  // Resend OTP code
  async function handleResendCode() {
    const targetEmail = email.trim().toLowerCase()
    if (!targetEmail || !targetEmail.includes("@")) {
      setError("Please enter a valid email address first.")
      setIsEditingEmail(true)
      return
    }

    if (resendCooldown > 0 || resending) return

    setResending(true)
    setError("")

    try {
      // Trigger new verification email through Supabase Auth
      const resendResult = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
      })

      if (resendResult.error) {
        const msg = resendResult.error.message.toLowerCase()
        const code = (resendResult.error as any).code?.toLowerCase() || ""
        if (msg.includes("rate limit") || msg.includes("too many requests") || code.includes("rate") || msg.includes("only request this once")) {
          setError("Too many requests. Please wait before requesting another code.")
          setResendCooldown(60)
        } else {
          setError("We could not send the verification code. Please try again.")
        }
        setResending(false)
        return
      }

      setResendCooldown(60)
      setDigits(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
      setInfoMessage("Verification code sent successfully. Please check your inbox.")
      toast.success("Verification code sent successfully. Please check your inbox.")
    } catch (err: any) {
      setError("We could not send the verification code. Please try again.")
    } finally {
      setResending(false)
    }
  }

  function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault()
    const cleaned = emailInput.trim().toLowerCase()
    if (!cleaned || !cleaned.includes("@") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setError("Please enter a valid email address.")
      return
    }
    setEmail(cleaned)
    setIsEditingEmail(false)
    setError("")
    setDigits(["", "", "", "", "", ""])
    setInfoMessage(`Code will be verified for ${cleaned}`)
    // Trigger resend to the updated email address
    setTimeout(() => {
      handleResendCode()
    }, 200)
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--color-surface-0)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background glow effects */}
      <div style={{
        position: "absolute", top: "-20%", left: "-10%",
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-20%", right: "-10%",
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div className="animate-fade-in" style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 1 }}>
        {/* Back navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <Link href="/auth/login" style={{
            display: "inline-flex", alignItems: "center", gap: "0.375rem",
            color: "var(--color-text-secondary)", textDecoration: "none",
            fontSize: "0.875rem", transition: "color 0.2s",
          }}>
            <ArrowLeft size={16} /> Back to sign in
          </Link>
          <Link href="/" style={{
            color: "var(--color-text-muted)", textDecoration: "none",
            fontSize: "0.8125rem",
          }}>
            Home
          </Link>
        </div>

        {/* Card Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 56, height: 56,
            background: success
              ? "linear-gradient(135deg, #10B981, #059669)"
              : "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))",
            borderRadius: "var(--radius-xl)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1.25rem",
            boxShadow: "var(--shadow-glow-brand)",
            transition: "all 0.3s ease",
          }}>
            {success ? <CheckCircle2 size={28} color="white" /> : <Mail size={26} color="white" />}
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>
            {success ? "Email Verified!" : "Verify Your Email"}
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.925rem", lineHeight: 1.5 }}>
            {success
              ? "Your account has been confirmed. Redirecting you to EcoFix..."
              : "Enter the 6-digit confirmation code sent to your email."}
          </p>
        </div>

        {/* Main Verification Card */}
        <div className="glass" style={{ borderRadius: "var(--radius-2xl)", padding: "2.25rem" }}>
          {/* Target Email Badge & Correction */}
          {!success && (
            <div style={{
              background: "var(--color-surface-100)",
              border: "1px solid var(--color-surface-200)",
              borderRadius: "var(--radius-lg)",
              padding: "0.875rem 1rem",
              marginBottom: "1.5rem",
            }}>
              {isEditingEmail ? (
                <form onSubmit={handleSaveEmail} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter your email address"
                    className="input"
                    style={{ flex: 1, padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}
                    autoFocus
                    required
                  />
                  <button type="submit" className="btn btn-primary btn-sm">
                    Save
                  </button>
                  {email && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setEmailInput(email)
                        setIsEditingEmail(false)
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </form>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <Mail size={16} color="var(--color-brand-400)" />
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                      {maskEmail(email) || "No email provided"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailInput(email)
                      setIsEditingEmail(true)
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--color-brand-400)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <Edit3 size={12} /> Change
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Info Banner */}
          {!success && infoMessage && !error && (
            <div style={{
              padding: "0.75rem 1rem",
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-brand-400)",
              fontSize: "0.8125rem",
              lineHeight: 1.5,
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}>
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div style={{
              padding: "0.75rem 1rem",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "var(--radius-md)",
              color: "#f87171",
              fontSize: "0.875rem",
              lineHeight: 1.5,
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "0.125rem" }} />
              <div>{error}</div>
            </div>
          )}

          {/* Success State */}
          {success ? (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--color-brand-400)", fontWeight: 700, fontSize: "1.1rem" }}>
                <CheckCircle2 size={22} /> Verification Successful
              </div>
              <p style={{ marginTop: "0.75rem", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                Setting up your secure EcoFix session...
              </p>
              <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "center" }}>
                <Loader2 size={24} className="animate-spin" color="var(--color-brand-400)" />
              </div>
            </div>
          ) : (
            <>
              {/* 6-Digit OTP Inputs */}
              <div style={{ marginBottom: "1.75rem" }}>
                <label className="label" style={{ textAlign: "center", display: "block", marginBottom: "0.875rem" }}>
                  Verification Code (OTP)
                </label>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    direction: "ltr",
                  }}
                  onPaste={handlePaste}
                >
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el }}
                      id={`otp-digit-${index}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={loading || isEditingEmail}
                      style={{
                        width: "100%",
                        maxWidth: 52,
                        height: 56,
                        textAlign: "center",
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        fontFamily: "monospace, system-ui",
                        borderRadius: "var(--radius-lg)",
                        border: `2px solid ${digit ? "var(--color-brand-500)" : "var(--color-surface-200)"}`,
                        background: digit ? "rgba(16,185,129,0.08)" : "var(--color-surface-100)",
                        color: "var(--color-text-primary)",
                        outline: "none",
                        transition: "all 0.15s ease",
                      }}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
              </div>

              {/* Verify Button */}
              <button
                id="btn-verify-otp"
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => verifyOtpCode()}
                disabled={loading || digits.includes("") || isEditingEmail}
                style={{ width: "100%", gap: "0.5rem" }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Verifying Code...
                  </>
                ) : (
                  <>
                    Verify Email <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Resend Cooldown Section */}
              <div style={{ marginTop: "1.75rem", textAlign: "center" }}>
                {resendCooldown > 0 ? (
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                    Didn&apos;t receive the code? Resend available in{" "}
                    <strong style={{ color: "var(--color-brand-400)" }}>{resendCooldown}s</strong>
                  </p>
                ) : (
                  <button
                    id="btn-resend-otp"
                    type="button"
                    onClick={handleResendCode}
                    disabled={resending || loading}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--color-brand-400)",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      padding: "0.375rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      transition: "opacity 0.2s",
                    }}
                  >
                    {resending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Sending new code...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} /> Resend verification code
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}

          {/* Footer Assistance */}
          <div style={{
            marginTop: "1.75rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--color-surface-200)",
            textAlign: "center",
            fontSize: "0.8125rem",
            color: "var(--color-text-muted)",
          }}>
            <span>Tip: Check your spam/junk folder if you don&apos;t see the email within 1 minute.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-surface-0)" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--color-brand-500)" }} />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  )
}
