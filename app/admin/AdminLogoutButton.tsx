"use client"

import { useState } from "react"
import { LogOut, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"

export function AdminLogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    if (isLoggingOut) return
    setIsLoggingOut(true)

    try {
      // 1. Execute Supabase sign-out using existing browser client architecture
      // This invalidates the session on Supabase and clears all authentication cookies in document.cookie
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }

      // 2. User feedback
      toast.success("Logged out successfully")

      // 3. Clean full page redirect to login page with logged_out parameter
      // Using window.location.href completely flushes the in-memory Next.js router cache
      window.location.href = "/auth/login?logged_out=true"
    } catch (err: any) {
      console.error("Sign out error:", err)
      toast.error(err?.message || "Failed to log out. Please try again.")
      setIsLoggingOut(false)
    }
  }

  return (
    <button
      id="admin-logout-button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      aria-label="Log out of Admin Command Center"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        width: "100%",
        padding: "0.5625rem 0.875rem",
        borderRadius: "var(--radius-md)",
        background: "rgba(239, 68, 68, 0.12)",
        border: "1px solid rgba(239, 68, 68, 0.28)",
        color: "#fca5a5",
        fontSize: "0.8125rem",
        fontWeight: 600,
        cursor: isLoggingOut ? "not-allowed" : "pointer",
        transition: "all 0.15s ease",
      }}
      className="admin-logout-btn"
    >
      {isLoggingOut ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          <span>Signing out...</span>
        </>
      ) : (
        <>
          <LogOut size={14} />
          <span>Sign Out</span>
        </>
      )}
    </button>
  )
}
