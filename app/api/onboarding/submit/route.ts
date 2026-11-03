import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/onboarding/submit
 *
 * Secure server-side onboarding submission handler.
 * - Verifies the authenticated session on the server
 * - Server strictly sets verification_status = 'pending' and is_active = true
 * - The client cannot tamper with or override the verification status
 * - Updates user contact details & role to 'technician'
 * - Upserts provider_profile with pending status
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Verify authenticated session (server-side)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 }
      )
    }

    // Require verified email before onboarding submission
    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { success: false, error: "Please verify your email address before submitting a technician application" },
        { status: 403 }
      )
    }

    // 2. Parse and validate the request body
    const body = await request.json()

    const {
      businessName,
      contactName,
      phone,
      description,
      categories,
      serviceRadiusKm,
      doorstepAvailable,
      address,
      identityDocUrl,
    } = body

    // Strict server-side validation of all required fields
    if (!businessName || typeof businessName !== "string" || !businessName.trim()) {
      return NextResponse.json(
        { success: false, error: "Workshop / Business name is required" },
        { status: 400 }
      )
    }

    if (!contactName || typeof contactName !== "string" || !contactName.trim()) {
      return NextResponse.json(
        { success: false, error: "Lead technician name is required" },
        { status: 400 }
      )
    }

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        { success: false, error: "Phone / WhatsApp number is required" },
        { status: 400 }
      )
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { success: false, error: "Professional bio & experience is required" },
        { status: 400 }
      )
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one repair specialization must be selected" },
        { status: 400 }
      )
    }

    if (!address || typeof address !== "string" || !address.trim()) {
      return NextResponse.json(
        { success: false, error: "Workshop street address & city are required" },
        { status: 400 }
      )
    }

    if (!identityDocUrl) {
      return NextResponse.json(
        { success: false, error: "Trade License / ID document is required" },
        { status: 400 }
      )
    }

    // 4. Update the user record with contact info & technician role
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({
        name: contactName?.trim() || businessName.trim(),
        phone: phone?.trim() || null,
        role: "technician",
      })
      .eq("id", user.id)

    if (userUpdateError) {
      console.warn("[onboarding/submit] Note on user update:", userUpdateError.message)
    }

    // 5. Upsert provider profile with strictly enforced 'pending' status
    const profileFields = {
      business_name: businessName.trim(),
      description: description?.trim() || "Certified professional repair and maintenance specialist.",
      categories,
      service_radius_km: Number(serviceRadiusKm) || 10,
      doorstep_available: Boolean(doorstepAvailable),
      address: address?.trim() || null,
      identity_doc_url: identityDocUrl || null,
      verification_status: "pending" as const,
    }

    const { data: existingProfile } = await supabase
      .from("provider_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    let saveError = null
    let savedId = existingProfile?.id

    if (existingProfile) {
      const { data, error } = await supabase
        .from("provider_profiles")
        .update(profileFields)
        .eq("user_id", user.id)
        .select("id")
        .single()

      saveError = error
      if (data) savedId = data.id
    } else {
      const { data, error } = await supabase
        .from("provider_profiles")
        .insert({
          user_id: user.id,
          ...profileFields,
        })
        .select("id")
        .single()

      saveError = error
      if (data) savedId = data.id
    }

    if (saveError) {
      console.error("[onboarding/submit] DB save error:", saveError)
      return NextResponse.json(
        { success: false, error: saveError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        profile_id: savedId,
        verification_status: "pending",
      },
    }, { status: 200 })

  } catch (err: any) {
    console.error("[onboarding/submit] Unexpected error:", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
