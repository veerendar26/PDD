"use client"

import { useState, useEffect } from "react"
import { MapPin, Navigation, RefreshCw } from "lucide-react"

export default function CustomerLocationBadge() {
  const [locationName, setLocationName] = useState<string>("Detecting area...")
  const [isDetecting, setIsDetecting] = useState<boolean>(false)

  useEffect(() => {
    // 1. Try local storage cache first
    try {
      const cached = localStorage.getItem("ecofix_customer_location")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.address) {
          const parts = parsed.address.split(",")
          setLocationName(parts.slice(0, 2).join(",").trim())
        }
      }
    } catch {}

    // 2. Automatically detect browser location
    detectLocation(false)
  }, [])

  function detectLocation(force = false) {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationName("Service Area")
      return
    }

    setIsDetecting(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        try {
          const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
          const data = await res.json()
          if (data.display_name) {
            const shortName = data.locality && data.city ? `${data.locality}, ${data.city}` : data.display_name.split(",").slice(0, 2).join(",").trim()
            setLocationName(shortName)
            localStorage.setItem(
              "ecofix_customer_location",
              JSON.stringify({
                lat,
                lng,
                address: data.display_name,
                shortName,
                updatedAt: Date.now(),
              })
            )
          } else {
            setLocationName(`Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`)
          }
        } catch {
          setLocationName(`Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`)
        } finally {
          setIsDetecting(false)
        }
      },
      (err) => {
        console.warn("Dashboard location detect failed:", err)
        setIsDetecting(false)
        // Keep whatever was in cache, or show area
        if (locationName === "Detecting area...") {
          setLocationName("Your Area")
        }
      },
      { timeout: 7000, enableHighAccuracy: true }
    )
  }

  return (
    <div
      onClick={() => detectLocation(true)}
      title="Click to refresh your current location"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.35rem 0.75rem",
        borderRadius: "999px",
        background: "rgba(16, 185, 129, 0.1)",
        border: "1px solid rgba(16, 185, 129, 0.25)",
        color: "var(--color-brand-400)",
        fontSize: "0.8125rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <MapPin size={13} style={{ color: "var(--color-brand-400)", flexShrink: 0 }} />
      <span>{locationName}</span>
      {isDetecting && <RefreshCw size={11} className="animate-spin" style={{ marginLeft: "0.25rem" }} />}
    </div>
  )
}
