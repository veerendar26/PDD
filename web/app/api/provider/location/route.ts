import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { encodeWkbPoint, parseWkbPoint, DEFAULT_WORKING_HOURS } from "@/lib/geo"

/**
 * GET /api/provider/location
 * Returns the authenticated technician's workshop location, service radius,
 * coverage options, working hours, and booking availability.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json({ error: "Email not verified" }, { status: 403 })
    }

    const { data: profile, error } = await supabase
      .from("provider_profiles")
      .select(`
        id,
        user_id,
        business_name,
        description,
        categories,
        verification_status,
        rating_avg,
        total_reviews,
        service_radius_km,
        doorstep_available,
        address,
        location,
        is_active
      `)
      .eq("user_id", user.id)
      .maybeSingle()

    if (error || !profile) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 })
    }

    // Decode WKB location hex if present
    const coords = parseWkbPoint((profile as any).location)

    const profileObj = profile as Record<string, any>
    return NextResponse.json({
      profile: {
        ...profileObj,
        coordinates: coords,
        is_accepting_bookings: profileObj.is_accepting_bookings ?? true,
        working_hours: profileObj.working_hours ?? DEFAULT_WORKING_HOURS,
        is_temporarily_paused: profileObj.is_temporarily_paused ?? false,
        pause_until: profileObj.pause_until ?? null,
      },
    })
  } catch (err: any) {
    console.error("[api/provider/location] GET error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/provider/location
 * Updates the technician's workshop location, service radius, working hours, and availability.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json({ error: "Email not verified" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      address,
      lat,
      lng,
      serviceRadiusKm,
      doorstepAvailable,
      categories,
      isAcceptingBookings,
      workingHours,
      isTemporarilyPaused,
      pauseUntil,
    } = body

    if (!address || typeof address !== "string" || !address.trim()) {
      return NextResponse.json({ error: "Workshop address is required" }, { status: 400 })
    }

    const latitude = typeof lat === "number" ? lat : parseFloat(lat)
    const longitude = typeof lng === "number" ? lng : parseFloat(lng)

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json({ error: "Valid latitude and longitude are required" }, { status: 400 })
    }

    const allowedRadii = [5, 10, 15, 25, 50]
    const radius = allowedRadii.includes(Number(serviceRadiusKm)) ? Number(serviceRadiusKm) : 15

    // Encode coordinates into 4326 PostGIS WKB hex
    const locationWkb = encodeWkbPoint(latitude, longitude)

    const updatePayload: Record<string, any> = {
      address: address.trim(),
      location: locationWkb,
      service_radius_km: radius,
      doorstep_available: Boolean(doorstepAvailable),
      updated_at: new Date().toISOString(),
    }

    if (Array.isArray(categories) && categories.length > 0) {
      updatePayload.categories = categories
    }

    if (typeof isAcceptingBookings === "boolean") {
      updatePayload.is_accepting_bookings = isAcceptingBookings
    }

    if (workingHours && typeof workingHours === "object") {
      updatePayload.working_hours = workingHours
    }

    if (typeof isTemporarilyPaused === "boolean") {
      updatePayload.is_temporarily_paused = isTemporarilyPaused
      updatePayload.pause_until = isTemporarilyPaused && pauseUntil ? pauseUntil : null
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from("provider_profiles")
      .update(updatePayload as any)
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError) {
      // If error was due to columns not existing in DB, attempt update with standard core columns
      console.warn("[api/provider/location] Full update failed, falling back to core columns:", updateError.message)
      const corePayload = {
        address: address.trim(),
        location: locationWkb,
        service_radius_km: radius,
        doorstep_available: Boolean(doorstepAvailable),
      }
      const { data: fallbackProfile, error: fallbackError } = await supabase
        .from("provider_profiles")
        .update(corePayload as any)
        .eq("user_id", user.id)
        .select()
        .single()

      if (fallbackError) {
        throw fallbackError
      }
      return NextResponse.json({
        success: true,
        profile: {
          ...(fallbackProfile as Record<string, any>),
          coordinates: { lat: latitude, lng: longitude },
        },
      })
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...updatedProfile,
        coordinates: { lat: latitude, lng: longitude },
      },
    })
  } catch (err: any) {
    console.error("[api/provider/location] POST error:", err)
    return NextResponse.json({ error: err.message || "Failed to update location settings" }, { status: 500 })
  }
}
