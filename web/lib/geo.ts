/**
 * EcoFix Geospatial Utilities
 * Handles WKB (Well-Known Binary) encoding/decoding for PostGIS Geography Point (SRID 4326),
 * distance calculations, and working hours checks.
 */

export interface LatLng {
  lat: number
  lng: number
}

/**
 * Parses PostGIS Well-Known Binary (WKB) hex string (SRID 4326 Point) into { lat, lng }.
 * Format:
 *  - Byte 0: Endianness (01 = Little-endian)
 *  - Bytes 1-4: Type (0x20000001 = Point with SRID)
 *  - Bytes 5-8: SRID (4326 = 0x10E6)
 *  - Bytes 9-16: X coordinate (Longitude, Double Little-endian)
 *  - Bytes 17-24: Y coordinate (Latitude, Double Little-endian)
 */
export function parseWkbPoint(hex: string | null | undefined): LatLng | null {
  if (!hex || typeof hex !== "string" || hex.length < 50) return null
  try {
    const clean = hex.startsWith("\\x") ? hex.slice(2) : hex
    const match = clean.match(/.{1,2}/g)
    if (!match) return null
    const bytes = new Uint8Array(match.map((byte) => parseInt(byte, 16)))
    if (bytes.length < 25) return null
    const view = new DataView(bytes.buffer)
    const lng = view.getFloat64(9, true)
    const lat = view.getFloat64(17, true)
    if (isNaN(lat) || isNaN(lng)) return null
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
    return { lat, lng }
  } catch {
    return null
  }
}

/**
 * Encodes { lat, lng } into a 25-byte PostGIS WKB Hex string (SRID 4326 Point).
 */
export function encodeWkbPoint(lat: number, lng: number): string {
  const bytes = new Uint8Array(25)
  const view = new DataView(bytes.buffer)
  view.setUint8(0, 1) // little-endian
  view.setUint32(1, 0x20000001, true) // Point with SRID
  view.setUint32(5, 4326, true) // SRID 4326
  view.setFloat64(9, lng, true) // X = longitude
  view.setFloat64(17, lat, true) // Y = latitude
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
}

/**
 * Computes great-circle distance between two coordinates in kilometers (Haversine formula).
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

export interface WorkingHoursConfig {
  days: string[] // e.g. ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  start_time: string // "09:00"
  end_time: string // "19:00"
}

export const DEFAULT_WORKING_HOURS: WorkingHoursConfig = {
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  start_time: "09:00",
  end_time: "19:00",
}

/**
 * Evaluates whether a technician is currently open based on their configured working hours.
 * Accepts either:
 *  - Legacy { days: string[], start_time: string, end_time: string }
 *  - Detailed { mon: { open: boolean, start: string, end: string }, tue: ... }
 */
export function isCurrentlyOpen(workingHours?: any): {
  isOpen: boolean
  label: string
} {
  const now = new Date()
  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
  const currentKey = dayKeys[now.getDay()]
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ]
  const currentDay = dayNames[now.getDay()]

  const currentHours = now.getHours()
  const currentMinutes = now.getMinutes()
  const currentTotal = currentHours * 60 + currentMinutes

  // 1. Detailed per-day map format
  if (workingHours && typeof workingHours === "object" && currentKey in workingHours) {
    const dayConfig = workingHours[currentKey]
    if (!dayConfig || !dayConfig.open) {
      return { isOpen: false, label: `Closed today (${currentDay})` }
    }
    const [startH, startM] = (dayConfig.start || "09:00").split(":").map(Number)
    const [endH, endM] = (dayConfig.end || "19:00").split(":").map(Number)
    const startTotal = (startH || 9) * 60 + (startM || 0)
    const endTotal = (endH || 19) * 60 + (endM || 0)

    if (currentTotal >= startTotal && currentTotal <= endTotal) {
      return { isOpen: true, label: `Open until ${dayConfig.end || "19:00"}` }
    } else if (currentTotal < startTotal) {
      return { isOpen: false, label: `Opens at ${dayConfig.start || "09:00"}` }
    } else {
      return { isOpen: false, label: `Closed for today` }
    }
  }

  // 2. Legacy { days, start_time, end_time } format or fallback default
  const config: WorkingHoursConfig =
    workingHours && Array.isArray(workingHours.days)
      ? workingHours
      : DEFAULT_WORKING_HOURS

  if (!config.days.includes(currentDay)) {
    return { isOpen: false, label: `Closed today (${currentDay})` }
  }

  const [startH, startM] = (config.start_time || "09:00").split(":").map(Number)
  const [endH, endM] = (config.end_time || "19:00").split(":").map(Number)

  const startTotal = (startH || 9) * 60 + (startM || 0)
  const endTotal = (endH || 19) * 60 + (endM || 0)

  if (currentTotal >= startTotal && currentTotal <= endTotal) {
    return { isOpen: true, label: `Open until ${config.end_time || "19:00"}` }
  } else if (currentTotal < startTotal) {
    return { isOpen: false, label: `Opens at ${config.start_time || "09:00"}` }
  } else {
    return { isOpen: false, label: `Closed (ended at ${config.end_time || "19:00"})` }
  }
}
