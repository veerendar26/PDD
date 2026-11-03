"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Wrench, Mail, Lock, User, Phone, Eye, EyeOff, Loader2, ArrowLeft, Wrench as TechIcon, ShoppingBag } from "lucide-react"
import toast from "react-hot-toast"
import type { UserRole } from "@/types/database"

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = (searchParams.get("role") ?? "customer") as UserRole

  const [role, setRole]         = useState<UserRole>(defaultRole)
  const [name, setName]         = useState("")
  const [email, setEmail]       = useState("")
  const [phone, setPhone]       = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    // 1. Validate fields
    const trimmedName = name.trim()
    const cleanedEmail = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (trimmedName.length < 2) {
      setError("Please enter your full name (at least 2 characters).")
      return
    }

    if (!cleanedEmail || !emailRegex.test(cleanedEmail)) {
      setError("Please enter a valid email address.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }

    setLoading(true)

    // 2. Register account via Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: cleanedEmail,
      password,
      options: {
        data: {
          name: trimmedName,
          phone: phone.trim() || null,
          role: role === "technician" ? "technician" : "customer",
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      const msg = signUpError.message.toLowerCase()
      const status = (signUpError as any).status
      if (status === 504 || msg.includes("504") || msg.includes("gateway timeout") || msg.includes("timeout")) {
        setError("Email delivery timed out (HTTP 504). Supabase cannot connect to the configured SMTP server. Please check your SMTP host, port, and credentials in Supabase Dashboard.")
      } else if (msg.includes("rate limit") || status === 429) {
        setError("Too many requests. Please wait before requesting another code.")
      } else if (msg.includes("already registered") || msg.includes("already exists")) {
        setError("An account with this email address already exists. Please sign in or reset your password.")
      } else if (msg.includes("error sending confirmation email") || status === 500) {
        setError("Could not send verification email. Your configured SMTP server rejected the dispatch. If using Gmail, ensure you entered a 16-character App Password. If using Resend, ensure the recipient matches your Resend account or verify a domain.")
      } else if (msg.includes("valid email") || msg.includes("invalid email")) {
        setError("Please enter a valid, deliverable email address.")
      } else {
        setError(signUpError.message || "We could not send the verification code. Please try again.")
      }
      setLoading(false)
      return
    }

    // 3. Prevent duplicate account bypass (Supabase anti-enumeration returns identities = [])
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError("An account with this email address already exists. Please sign in or reset your password.")
      setLoading(false)
      return
    }

    // 4. Ensure no premature session is held before email confirmation
    if (data?.session) {
      await supabase.auth.signOut()
    }

    // 5. Notify user and route to Email OTP Verification screen
    toast.success("Verification code sent successfully. Please check your inbox.")
    router.push(`/auth/verify-email?email=${encodeURIComponent(cleanedEmail)}&role=${role}`)
  }

  async function handleGoogleRegister() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    })
    if (error) { setError(error.message); setLoading(false) }
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
        position: "absolute", top: "-20%", right: "-10%",
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div className="animate-fade-in" style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}>
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: "0.375rem",
          color: "var(--color-text-secondary)", textDecoration: "none",
          fontSize: "0.875rem", marginBottom: "2rem",
        }}>
          <ArrowLeft size={16} /> Back to home
        </Link>

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
            Create your account
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Join EcoFix — free forever for customers
          </p>
        </div>

        <div className="glass" style={{ borderRadius: "var(--radius-2xl)", padding: "2rem" }}>

          {/* Role selector */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {[
              { value: "customer",    label: "I Need Repairs",   icon: ShoppingBag,  desc: "Book & track repairs" },
              { value: "technician",  label: "I'm a Technician", icon: TechIcon,     desc: "Offer repair services" },
            ].map(({ value, label, icon: Icon, desc }) => (
              <button
                key={value}
                type="button"
                id={`role-${value}`}
                onClick={() => setRole(value as UserRole)}
                style={{
                  padding: "1rem",
                  background: role === value ? "rgba(16,185,129,0.12)" : "var(--color-surface-100)",
                  border: `2px solid ${role === value ? "var(--color-brand-500)" : "var(--color-surface-200)"}`,
                  borderRadius: "var(--radius-lg)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
              >
                <Icon size={20} color={role === value ? "var(--color-brand-400)" : "var(--color-text-muted)"} style={{ marginBottom: "0.375rem" }} />
                <div style={{ fontWeight: 700, fontSize: "0.875rem", color: role === value ? "var(--color-brand-400)" : "var(--color-text-primary)" }}>{label}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{desc}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {error && (
              <div style={{
                padding: "0.75rem 1rem",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "var(--radius-md)",
                color: "#f87171", fontSize: "0.875rem",
              }}>
                {error}
              </div>
            )}

            {/* Full name */}
            <div>
              <label htmlFor="name" className="label">Full name</label>
              <div style={{ position: "relative" }}>
                <User size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", pointerEvents: "none" }} />
                <input id="name" type="text" className="input" style={{ paddingLeft: "2.5rem" }}
                  placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="label">Email address</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", pointerEvents: "none" }} />
                <input id="reg-email" type="email" className="input" style={{ paddingLeft: "2.5rem" }}
                  placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="label">Phone number <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(optional)</span></label>
              <div style={{ position: "relative" }}>
                <Phone size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", pointerEvents: "none" }} />
                <input id="phone" type="tel" className="input" style={{ paddingLeft: "2.5rem" }}
                  placeholder="+91 99999 88888" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="label">Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", pointerEvents: "none" }} />
                <input id="reg-password" type={showPw ? "text" : "password"} className="input"
                  style={{ paddingLeft: "2.5rem", paddingRight: "2.75rem" }}
                  placeholder="Min. 8 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" minLength={8} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: "absolute", right: "0.875rem", top: "50%",
                  transform: "translateY(-50%)", background: "none", border: "none",
                  cursor: "pointer", color: "var(--color-text-muted)", padding: 0,
                }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button id="register-submit" type="submit" className="btn btn-primary btn-lg"
              disabled={loading} style={{ width: "100%", marginTop: "0.5rem" }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Create Account"}
            </button>
          </form>

          <div className="divider" style={{ position: "relative", textAlign: "center" }}>
            <span style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(30,41,59,0.6)", padding: "0 0.75rem",
              color: "var(--color-text-muted)", fontSize: "0.8125rem",
            }}>or</span>
          </div>

          <button id="google-register" type="button" className="btn btn-secondary btn-lg"
            onClick={handleGoogleRegister} disabled={loading} style={{ width: "100%", gap: "0.75rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p style={{ textAlign: "center", marginTop: "1.5rem", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Already have an account?{" "}
            <Link href="/auth/login" style={{ color: "var(--color-brand-400)", textDecoration: "none", fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-surface-0)" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--color-brand-500)" }} />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
