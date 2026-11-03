"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  User, Pencil, Wrench, CheckCircle, Clock,
  Lock, Bell, LogOut, ChevronRight, X, Loader2,
  Building2, Check
} from "lucide-react"
import toast from "react-hot-toast"
import type { UserRole } from "@/types/database"

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  street_address?: string
  city?: string
  pin_code?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // Profile data
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // Personal Information
  const [name, setName] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  // Address Information
  const [streetAddress, setStreetAddress] = useState("")
  const [city, setCity] = useState("")
  const [pinCode, setPinCode] = useState("")

  // Repair Overview counts
  const [totalRepairs, setTotalRepairs] = useState(0)
  const [completedRepairs, setCompletedRepairs] = useState(0)
  const [pendingRepairs, setPendingRepairs] = useState(0)

  // Modals & UI states
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [updatingPassword, setUpdatingPassword] = useState(false)

  useEffect(() => {
    loadProfileAndStats()
  }, [])

  async function loadProfileAndStats() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login?redirect=/profile")
        return
      }

      // Fetch user profile from public.users
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single()

      // Metadata fallback for address info
      const meta = user.user_metadata || {}

      const userProf: UserProfile = {
        id: user.id,
        name: userData?.name || (meta.name as string) || user.email?.split("@")[0] || "",
        email: user.email || "",
        phone: userData?.phone || (meta.phone as string) || "",
        role: userData?.role || (meta.role as UserRole) || "customer",
        street_address: (meta.street_address as string) || (meta.address as string) || "",
        city: (meta.city as string) || "",
        pin_code: (meta.pin_code as string) || (meta.pincode as string) || "",
      }

      setProfile(userProf)
      setName(userProf.name)
      setPhone(userProf.phone || "")
      setEmail(userProf.email)
      setStreetAddress(userProf.street_address || "")
      setCity(userProf.city || "")
      setPinCode(userProf.pin_code || "")

      // If technician, fetch provider_profile
      let providerProf: any = null
      if (userProf.role === "technician") {
        const { data: pp } = await supabase
          .from("provider_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()
        if (pp) {
          providerProf = pp
          if (pp.business_name) setBusinessName(pp.business_name)
          if (!userProf.street_address && pp.address) {
            setStreetAddress(pp.address)
          }
        }
      }

      // Fetch repair overview stats
      let bookingsQuery = supabase.from("bookings").select("id, status")
      if (userProf.role === "technician" && providerProf?.id) {
        bookingsQuery = bookingsQuery.eq("provider_id", providerProf.id)
      } else {
        bookingsQuery = bookingsQuery.eq("customer_id", user.id)
      }
      const { data: bookings } = await bookingsQuery

      if (bookings) {
        setTotalRepairs(bookings.length)
        const completed = bookings.filter((b) => b.status === "completed").length
        const pending = bookings.filter((b) => b.status !== "completed" && b.status !== "cancelled").length
        setCompletedRepairs(completed)
        setPendingRepairs(pending)
      }
    } catch (err) {
      console.error("Error loading profile:", err)
      toast.error("Failed to load profile details")
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveChanges(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!profile) return
    setSaving(true)

    try {
      // 1. Update public.users
      const { error: userError } = await supabase
        .from("users")
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
        })
        .eq("id", profile.id)

      if (userError) throw userError

      // 2. Persist address & phone in auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: name.trim(),
          phone: phone.trim() || null,
          business_name: businessName.trim() || undefined,
          street_address: streetAddress.trim(),
          city: city.trim(),
          pin_code: pinCode.trim(),
        },
      })

      if (authError) throw authError

      // 3. Update provider_profiles if technician
      if (profile.role === "technician") {
        await supabase
          .from("provider_profiles")
          .update({
            business_name: businessName.trim() || name.trim(),
            address: `${streetAddress.trim()}${city.trim() ? `, ${city.trim()}` : ""}${pinCode.trim() ? ` - ${pinCode.trim()}` : ""}`,
          })
          .eq("user_id", profile.id)
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: name.trim(),
              phone: phone.trim() || null,
              street_address: streetAddress.trim(),
              city: city.trim(),
              pin_code: pinCode.trim(),
            }
          : null
      )

      toast.success("Profile updated successfully! ✨")
    } catch (err: any) {
      console.error("Save error:", err)
      toast.error(err.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    if (profile) {
      setName(profile.name)
      setPhone(profile.phone || "")
      setStreetAddress(profile.street_address || "")
      setCity(profile.city || "")
      setPinCode(profile.pin_code || "")
      toast("Changes discarded", { icon: "↩️" })
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!newPassword) return

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setUpdatingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success("Password updated successfully! 🔒")
      setNewPassword("")
      setConfirmPassword("")
      setShowPasswordModal(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to update password")
    } finally {
      setUpdatingPassword(false)
    }
  }

  async function handleSignOut() {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      toast.success("Logged out successfully")
      router.push("/auth/login")
      router.refresh()
    } catch (err) {
      toast.error("Error signing out")
    } finally {
      setLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-surface-0)" }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 size={36} className="animate-spin" style={{ color: "#10b981", margin: "0 auto 1rem" }} />
          <p style={{ color: "var(--color-text-secondary)" }}>Loading profile...</p>
        </div>
      </div>
    )
  }

  const isTechnician = profile?.role === "technician"

  const sidebarLinks = isTechnician
    ? [
        { href: "/provider/dashboard", label: "Dashboard",   icon: "📊" },
        { href: "/provider/jobs",      label: "All Jobs",     icon: "🔧" },
        { href: "/provider/earnings",  label: "Earnings",     icon: "💰" },
        { href: "/profile",            label: "Profile",      icon: "👤", active: true },
      ]
    : [
        { href: "/dashboard",          label: "Dashboard",       icon: "📊" },
        { href: "/book",               label: "Book Repair",     icon: "🔧" },
        { href: "/history",            label: "Repair History",  icon: "📋" },
        { href: "/profile",            label: "Profile",         icon: "👤", active: true },
      ]

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-surface-0)" }}>
      {/* ── Dashboard Sidebar ── */}
      <aside className="sidebar" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none", marginBottom: "2rem" }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wrench size={16} color="white" />
          </div>
          <span style={{ fontWeight: 800, color: "var(--color-text-primary)" }}>
            Eco<span style={{ color: "var(--color-brand-500)" }}>Fix</span>
          </span>
        </Link>

        {sidebarLinks.map(({ href, label, icon, active }: any) => (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.625rem 0.875rem",
              borderRadius: "var(--radius-md)",
              textDecoration: "none",
              color: active ? "var(--color-brand-400)" : "var(--color-text-secondary)",
              background: active ? "rgba(16, 185, 129, 0.12)" : "transparent",
              fontSize: "0.875rem",
              fontWeight: active ? 700 : 500,
              transition: "all 0.2s",
            }}
          >
            <span>{icon}</span> {label}
          </Link>
        ))}
      </aside>

      {/* ── Main Dashboard Content ── */}
      <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        {/* Top Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem", color: "var(--color-text-primary)" }}>
            {isTechnician ? (businessName || "Technician Profile") : "My Profile"}
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            {isTechnician
              ? "Manage your workshop details, personal contact, and repair preferences"
              : "Manage your personal information, address, and account settings"}
          </p>
        </div>

        {/* ── Main Profile Container Card ── */}
        <div
          style={{
            maxWidth: 640,
            background: "var(--color-surface-100)",
            border: "1px solid var(--color-surface-200)",
            borderRadius: "1.25rem",
            padding: "2rem",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.25)",
            position: "relative",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: "1.5rem",
              borderBottom: "1px solid var(--color-surface-200)",
              marginBottom: "1.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  flexShrink: 0,
                }}
              >
                <User size={26} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "0.2rem" }}>
                  My Profile
                </h2>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", margin: 0 }}>
                  Manage your personal information and account
                </p>
              </div>
            </div>

            <button
              onClick={() => handleSaveChanges()}
              title="Edit & Save"
              aria-label="Edit Profile"
              style={{
                width: 36,
                height: 36,
                borderRadius: "0.5rem",
                background: "#10b981",
                border: "none",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "transform 0.15s ease",
              }}
            >
              <Pencil size={18} />
            </button>
          </div>

          {/* ── 1. Personal / Workshop Information ── */}
          <div style={{ marginBottom: "1.75rem" }}>
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "0.875rem" }}>
              Personal Information
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {isTechnician && (
                <div
                  style={{
                    background: "var(--color-surface-50)",
                    border: "1px solid var(--color-surface-200)",
                    borderRadius: "0.5rem",
                    padding: "0.625rem 0.875rem",
                  }}
                >
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                    Workshop / Business Name
                  </div>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Workshop name"
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "var(--color-text-primary)",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  />
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {/* Full Name */}
                <div
                  style={{
                    background: "var(--color-surface-50)",
                    border: "1px solid var(--color-surface-200)",
                    borderRadius: "0.5rem",
                    padding: "0.625rem 0.875rem",
                  }}
                >
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                    Full Name
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "var(--color-text-primary)",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  />
                </div>

                {/* Phone Number */}
                <div
                  style={{
                    background: "var(--color-surface-50)",
                    border: "1px solid var(--color-surface-200)",
                    borderRadius: "0.5rem",
                    padding: "0.625rem 0.875rem",
                  }}
                >
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                    Phone Number
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Your phone"
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "var(--color-text-primary)",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div
                style={{
                  background: "var(--color-surface-50)",
                  border: "1px solid var(--color-surface-200)",
                  borderRadius: "0.5rem",
                  padding: "0.625rem 0.875rem",
                }}
              >
                <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                  Email Address
                </div>
                <input
                  type="email"
                  value={email}
                  disabled
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--color-text-secondary)",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "not-allowed",
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── 2. Address Information ── */}
          <div style={{ marginBottom: "1.75rem" }}>
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "0.875rem" }}>
              Address Information
            </h3>

            <div
              style={{
                background: "var(--color-surface-50)",
                border: "1px solid var(--color-surface-200)",
                borderRadius: "0.5rem",
                overflow: "hidden",
              }}
            >
              {/* Street Address */}
              <div style={{ padding: "0.625rem 0.875rem", borderBottom: "1px solid var(--color-surface-200)" }}>
                <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                  Street Address
                </div>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Your street address"
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--color-text-primary)",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                  }}
                />
              </div>

              {/* City & PIN Code Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ padding: "0.625rem 0.875rem", borderRight: "1px solid var(--color-surface-200)" }}>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                    City
                  </div>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Your city"
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "var(--color-text-primary)",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  />
                </div>

                <div style={{ padding: "0.625rem 0.875rem" }}>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                    PIN Code
                  </div>
                  <input
                    type="text"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    placeholder="Your PIN code"
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "var(--color-text-primary)",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. Repair Overview ── */}
          <div style={{ marginBottom: "1.75rem" }}>
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "0.875rem" }}>
              Repair Overview
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              {/* Total Repairs */}
              <div
                style={{
                  background: "var(--color-surface-50)",
                  border: "1px solid var(--color-surface-200)",
                  borderRadius: "0.5rem",
                  padding: "1rem 0.75rem",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <Wrench size={18} style={{ color: "#2dd4bf" }} />
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  {totalRepairs}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Total Repairs
                </div>
              </div>

              {/* Completed */}
              <div
                style={{
                  background: "var(--color-surface-50)",
                  border: "1px solid var(--color-surface-200)",
                  borderRadius: "0.5rem",
                  padding: "1rem 0.75rem",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <CheckCircle size={18} style={{ color: "#34d399" }} />
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  {completedRepairs}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Completed
                </div>
              </div>

              {/* Pending */}
              <div
                style={{
                  background: "var(--color-surface-50)",
                  border: "1px solid var(--color-surface-200)",
                  borderRadius: "0.5rem",
                  padding: "1rem 0.75rem",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <Clock size={18} style={{ color: "#fbbf24" }} />
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  {pendingRepairs}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Pending
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. Account Settings ── */}
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "0.875rem" }}>
              Account Settings
            </h3>

            <div
              style={{
                background: "var(--color-surface-50)",
                border: "1px solid var(--color-surface-200)",
                borderRadius: "0.5rem",
                overflow: "hidden",
              }}
            >
              {/* Change Password */}
              <div
                onClick={() => setShowPasswordModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.875rem 1rem",
                  borderBottom: "1px solid var(--color-surface-200)",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <Lock size={18} style={{ color: "var(--color-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                      Change Password
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                      Update your login credentials
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: "var(--color-text-muted)" }} />
              </div>

              {/* Notifications */}
              <div
                onClick={() => setShowNotificationModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.875rem 1rem",
                  borderBottom: "1px solid var(--color-surface-200)",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <Bell size={18} style={{ color: "var(--color-text-muted)" }} />
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                      Notifications
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                      Repair updates and reminders
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: "var(--color-text-muted)" }} />
              </div>

              {/* Logout */}
              <div
                onClick={handleSignOut}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  padding: "0.875rem 1rem",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
              >
                <LogOut size={18} style={{ color: "#ef4444" }} />
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#ef4444" }}>
                  {loggingOut ? "Logging out..." : "Logout"}
                </span>
              </div>
            </div>
          </div>

          {/* ── 5. Bottom Action Buttons ── */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => handleSaveChanges()}
              disabled={saving}
              style={{
                flex: 1,
                padding: "0.875rem",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "0.9375rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
                transition: "all 0.2s ease",
              }}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : "Save Changes"}
            </button>

            <button
              onClick={handleCancel}
              disabled={saving}
              style={{
                flex: 1,
                padding: "0.875rem",
                background: "transparent",
                border: "1px solid var(--color-surface-300)",
                color: "var(--color-text-primary)",
                borderRadius: "0.5rem",
                fontSize: "0.9375rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* ── Change Password Modal ── */}
        {showPasswordModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(6px)",
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 420,
                background: "var(--color-surface-100)",
                border: "1px solid var(--color-surface-200)",
                borderRadius: "1rem",
                padding: "1.75rem",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  Change Password
                </h3>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label className="label">New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                  />
                </div>

                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    minLength={6}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {updatingPassword ? <Loader2 size={16} className="animate-spin" /> : "Update Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Notifications Modal ── */}
        {showNotificationModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(6px)",
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 420,
                background: "var(--color-surface-100)",
                border: "1px solid var(--color-surface-200)",
                borderRadius: "1rem",
                padding: "1.75rem",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  Notification Preferences
                </h3>
                <button
                  onClick={() => setShowNotificationModal(false)}
                  style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                      Repair Status Updates
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                      Instant updates when your repair progresses
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: "#10b981", cursor: "pointer" }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  toast.success("Preferences updated! 🔔")
                  setShowNotificationModal(false)
                }}
                className="btn btn-primary"
                style={{ width: "100%" }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
