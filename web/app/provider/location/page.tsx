import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { parseWkbPoint } from "@/lib/geo"
import TechnicianLocationClient from "./location-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Service Area & Location — EcoFix Provider" }

export default async function ProviderLocationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login?redirect=/provider/location")
  }

  // Server-side role check
  const { data: profile } = await supabase
    .from("users")
    .select("role, name")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/auth/login")
  if (profile.role === "customer") redirect("/dashboard")
  if (profile.role === "admin") redirect("/admin")

  // Server-side provider profile check
  const { data: providerProfile } = await supabase
    .from("provider_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!providerProfile) redirect("/onboarding")

  if (providerProfile.is_active === false) {
    redirect("/provider/suspended")
  }

  if (providerProfile.verification_status === "pending") {
    redirect("/provider/pending")
  }

  if (providerProfile.verification_status === "rejected") {
    redirect("/provider/rejected")
  }

  // Decode existing coordinates from PostGIS WKB
  const decoded = parseWkbPoint(providerProfile.location)
  const initialCoords = decoded || { lat: 12.9716, lng: 77.5946 }

  return (
    <TechnicianLocationClient
      initialProfile={providerProfile}
      initialCoords={initialCoords}
    />
  )
}
