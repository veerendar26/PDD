import { NextRequest, NextResponse } from "next/server"

interface ReverseGeocodeResponse {
  display_name: string
  locality: string
  city: string
  pincode: string
  state: string
}

const reverseCache = new Map<string, { timestamp: number; data: ReverseGeocodeResponse }>()
const CACHE_TTL_MS = 1000 * 60 * 60 // 1 hour

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const latStr = searchParams.get("lat")
  const lngStr = searchParams.get("lng")

  const lat = parseFloat(latStr || "")
  const lng = parseFloat(lngStr || "")

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 })
  }

  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const cached = reverseCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data)
  }

  try {
    const nominatimUrl = new URL("https://nominatim.openstreetmap.org/reverse")
    nominatimUrl.searchParams.set("lat", lat.toString())
    nominatimUrl.searchParams.set("lon", lng.toString())
    nominatimUrl.searchParams.set("format", "json")
    nominatimUrl.searchParams.set("addressdetails", "1")

    const res = await fetch(nominatimUrl.toString(), {
      headers: {
        "User-Agent": "EcoFix-Location-Service/1.0 (contact@ecofix.in)",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(4500),
    })

    if (res.ok) {
      const data = await res.json()
      const addr = data.address || {}
      const result: ReverseGeocodeResponse = {
        display_name: data.display_name || "Selected Location",
        locality: addr.suburb || addr.neighbourhood || addr.road || "Locality",
        city: addr.city || addr.town || addr.county || addr.state_district || addr.district || addr.village || "Local Area",
        pincode: addr.postcode || "",
        state: addr.state || "",
      }
      reverseCache.set(cacheKey, { timestamp: Date.now(), data: result })
      return NextResponse.json(result)
    }
  } catch (err) {
    console.warn("[reverse-geocode] Nominatim error:", err)
  }

  // Graceful fallback coordinate label
  const fallback: ReverseGeocodeResponse = {
    display_name: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    locality: "Current Location",
    city: "Local Area",
    pincode: "",
    state: "",
  }
  return NextResponse.json(fallback)
}
