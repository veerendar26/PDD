import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? "/dashboard"

  const supabase = await createClient()

  // Handle email confirmation token_hash link
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })

    if (!error) {
      return await redirectVerifiedUser(supabase, origin, next)
    }
  }

  // Handle OAuth code or PKCE exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return await redirectVerifiedUser(supabase, origin, next)
    }
  }

  // Auth code exchange or OTP verification failed
  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`)
}

async function redirectVerifiedUser(supabase: any, origin: string, next: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.role === "admin") {
      return NextResponse.redirect(`${origin}/admin`)
    }

    if (profile?.role === "technician") {
      const { data: prov } = await supabase
        .from("provider_profiles")
        .select("verification_status, is_active")
        .eq("user_id", user.id)
        .maybeSingle()

      if (!prov) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
      if (prov.verification_status === "approved" && prov.is_active !== false) {
        return NextResponse.redirect(`${origin}/provider/dashboard`)
      }
      if (prov.verification_status === "rejected") {
        return NextResponse.redirect(`${origin}/provider/rejected`)
      }
      return NextResponse.redirect(`${origin}/provider/pending`)
    }

    return NextResponse.redirect(`${origin}${next}`)
  } catch (err) {
    return NextResponse.redirect(`${origin}${next}`)
  }
}
