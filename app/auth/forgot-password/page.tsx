"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Wrench, Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")
  const [sent, setSent]       = useState(false)

  const supabase = createClient()

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const cleanedEmail = email.trim().toLowerCase()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanedEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
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
        <Link href="/auth/login" style={{
          display: "inline-flex", alignItems: "center", gap: "0.375rem",
          color: "var(--color-text-secondary)", textDecoration: "none",
          fontSize: "0.875rem", marginBottom: "2rem",
          transition: "color 0.2s",
        }}>
          <ArrowLeft size={16} /> Back to sign in
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
            Reset your password
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Enter your registered email address and we will send you a password reset link.
          </p>
        </div>

        {/* Card */}
        <div className="glass" style={{ borderRadius: "var(--radius-2xl)", padding: "2rem" }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div style={{
                width: 56, height: 56,
                borderRadius: "50%",
                background: "rgba(16,185,129,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 1.25rem",
              }}>
                <CheckCircle2 size={32} color="var(--color-brand-400)" />
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Check your email
              </h2>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "1.75rem" }}>
                We sent a password reset link to <strong style={{ color: "var(--color-text-primary)" }}>{email}</strong>.
                Please check your inbox (and spam folder) and click the link to set a new password.
              </p>
              <Link href="/auth/login" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                Return to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {error && (
                <div style={{
                  padding: "0.75rem 1rem",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "var(--radius-md)",
                  color: "#f87171",
                  fontSize: "0.875rem",
                  lineHeight: 1.5,
                }}>
                  {error}
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="label">Registered Email address</label>
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

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                style={{ width: "100%", marginTop: "0.25rem" }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : "Send Reset Link"}
              </button>
            </form>
          )}

          <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            Remember your password?{" "}
            <Link href="/auth/login" style={{ color: "var(--color-brand-400)", fontWeight: 600, textDecoration: "none" }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
