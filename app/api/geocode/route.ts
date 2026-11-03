import { NextRequest, NextResponse } from "next/server"

interface GeocodeResult {
  display_name: string
  lat: number
  lng: number
  locality?: string
  city?: string
  pincode?: string
  state?: string
}

// In-memory cache to respect OSM rate limits and accelerate repeat queries
const geocodeCache = new Map<string, { timestamp: number; data: GeocodeResult[] }>()
const CACHE_TTL_MS = 1000 * 60 * 60 // 1 hour

// Curated seed locations for instantaneous fallback / common searches
const KNOWN_LOCATIONS: Record<string, GeocodeResult[]> = {
  bengaluru: [
    { display_name: "MG Road, Bengaluru, Karnataka, 560001, India", lat: 12.9756, lng: 77.6066, locality: "MG Road", city: "Bengaluru", pincode: "560001", state: "Karnataka" },
    { display_name: "Indiranagar, Bengaluru, Karnataka, 560038, India", lat: 12.9784, lng: 77.6408, locality: "Indiranagar", city: "Bengaluru", pincode: "560038", state: "Karnataka" },
    { display_name: "Koramangala, Bengaluru, Karnataka, 560034, India", lat: 12.9352, lng: 77.6245, locality: "Koramangala", city: "Bengaluru", pincode: "560034", state: "Karnataka" },
    { display_name: "Whitefield, Bengaluru, Karnataka, 560066, India", lat: 12.9698, lng: 77.7500, locality: "Whitefield", city: "Bengaluru", pincode: "560066", state: "Karnataka" },
    { display_name: "HSR Layout, Bengaluru, Karnataka, 560102, India", lat: 12.9121, lng: 77.6446, locality: "HSR Layout", city: "Bengaluru", pincode: "560102", state: "Karnataka" },
    { display_name: "Jayanagar, Bengaluru, Karnataka, 560011, India", lat: 12.9308, lng: 77.5838, locality: "Jayanagar", city: "Bengaluru", pincode: "560011", state: "Karnataka" },
  ],
  mumbai: [
    { display_name: "Bandra West, Mumbai, Maharashtra, 400050, India", lat: 19.0596, lng: 72.8295, locality: "Bandra West", city: "Mumbai", pincode: "400050", state: "Maharashtra" },
    { display_name: "Andheri East, Mumbai, Maharashtra, 400069, India", lat: 19.1136, lng: 72.8697, locality: "Andheri East", city: "Mumbai", pincode: "400069", state: "Maharashtra" },
  ],
  delhi: [
    { display_name: "Connaught Place, New Delhi, Delhi, 110001, India", lat: 28.6315, lng: 77.2167, locality: "Connaught Place", city: "New Delhi", pincode: "110001", state: "Delhi" },
  ],
  hyderabad: [
    { display_name: "Hitec City, Hyderabad, Telangana, 500081, India", lat: 17.4435, lng: 78.3772, locality: "Hitec City", city: "Hyderabad", pincode: "500081", state: "Telangana" },
  ],
  chennai: [
    { display_name: "Chettipedu, Sriperumbudur, Tamil Nadu, 602105, India", lat: 13.0232, lng: 80.0076, locality: "Chettipedu", city: "Chennai", pincode: "602105", state: "Tamil Nadu" },
    { display_name: "T Nagar, Chennai, Tamil Nadu, 600017, India", lat: 13.0418, lng: 80.2341, locality: "T Nagar", city: "Chennai", pincode: "600017", state: "Tamil Nadu" },
    { display_name: "Adyar, Chennai, Tamil Nadu, 600020, India", lat: 13.0012, lng: 80.2565, locality: "Adyar", city: "Chennai", pincode: "600020", state: "Tamil Nadu" },
    { display_name: "Velachery, Chennai, Tamil Nadu, 600042, India", lat: 12.9815, lng: 80.2180, locality: "Velachery", city: "Chennai", pincode: "600042", state: "Tamil Nadu" },
  ],
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = (searchParams.get("q") || "").trim()

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const cacheKey = query.toLowerCase()
  const cached = geocodeCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ results: cached.data })
  }

  try {
    // 1. Query OpenStreetMap Nominatim with strict User-Agent
    const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search")
    nominatimUrl.searchParams.set("q", query)
    nominatimUrl.searchParams.set("format", "json")
    nominatimUrl.searchParams.set("addressdetails", "1")
    nominatimUrl.searchParams.set("limit", "6")
    nominatimUrl.searchParams.set("countrycodes", "in") // prioritize India

    const res = await fetch(nominatimUrl.toString(), {
      headers: {
        "User-Agent": "EcoFix-Location-Service/1.0 (contact@ecofix.in)",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(4500),
    })

    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const results: GeocodeResult[] = data.map((item: any) => {
          const addr = item.address || {}
          return {
            display_name: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            locality: addr.suburb || addr.neighbourhood || addr.road || "",
            city: addr.city || addr.town || addr.county || addr.state_district || addr.district || "",
            pincode: addr.postcode || "",
            state: addr.state || "",
          }
        })
        geocodeCache.set(cacheKey, { timestamp: Date.now(), data: results })
        return NextResponse.json({ results })
      }
    }
  } catch (err) {
    console.warn("[geocode] Nominatim error/timeout:", err)
  }

  // 2. Fallback to known seed locations if query matches or is generic
  for (const [key, list] of Object.entries(KNOWN_LOCATIONS)) {
    if (cacheKey.includes(key) || key.includes(cacheKey)) {
      return NextResponse.json({ results: list })
    }
    const match = list.filter(item =>
      item.display_name.toLowerCase().includes(cacheKey) ||
      (item.pincode && item.pincode.includes(cacheKey))
    )
    if (match.length > 0) {
      return NextResponse.json({ results: match })
    }
  }

  return NextResponse.json({ results: [] })
}
