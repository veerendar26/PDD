"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Wrench, Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword]               = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPw, setShowPw]                   = useState(false)
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState("")

  const supabase = createClient()

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    toast.success("Password updated successfully! Welcome back.")
    router.push("/dashboard")
    router.refresh()
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
            Create new password
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Please enter and confirm your new password below.
          </p>
        </div>

        {/* Card */}
        <div className="glass" style={{ borderRadius: "var(--radius-2xl)", padding: "2rem" }}>
          <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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

            {/* New Password */}
            <div>
              <label htmlFor="new-password" className="label">New Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{
                  position: "absolute", left: "0.875rem", top: "50%",
                  transform: "translateY(-50%)", color: "var(--color-text-muted)",
                  pointerEvents: "none",
                }} />
                <input
                  id="new-password"
                  type={showPw ? "text" : "password"}
                  className="input"
                  style={{ paddingLeft: "2.5rem", paddingRight: "2.75rem" }}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="label">Confirm New Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{
                  position: "absolute", left: "0.875rem", top: "50%",
                  transform: "translateY(-50%)", color: "var(--color-text-muted)",
                  pointerEvents: "none",
                }} />
                <input
                  id="confirm-password"
                  type={showPw ? "text" : "password"}
                  className="input"
                  style={{ paddingLeft: "2.5rem", paddingRight: "2.75rem" }}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: "100%", marginTop: "0.25rem" }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Save New Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
