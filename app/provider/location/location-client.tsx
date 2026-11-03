"use client"

import React, { useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  Wrench,
  MapPin,
  Clock,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Search,
  Check,
  Building,
  Truck,
  Layers,
} from "lucide-react"

// Dynamically import map to avoid SSR window errors
const TechnicianLocationMap = dynamic(
  () => import("@/components/map/technician-location-map"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "380px",
          background: "var(--color-surface-100)",
          borderRadius: "var(--radius-xl)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-muted)",
        }}
      >
        Loading interactive map...
      </div>
    ),
  }
)

const AVAILABLE_CATEGORIES = [
  { id: "smartphones", label: "Smartphones & Mobile Devices" },
  { id: "laptops", label: "Laptops & Computers" },
  { id: "tablets", label: "Tablets & iPads" },
  { id: "audio", label: "Audio & Headphones" },
  { id: "appliances", label: "Home Appliances" },
  { id: "displays", label: "TV & Display Panels" },
]

const DAYS_OF_WEEK = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
]

interface TechnicianLocationClientProps {
  initialProfile: any
  initialCoords: { lat: number; lng: number }
}

export default function TechnicianLocationClient({
  initialProfile,
  initialCoords,
}: TechnicianLocationClientProps) {
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Initialize form state from initial server data
  const [address, setAddress] = useState(initialProfile?.address || "")
  const [locality, setLocality] = useState("")
  const [city, setCity] = useState("Bangalore")
  const [pincode, setPincode] = useState("")
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(
    initialCoords || { lat: 12.9716, lng: 77.5946 }
  )
  const [serviceRadiusKm, setServiceRadiusKm] = useState<number>(
    initialProfile?.service_radius_km || 15
  )
  const [doorstepAvailable, setDoorstepAvailable] = useState<boolean>(
    initialProfile?.doorstep_available ?? true
  )
  const [acceptingBookings, setAcceptingBookings] = useState<boolean>(
    initialProfile?.accepting_bookings ?? true
  )
  const [categories, setCategories] = useState<string[]>(
    Array.isArray(initialProfile?.categories) ? initialProfile.categories : []
  )
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)

  // Working Hours State
  const defaultHours = {
    mon: { open: true, start: "09:00", end: "19:00" },
    tue: { open: true, start: "09:00", end: "19:00" },
    wed: { open: true, start: "09:00", end: "19:00" },
    thu: { open: true, start: "09:00", end: "19:00" },
    fri: { open: true, start: "09:00", end: "19:00" },
    sat: { open: true, start: "09:00", end: "17:00" },
    sun: { open: false, start: "10:00", end: "15:00" },
  }

  const [workingHours, setWorkingHours] = useState<
    Record<string, { open: boolean; start: string; end: string }>
  >(
    initialProfile?.working_hours && typeof initialProfile.working_hours === "object"
      ? { ...defaultHours, ...initialProfile.working_hours }
      : defaultHours
  )

  // Geocode address when technician searches
  async function handleAddressSearch(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const query = [address, locality, city, pincode].filter(Boolean).join(", ")
    if (!query.trim()) return

    try {
      setIsSearchingAddress(true)
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        const top = data.results[0]
        setCoords({ lat: top.lat, lng: top.lng })
        setAddress(top.display_name.split(",")[0] || address)
      } else {
        alert("Could not locate this address. Please drag the pin on the map directly.")
      }
    } catch (err) {
      console.error("Geocoding failed:", err)
    } finally {
      setIsSearchingAddress(false)
    }
  }

  // Handle map marker drag
  async function handleMapLocationChange(newCoords: { lat: number; lng: number }) {
    setCoords(newCoords)
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${newCoords.lat}&lng=${newCoords.lng}`)
      const data = await res.json()
      if (data.locality) setLocality(data.locality)
      if (data.city) setCity(data.city)
      if (data.pincode) setPincode(data.pincode)
      if (data.display_name) {
        const shortAddr = data.display_name.split(",").slice(0, 3).join(",")
        if (!address) setAddress(shortAddr)
      }
    } catch (err) {
      // Non-fatal reverse geocode error
    }
  }

  // Toggle category
  function toggleCategory(catId: string) {
    setCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    )
  }

  // Toggle day open/close
  function toggleDay(dayKey: string) {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        open: !prev[dayKey]?.open,
      },
    }))
  }

  // Update hours for day
  function updateHours(dayKey: string, field: "start" | "end", val: string) {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: val,
      },
    }))
  }

  // Save changes
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSaving(true)
      setErrorMsg(null)
      setSaveSuccess(false)

      const fullAddress = [address, locality, city, pincode].filter(Boolean).join(", ")

      const payload = {
        lat: coords.lat,
        lng: coords.lng,
        service_radius_km: serviceRadiusKm,
        doorstep_available: doorstepAvailable,
        address: fullAddress || address,
        categories,
        working_hours: workingHours,
        accepting_bookings: acceptingBookings,
      }

      const res = await fetch("/api/provider/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error || "Failed to save location settings")
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err: any) {
      console.error("Save error:", err)
      setErrorMsg(err.message || "Failed to save settings. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-surface-0)" }}>
      {/* Sidebar */}
      <aside className="sidebar" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none", marginBottom: "2rem" }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wrench size={16} color="white" />
          </div>
          <span style={{ fontWeight: 800, color: "var(--color-text-primary)" }}>Eco<span style={{ color: "var(--color-brand-500)" }}>Fix</span></span>
        </Link>
        {[
          { href: "/provider/dashboard", label: "Dashboard",   icon: "📊" },
          { href: "/provider/jobs",      label: "All Jobs",     icon: "🔧" },
          { href: "/provider/location",  label: "Service Area & Hours", icon: "📍" },
          { href: "/provider/earnings",  label: "Earnings",     icon: "💰" },
          { href: "/profile",            label: "Profile",      icon: "👤" },
        ].map(({ href, label, icon }) => (
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
              color: href === "/provider/location" ? "var(--color-brand-400)" : "var(--color-text-secondary)",
              background: href === "/provider/location" ? "rgba(16, 185, 129, 0.1)" : "transparent",
              fontSize: "0.875rem",
              fontWeight: href === "/provider/location" ? 700 : 500,
            }}
          >
            <span>{icon}</span> {label}
          </Link>
        ))}
      </aside>

      {/* Main Content Area — Full Screen Width */}
      <main style={{ flex: 1, padding: "2rem 2.5rem", overflowY: "auto", width: "100%", minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "0.25rem" }}>
              Location & Service Area
            </h1>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
              Configure your workshop pin, service coverage radius, and working availability for customer discovery.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem" }}
          >
            {saving ? (
              <>Saving...</>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 size={16} /> Saved Successfully
              </>
            ) : (
              <>
                <Save size={16} /> Save Settings
              </>
            )}
          </button>
        </div>

        {/* Feedback banners */}
        {saveSuccess && (
          <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid var(--color-brand-500)", color: "var(--color-brand-400)", padding: "0.875rem 1.25rem", borderRadius: "var(--radius-md)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.875rem" }}>
            <CheckCircle2 size={18} />
            <span>Your workshop location, service radius ({serviceRadiusKm} km), and working hours have been updated in real-time.</span>
          </div>
        )}

        {errorMsg && (
          <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", color: "#f87171", padding: "0.875rem 1.25rem", borderRadius: "var(--radius-md)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.875rem" }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", width: "100%" }}>
          {/* Left Column: Workshop Address & Map */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            {/* Workshop Address Card */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.25rem" }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "rgba(16, 185, 129, 0.15)", color: "var(--color-brand-400)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Building size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Workshop & Hub Location</h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Designate your official service center</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label className="form-label" style={{ fontSize: "0.8125rem", marginBottom: "0.375rem" }}>Street / Building Address</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      type="text"
                      className="form-input"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. #42, 80 Feet Road, Koramangala 4th Block"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddressSearch()}
                      disabled={isSearchingAddress}
                      className="btn btn-secondary btn-sm"
                      title="Pinpoint on Map"
                      style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}
                    >
                      <Search size={14} /> {isSearchingAddress ? "Locating..." : "Locate"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Locality</label>
                    <input
                      type="text"
                      className="form-input form-input-sm"
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      placeholder="Koramangala"
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>City</label>
                    <input
                      type="text"
                      className="form-input form-input-sm"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Bangalore"
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>PIN Code</label>
                    <input
                      type="text"
                      className="form-input form-input-sm"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="560034"
                    />
                  </div>
                </div>

                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "flex", gap: "1rem", marginTop: "0.25rem" }}>
                  <span>Latitude: <strong>{coords.lat.toFixed(5)}</strong></span>
                  <span>Longitude: <strong>{coords.lng.toFixed(5)}</strong></span>
                </div>
              </div>
            </div>

            {/* Interactive Map */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  Workshop Map & Service Boundary
                </span>
                <span className="badge badge-emerald" style={{ fontSize: "0.75rem" }}>
                  Radius: {serviceRadiusKm} km
                </span>
              </div>
              <TechnicianLocationMap
                location={coords}
                radiusKm={serviceRadiusKm}
                onLocationChange={handleMapLocationChange}
                height="420px"
              />
            </div>

            {/* Privacy Guarantee Box */}
            <div style={{ background: "rgba(30, 41, 59, 0.4)", border: "1px solid var(--color-surface-200)", padding: "1rem 1.25rem", borderRadius: "var(--radius-lg)", display: "flex", gap: "0.875rem" }}>
              <Shield size={22} style={{ color: "var(--color-brand-400)", flexShrink: 0, marginTop: "0.125rem" }} />
              <div>
                <h4 style={{ margin: "0 0 0.25rem", fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  Location Privacy Guarantee
                </h4>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                  Only your designated workshop address and service coverage radius are visible to customers for distance calculations. We never track or broadcast your live personal device coordinates.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Service Coverage, Specializations & Working Hours */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            {/* Service Coverage Radius */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Service Radius</h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Choose how far you are willing to travel for repairs</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                {[5, 10, 15, 25, 50].map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => setServiceRadiusKm(radius)}
                    style={{
                      flex: 1,
                      padding: "0.625rem 0.5rem",
                      borderRadius: "var(--radius-md)",
                      border: serviceRadiusKm === radius ? "2px solid var(--color-brand-500)" : "1px solid var(--color-surface-200)",
                      background: serviceRadiusKm === radius ? "rgba(16, 185, 129, 0.15)" : "var(--color-surface-100)",
                      color: serviceRadiusKm === radius ? "var(--color-brand-400)" : "var(--color-text-secondary)",
                      fontWeight: serviceRadiusKm === radius ? 800 : 500,
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      textAlign: "center",
                    }}
                  >
                    {radius} km
                  </button>
                ))}
              </div>

              <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                Customers within <strong>{serviceRadiusKm} km</strong> of your workshop will see you in their search results. Outside this boundary, your profile will not be recommended to prevent unreasonable transit.
              </p>
            </div>

            {/* Service Types & Offerings */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.25rem" }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "rgba(167, 139, 250, 0.15)", color: "#a78bfa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Truck size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Service Types & Booking Status</h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Control doorstep availability & incoming requests</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Accepting Bookings Toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 1rem", background: "var(--color-surface-100)", borderRadius: "var(--radius-md)" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--color-text-primary)" }}>Accepting New Bookings</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Turn off to temporarily pause new customer appointments</div>
                  </div>
                  <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={acceptingBookings}
                      onChange={(e) => setAcceptingBookings(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: acceptingBookings ? "var(--color-brand-500)" : "var(--color-surface-300)",
                        borderRadius: 24,
                        transition: "0.2s",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          content: '""',
                          height: 18,
                          width: 18,
                          left: acceptingBookings ? 22 : 3,
                          bottom: 3,
                          backgroundColor: "white",
                          borderRadius: "50%",
                          transition: "0.2s",
                        }}
                      />
                    </span>
                  </label>
                </div>

                {/* Doorstep Toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 1rem", background: "var(--color-surface-100)", borderRadius: "var(--radius-md)" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--color-text-primary)" }}>Doorstep & On-Site Repairs</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>You travel to the customer's home or office</div>
                  </div>
                  <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={doorstepAvailable}
                      onChange={(e) => setDoorstepAvailable(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: doorstepAvailable ? "var(--color-brand-500)" : "var(--color-surface-300)",
                        borderRadius: 24,
                        transition: "0.2s",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          content: '""',
                          height: 18,
                          width: 18,
                          left: doorstepAvailable ? 22 : 3,
                          bottom: 3,
                          backgroundColor: "white",
                          borderRadius: "50%",
                          transition: "0.2s",
                        }}
                      />
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Specialization Categories */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "rgba(234, 179, 8, 0.15)", color: "#eab308", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Layers size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Repair Specializations</h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Select device types you service</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                {AVAILABLE_CATEGORIES.map((cat) => {
                  const isChecked = categories.includes(cat.id)
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      style={{
                        padding: "0.625rem 0.875rem",
                        borderRadius: "var(--radius-md)",
                        border: isChecked ? "1px solid var(--color-brand-500)" : "1px solid var(--color-surface-200)",
                        background: isChecked ? "rgba(16, 185, 129, 0.1)" : "var(--color-surface-100)",
                        color: isChecked ? "var(--color-brand-400)" : "var(--color-text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.8125rem",
                        fontWeight: isChecked ? 700 : 500,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          border: isChecked ? "none" : "1px solid var(--color-surface-300)",
                          background: isChecked ? "var(--color-brand-500)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                        }}
                      >
                        {isChecked && <Check size={12} />}
                      </div>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Working Hours & Availability */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.25rem" }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Clock size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Working Hours & Days</h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Set when customers can schedule service with you</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {DAYS_OF_WEEK.map(({ key, label }) => {
                  const day = workingHours[key] || { open: false, start: "09:00", end: "18:00" }
                  return (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 0.75rem",
                        background: day.open ? "var(--color-surface-100)" : "transparent",
                        border: "1px solid var(--color-surface-200)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", width: "90px" }}>
                        <button
                          type="button"
                          onClick={() => toggleDay(key)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "var(--radius-sm)",
                            border: day.open ? "1px solid var(--color-brand-500)" : "1px solid var(--color-surface-300)",
                            background: day.open ? "var(--color-brand-500)" : "transparent",
                            color: day.open ? "white" : "var(--color-text-muted)",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            width: "44px",
                          }}
                        >
                          {label}
                        </button>
                        <span style={{ fontSize: "0.75rem", color: day.open ? "var(--color-brand-400)" : "var(--color-text-muted)", fontWeight: 600 }}>
                          {day.open ? "Open" : "Closed"}
                        </span>
                      </div>

                      {day.open ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <input
                            type="time"
                            value={day.start}
                            onChange={(e) => updateHours(key, "start", e.target.value)}
                            className="form-input form-input-sm"
                            style={{ width: "95px", padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          />
                          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>to</span>
                          <input
                            type="time"
                            value={day.end}
                            onChange={(e) => updateHours(key, "end", e.target.value)}
                            className="form-input form-input-sm"
                            style={{ width: "95px", padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          />
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontStyle: "italic" }}>Not accepting jobs</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
