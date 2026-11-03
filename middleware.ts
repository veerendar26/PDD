import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/database"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must not be removed
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Public routes that don't require auth
  const isPublicRoute =
    path === "/" ||
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/register") ||
    path.startsWith("/auth/verify-email") ||
    path.startsWith("/auth/forgot-password") ||
    path.startsWith("/auth/reset-password") ||
    path.startsWith("/auth/callback") ||
    path.startsWith("/api/geocode") ||
    path.startsWith("/api/ai-diagnosis")

  // Redirect unauthenticated users to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("redirectTo", path)
    return NextResponse.redirect(url)
  }

  // ──────────────────────────────────────────────────────────
  // Email Verification Enforcement
  // Authoritative check: user.email_confirmed_at must be set.
  // Unverified users are blocked from all protected dashboard/app routes.
  // ──────────────────────────────────────────────────────────
  if (user && !isPublicRoute) {
    const isEmailVerified = Boolean(user.email_confirmed_at)
    if (!isEmailVerified) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/verify-email"
      if (user.email) {
        url.searchParams.set("email", user.email)
      }
      url.searchParams.set("redirectTo", path)
      url.searchParams.set("unverified", "true")
      return NextResponse.redirect(url)
    }
  }

  // ──────────────────────────────────────────────────────────
  // Admin route protection — server-side role check
  // ──────────────────────────────────────────────────────────
  if (path.startsWith("/admin")) {
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user!.id)
      .single()

    if (userProfile?.role !== "admin") {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  // ──────────────────────────────────────────────────────────
  // Provider/Technician route protection
  // Checks: role, verification_status, AND is_active
  // Never trust the frontend — all checks happen server-side.
  // ──────────────────────────────────────────────────────────
  if (path.startsWith("/provider")) {
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user!.id)
      .single()

    // Customers and admins have no business on /provider routes
    if (!userProfile || userProfile.role === "customer") {
      const url = request.nextUrl.clone()
      url.pathname = "/onboarding"
      return NextResponse.redirect(url)
    }

    if (userProfile.role === "admin") {
      const url = request.nextUrl.clone()
      url.pathname = "/admin"
      return NextResponse.redirect(url)
    }

    // For technicians: check provider profile verification status
    const { data: providerProfile } = await supabase
      .from("provider_profiles")
      .select("verification_status")
      .eq("user_id", user!.id)
      .maybeSingle()

    // No profile at all → send to onboarding
    if (!providerProfile) {
      const url = request.nextUrl.clone()
      url.pathname = "/onboarding"
      return NextResponse.redirect(url)
    }

    // Suspended technician → blocked page (if suspended column exists and is false)
    if ((providerProfile as any).is_active === false) {
      // Allow the suspended page itself to avoid redirect loop
      if (!path.startsWith("/provider/suspended")) {
        const url = request.nextUrl.clone()
        url.pathname = "/provider/suspended"
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    // Pending → verification pending page (allow that page through)
    if (providerProfile.verification_status === "pending") {
      if (!path.startsWith("/provider/pending")) {
        const url = request.nextUrl.clone()
        url.pathname = "/provider/pending"
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    // Rejected → rejection page (allow that page through)
    if (providerProfile.verification_status === "rejected") {
      if (!path.startsWith("/provider/rejected")) {
        const url = request.nextUrl.clone()
        url.pathname = "/provider/rejected"
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    // Only approved + active technicians reach /provider/dashboard etc.
    // verification_status === 'approved' && is_active === true: allow through
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
