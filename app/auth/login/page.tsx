"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Wrench, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react"
import toast from "react-hot-toast"

// ── Inner form (uses useSearchParams — must be inside Suspense) ───────────────
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard"
  const registeredState = searchParams.get("registered")

  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const isLoggedOut = searchParams.get("logged_out") === "true"

  const [info, setInfo]         = useState(
    registeredState === "verify_email"
      ? "Registration successful! Please check your email to confirm your account before signing in."
      : isLoggedOut
      ? "You have been logged out successfully."
      : ""
  )
  const [unverifiedEmail, setUnverifiedEmail] = useState("")
  const [resendingOtp, setResendingOtp]       = useState(false)

  const supabase = createClient()

  async function handleResendUnverifiedCode() {
    if (!unverifiedEmail) return
    setResendingOtp(true)
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: unverifiedEmail,
      })
      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes("rate limit") || msg.includes("too many requests")) {
          toast.error("Too many requests. Please wait before requesting another code.")
        } else {
          toast.error("We could not send the verification code. Please try again.")
        }
      } else {
        toast.success("Verification code sent successfully. Please check your inbox.")
      }
    } catch (err: any) {
      toast.error("We could not send the verification code. Please try again.")
    } finally {
      setResendingOtp(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setInfo("")
    setUnverifiedEmail("")
    setLoading(true)

    const cleanedEmail = email.trim().toLowerCase()
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanedEmail,
      password,
    })

    if (signInError) {
      const msg = signInError.message.toLowerCase()
      if (msg.includes("email not confirmed") || msg.includes("email not verified")) {
        setUnverifiedEmail(cleanedEmail)
        setError(
          "Your email address has not been verified yet. Please enter the verification code sent to your inbox."
        )
      } else if (msg.includes("invalid login credentials")) {
        setError(
          "Invalid email or password. Note: Passwords are case-sensitive. Please check for typos, extra spaces, or use 'Forgot password?' below."
        )
      } else {
        setError(signInError.message)
      }
      setLoading(false)
      return
    }

    // Authoritative email verification check from authenticated session
    if (signInData?.user && !signInData.user.email_confirmed_at) {
      // Discard unverified session immediately
      await supabase.auth.signOut()
      setUnverifiedEmail(cleanedEmail)
      setError("Email address not verified yet. Please enter your verification code before signing in.")
      setLoading(false)
      router.push(`/auth/verify-email?email=${encodeURIComponent(cleanedEmail)}&unverified=true`)
      return
    }

    toast.success("Welcome back!")

    // Authoritative role routing
    if (signInData?.user) {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", signInData.user.id)
        .maybeSingle()

      if (redirectTo && redirectTo !== "/dashboard" && !redirectTo.startsWith("/auth")) {
        router.push(redirectTo)
      } else if (profile?.role === "admin") {
        router.push("/admin")
      } else if (profile?.role === "technician") {
        const { data: prov } = await supabase
          .from("provider_profiles")
          .select("verification_status, is_active")
          .eq("user_id", signInData.user.id)
          .maybeSingle()

        if (!prov) router.push("/onboarding")
        else if (prov.verification_status === "approved" && prov.is_active !== false) router.push("/provider/dashboard")
        else if (prov.verification_status === "rejected") router.push("/provider/rejected")
        else router.push("/provider/pending")
      } else {
        router.push("/dashboard")
      }
    } else {
      router.push(redirectTo)
    }

    router.refresh()
  }

  async function handleGoogleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
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
      {/* Background glows */}
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

      <div className="animate-fade-in" style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
        {/* Back link */}
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: "0.375rem",
          color: "var(--color-text-secondary)", textDecoration: "none",
          fontSize: "0.875rem", marginBottom: "2rem",
          transition: "color 0.2s",
        }}>
          <ArrowLeft size={16} /> Back to home
        </Link>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 52, height: 52,
            background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))",
            borderRadius: "var(--radius-lg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1rem",
            boxShadow: "var(--shadow-glow-brand)",
          }}>
            <Wrench size={24} color="white" />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Welcome back
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Sign in to your EcoFix account
          </p>
        </div>

        {/* Card */}
        <div className="glass" style={{ borderRadius: "var(--radius-2xl)", padding: "2rem" }}>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {info && (
              <div style={{
                padding: "0.75rem 1rem",
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-brand-400)",
                fontSize: "0.875rem",
                lineHeight: 1.5,
              }}>
                {info}
              </div>
            )}

            {error && (
              <div style={{
                padding: "0.875rem 1rem",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "var(--radius-md)",
                color: "#f87171",
                fontSize: "0.875rem",
                lineHeight: 1.5,
              }}>
                <div style={{ marginBottom: unverifiedEmail ? "0.75rem" : 0 }}>{error}</div>
                {unverifiedEmail && (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                    <Link
                      href={`/auth/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: "none", fontSize: "0.8125rem" }}
                    >
                      Enter 6-Digit Code
                    </Link>
                    <button
                      type="button"
                      onClick={handleResendUnverifiedCode}
                      disabled={resendingOtp}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.8125rem" }}
                    >
                      {resendingOtp ? "Sending..." : "Resend Code"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{
                  position: "absolute", left: "0.875rem", top: "50%",
                  transform: "translateY(-50%)", color: "var(--color-text-muted)",
                  pointerEvents: "none",
                }} />
                <input
                  id="email"
                  type="email"
                  className="input"
                  style={{ paddingLeft: "2.5rem" }}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
                <label htmlFor="password" className="label" style={{ marginBottom: 0 }}>Password</label>
                <Link href="/auth/forgot-password" style={{ fontSize: "0.8125rem", color: "var(--color-brand-400)", textDecoration: "none" }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{
                  position: "absolute", left: "0.875rem", top: "50%",
                  transform: "translateY(-50%)", color: "var(--color-text-muted)",
                  pointerEvents: "none",
                }} />
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  className="input"
                  style={{ paddingLeft: "2.5rem", paddingRight: "2.75rem" }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: "absolute", right: "0.875rem", top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--color-text-muted)", padding: 0,
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: "100%", marginTop: "0.25rem" }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign In"}
            </button>
          </form>

          <div className="divider" style={{ position: "relative", textAlign: "center" }}>
            <span style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(30,41,59,0.6)",
              padding: "0 0.75rem",
              color: "var(--color-text-muted)",
              fontSize: "0.8125rem",
            }}>or</span>
          </div>

          {/* Google Login */}
          <button
            id="google-login"
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{ width: "100%", gap: "0.75rem" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p style={{ textAlign: "center", marginTop: "1.5rem", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" style={{ color: "var(--color-brand-400)", textDecoration: "none", fontWeight: 600 }}>
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Outer page with Suspense wrapper ─────────────────────────────────────────
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-surface-0)" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--color-brand-500)" }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
