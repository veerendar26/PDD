"use client"

import React, { useEffect, useRef, useState } from "react"
import { Compass, Locate, MapPin } from "lucide-react"
import "leaflet/dist/leaflet.css"

interface TechnicianLocationMapProps {
  location: { lat: number; lng: number }
  radiusKm: number
  onLocationChange: (coords: { lat: number; lng: number }) => void
  height?: string
}

export default function TechnicianLocationMap({
  location,
  radiusKm = 15,
  onLocationChange,
  height = "380px",
}: TechnicianLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const circleRef = useRef<any>(null)
  const [L, setL] = useState<any>(null)
  const [isLocating, setIsLocating] = useState(false)

  // Dynamically load leaflet on client
  useEffect(() => {
    let mounted = true
    import("leaflet").then((leafletModule) => {
      if (mounted) {
        setL(leafletModule.default || leafletModule)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // Initialize Map
  useEffect(() => {
    if (!L || !mapContainerRef.current) return

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [location.lat, location.lng],
        zoom: 13,
        zoomControl: true,
        attributionControl: true,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      // Create draggable workshop marker
      const workshopHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="background: #10b981; color: white; padding: 5px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.5); border: 2px solid #ffffff; display: flex; align-items: center; gap: 4px;">
            <span>🏢</span> Your Workshop
          </div>
          <div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 8px solid #10b981; margin-top: -1px;"></div>
        </div>
      `
      const workshopIcon = L.divIcon({
        html: workshopHtml,
        className: "custom-workshop-pin",
        iconSize: [110, 36],
        iconAnchor: [55, 36],
      })

      const marker = L.marker([location.lat, location.lng], {
        icon: workshopIcon,
        draggable: true,
        zIndexOffset: 1000,
      }).addTo(map)

      marker.bindPopup(`
        <div style="padding: 4px; font-family: inherit; font-size: 12px;">
          <strong style="color: #10b981;">🏢 Workshop & Hub</strong>
          <p style="margin: 4px 0 0; color: #64748b; font-size: 11px;">Drag this pin or click anywhere on the map to set your base location.</p>
        </div>
      `)

      marker.on("dragend", (e: any) => {
        const newPos = e.target.getLatLng()
        onLocationChange({ lat: newPos.lat, lng: newPos.lng })
      })

      // Click on map moves marker
      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng
        marker.setLatLng([lat, lng])
        onLocationChange({ lat, lng })
      })

      markerRef.current = marker

      // Coverage Radius Circle
      const coverageCircle = L.circle([location.lat, location.lng], {
        radius: radiusKm * 1000,
        color: "#10b981",
        weight: 2,
        opacity: 0.8,
        fillColor: "#10b981",
        fillOpacity: 0.1,
        dashArray: "6, 6",
      }).addTo(map)
      circleRef.current = coverageCircle

      mapInstanceRef.current = map

      // Invalidate size on initial render
      setTimeout(() => {
        map.invalidateSize()
      }, 150)
    }

    const container = mapContainerRef.current
    let resizeObserver: ResizeObserver | null = null
    if (container && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize()
        }
      })
      resizeObserver.observe(container)
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [L])

  // React to location and radius updates
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return

    markerRef.current.setLatLng([location.lat, location.lng])
    circleRef.current.setLatLng([location.lat, location.lng])
    circleRef.current.setRadius((radiusKm || 15) * 1000)

    mapInstanceRef.current.panTo([location.lat, location.lng], { animate: true })
  }, [location.lat, location.lng, radiusKm])

  // Use Current Device Location
  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.")
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        onLocationChange(coords)
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([coords.lat, coords.lng], 14, { animate: true })
        }
      },
      (err) => {
        setIsLocating(false)
        alert(`Could not fetch your location: ${err.message}`)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: "var(--radius-xl)", overflow: "hidden", border: "1px solid var(--color-surface-200)" }}>
      {/* Map DOM Container */}
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%", zIndex: 1 }} />

      {/* Info Badge: Instructions */}
      <div
        style={{
          position: "absolute",
          top: "0.75rem",
          left: "0.75rem",
          zIndex: 10,
          background: "rgba(15, 23, 42, 0.88)",
          backdropFilter: "blur(8px)",
          color: "#e2e8f0",
          padding: "0.4rem 0.75rem",
          borderRadius: "var(--radius-md)",
          fontSize: "0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
        }}
      >
        <MapPin size={13} style={{ color: "var(--color-brand-400)" }} />
        <span>Drag marker or click map to move workshop</span>
      </div>

      {/* Floating: Device Location Button */}
      <div style={{ position: "absolute", bottom: "1rem", right: "1rem", zIndex: 10 }}>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="btn btn-secondary btn-sm"
          style={{
            background: "rgba(15, 23, 42, 0.9)",
            backdropFilter: "blur(8px)",
            border: "1px solid var(--color-surface-200)",
            color: "var(--color-text-primary)",
            padding: "0.5rem 0.875rem",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
          }}
        >
          <Locate size={14} style={{ color: "var(--color-brand-400)" }} />
          {isLocating ? "Detecting..." : "Detect Device Location"}
        </button>
      </div>
    </div>
  )
}
