"use client"

import React, { useEffect, useRef, useState } from "react"
import { Compass, RefreshCw } from "lucide-react"
import "leaflet/dist/leaflet.css"

export interface ProviderMapItem {
  id: string
  business_name: string
  address?: string | null
  distance_km?: number
  rating_avg?: number
  total_reviews?: number
  doorstep_available?: boolean
  lat: number
  lng: number
  is_selected?: boolean
}

interface CustomerProviderMapProps {
  customerLocation: { lat: number; lng: number }
  providers: ProviderMapItem[]
  selectedProviderId: string | null
  onSelectProvider: (providerId: string) => void
  onSearchArea?: (newCenter: { lat: number; lng: number }) => void
  radiusKm?: number
  height?: string
}

export default function CustomerProviderMap({
  customerLocation,
  providers,
  selectedProviderId,
  onSelectProvider,
  onSearchArea,
  radiusKm = 25,
  height = "420px",
}: CustomerProviderMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)
  const circleLayerRef = useRef<any>(null)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(customerLocation)
  const [showSearchAreaBtn, setShowSearchAreaBtn] = useState(false)
  const [L, setL] = useState<any>(null)

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
        center: [customerLocation.lat, customerLocation.lng],
        zoom: 12,
        zoomControl: true,
        attributionControl: true,
      })

      // OpenStreetMap Standard Tile Layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      const markersGroup = L.layerGroup().addTo(map)
      markersLayerRef.current = markersGroup

      // Track drag events to show "Search this area"
      map.on("dragend", () => {
        const center = map.getCenter()
        setMapCenter({ lat: center.lat, lng: center.lng })
        setShowSearchAreaBtn(true)
      })

      mapInstanceRef.current = map

      // Invalidate size on initial mount
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

  // Update map center & markers when customerLocation or providers change
  useEffect(() => {
    if (!L || !mapInstanceRef.current || !markersLayerRef.current) return

    const map = mapInstanceRef.current
    const markersGroup = markersLayerRef.current
    markersGroup.clearLayers()

    // 1. Customer Location Marker (Green pulsing pin)
    const customerHtml = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
        <div style="position: absolute; width: 34px; height: 34px; background: rgba(16, 185, 129, 0.25); border-radius: 50%; animation: pulse 2s infinite;"></div>
        <div style="width: 20px; height: 20px; background: #10b981; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 2;">
          <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
        </div>
      </div>
    `
    const customerIcon = L.divIcon({
      html: customerHtml,
      className: "custom-customer-pin",
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    })

    const customerMarker = L.marker([customerLocation.lat, customerLocation.lng], {
      icon: customerIcon,
      zIndexOffset: 1000,
    }).addTo(markersGroup)

    customerMarker.bindPopup(`
      <div style="padding: 4px; font-family: inherit;">
        <strong style="color: #10b981; font-size: 13px;">📍 Your Selected Location</strong>
        <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">Technicians are sorted by distance from here.</p>
      </div>
    `)

    // 2. Search Radius Circle
    if (circleLayerRef.current) {
      map.removeLayer(circleLayerRef.current)
    }
    const searchCircle = L.circle([customerLocation.lat, customerLocation.lng], {
      radius: (radiusKm || 25) * 1000,
      color: "#10b981",
      weight: 1.5,
      opacity: 0.5,
      fillColor: "#10b981",
      fillOpacity: 0.05,
    }).addTo(map)
    circleLayerRef.current = searchCircle

    // 3. Provider Markers
    const bounds = L.latLngBounds([customerLocation.lat, customerLocation.lng])

    providers.forEach((provider) => {
      if (!provider.lat || !provider.lng) return

      const isSelected = selectedProviderId === provider.id
      const pinColor = isSelected ? "#38bdf8" : "#10b981"
      const scale = isSelected ? "1.25" : "1"

      const providerHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: scale(${scale}); transition: transform 0.2s;">
          <div style="background: ${pinColor}; color: white; padding: 4px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; gap: 4px;">
            <span>🔧</span> ${provider.business_name.slice(0, 16)}
          </div>
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid ${pinColor}; margin-top: -1px;"></div>
        </div>
      `

      const providerIcon = L.divIcon({
        html: providerHtml,
        className: `custom-provider-pin-${provider.id}`,
        iconSize: [120, 36],
        iconAnchor: [60, 36],
      })

      const marker = L.marker([provider.lat, provider.lng], {
        icon: providerIcon,
        zIndexOffset: isSelected ? 900 : 500,
      }).addTo(markersGroup)

      const popupHtml = `
        <div style="padding: 6px; font-family: inherit; min-width: 170px;">
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
            ${provider.business_name}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            ${provider.address ? `📍 ${provider.address.slice(0, 45)}...` : ""}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; margin-bottom: 8px;">
            <span style="color: #eab308;">★ ${(provider.rating_avg || 4.8).toFixed(1)}</span>
            <span style="color: #10b981;">${provider.distance_km != null ? `${provider.distance_km} km away` : ""}</span>
          </div>
          <button
            id="popup-btn-${provider.id}"
            style="width: 100%; background: #10b981; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;"
          >
            ${isSelected ? "✓ Selected" : "Choose This Technician"}
          </button>
        </div>
      `

      marker.bindPopup(popupHtml)
      marker.on("popupopen", () => {
        const btn = document.getElementById(`popup-btn-${provider.id}`)
        if (btn) {
          btn.onclick = () => {
            onSelectProvider(provider.id)
            map.closePopup()
          }
        }
      })

      marker.on("click", () => {
        onSelectProvider(provider.id)
      })

      bounds.extend([provider.lat, provider.lng])
    })

    // Auto-fit if providers are found, else keep user center
    if (providers.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
    } else {
      map.setView([customerLocation.lat, customerLocation.lng], 12)
    }
  }, [L, customerLocation, providers, selectedProviderId, radiusKm])

  // Center on customer location button
  function handleRecenter() {
    if (!mapInstanceRef.current) return
    mapInstanceRef.current.setView([customerLocation.lat, customerLocation.lng], 13, {
      animate: true,
    })
    setShowSearchAreaBtn(false)
  }

  // Search this area triggered
  function handleSearchThisArea() {
    if (onSearchArea) {
      onSearchArea(mapCenter)
    }
    setShowSearchAreaBtn(false)
  }

  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: "var(--radius-xl)", overflow: "hidden", border: "1px solid var(--color-surface-200)" }}>
      {/* Map DOM Container */}
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%", zIndex: 1 }} />

      {/* Floating: Search This Area */}
      {showSearchAreaBtn && onSearchArea && (
        <div style={{ position: "absolute", top: "1rem", left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
          <button
            type="button"
            onClick={handleSearchThisArea}
            className="btn btn-primary btn-sm"
            style={{
              boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.8125rem",
              padding: "0.5rem 1rem",
              borderRadius: "999px",
            }}
          >
            <RefreshCw size={14} /> Search This Area
          </button>
        </div>
      )}

      {/* Floating: Re-center on My Location */}
      <div style={{ position: "absolute", bottom: "1rem", right: "1rem", zIndex: 10 }}>
        <button
          type="button"
          onClick={handleRecenter}
          className="btn btn-secondary btn-sm"
          title="Center on Your Selected Location"
          style={{
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid var(--color-surface-200)",
            color: "var(--color-text-primary)",
            padding: "0.5rem 0.75rem",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            fontSize: "0.75rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <Compass size={14} style={{ color: "var(--color-brand-400)" }} /> Re-center
        </button>
      </div>
    </div>
  )
}
