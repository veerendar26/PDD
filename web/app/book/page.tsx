"use client"

import dynamic from "next/dynamic"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Upload, X, Loader2, MapPin, Smartphone, Tv,
  Zap, ChevronRight, ChevronLeft,
  Check, Star, Home, Building, Truck, Camera, Sparkles,
  IndianRupee, Clock, Wrench, ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw, Lightbulb,
  Laptop, Headphones, Gamepad2, Refrigerator, Cpu, Locate, Search, Navigation, Filter,
  Calendar, Phone, User as UserIcon, FileText, Info, HelpCircle, Video
} from "lucide-react"
import toast from "react-hot-toast"
import type { Category, NearbyProvider } from "@/types/database"
import { parseWkbPoint, calculateDistanceKm, isCurrentlyOpen } from "@/lib/geo"
import type {
  EnhancedDiagnosisResult,
  ImageValidationResult,
  DefectFinding,
  RepairEstimate,
} from "@/lib/ai/types"

export interface UploadedMediaItem {
  id: string
  file: File
  previewUrl: string
  base64Data?: string
  isVideo: boolean
  validation?: ImageValidationResult
}

// Dynamically import client map component
const CustomerProviderMap = dynamic(
  () => import("@/components/map/customer-provider-map"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "400px",
          background: "var(--color-surface-100)",
          borderRadius: "var(--radius-xl)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-muted)",
        }}
      >
        Loading interactive map...
      </div>
    ),
  }
)

// Category icons map (100% electronics & appliances)
const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  "Smartphones":         Smartphone,
  "Laptops & PCs":       Laptop,
  "Televisions":         Tv,
  "Audio Equipment":     Headphones,
  "Home Appliances":     Refrigerator,
  "Gaming Devices":      Gamepad2,
  "Cameras":             Camera,
  "Electrical & Wiring": Zap,
  "Electronics":         Cpu,
}

type Step = "category" | "product" | "providers" | "schedule"

export type AiDiagnosisResult = EnhancedDiagnosisResult & {
  issue_labels?: string[]
  confidence_scores?: number[]
  estimated_cost_range?: string
  recommended_action?: string
  turnaround_estimate?: string
  tips?: string[]
}

export default function BookRepairPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>("category")
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [providers, setProviders] = useState<NearbyProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<NearbyProvider | null>(null)
  const [loading, setLoading] = useState(false)
  const [diagnosisLoading, setDiagnosisLoading] = useState(false)

  // Location and Provider Discovery state
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number }>({ lat: 13.0232, lng: 80.0076 })
  const [hasLiveLocation, setHasLiveLocation] = useState(false)
  const [searchLocationInput, setSearchLocationInput] = useState("")
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(25)
  const [isLocating, setIsLocating] = useState(false)
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false)
  const [serviceTypeFilter, setServiceTypeFilter] = useState<"all" | "doorstep" | "in_store">("all")
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false)

  // Product form state
  const [brand, setBrand]                         = useState("")
  const [model, setModel]                         = useState("")
  const [issueDescription, setIssueDescription]   = useState("")
  const [uploadedItems, setUploadedItems]         = useState<UploadedMediaItem[]>([])
  const [activeReplaceItemId, setActiveReplaceItemId] = useState<string | null>(null)
  const [isDiagnosisStale, setIsDiagnosisStale]   = useState(false)
  const [aiDiagnosis, setAiDiagnosis]             = useState<AiDiagnosisResult | null>(null)

  // Schedule form state
  const [serviceType, setServiceType] = useState<"doorstep" | "pickup" | "in_store">("in_store")
  const [scheduledAt, setScheduledAt] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [bookingNotes, setBookingNotes] = useState("")
  const [selectedQuickSlot, setSelectedQuickSlot] = useState<string>("")

  // Quick slot generator for easy one-click appointment scheduling
  function getQuickSlots() {
    const slots = []
    const now = new Date()

    // 1. Same-day slot if before 17:00
    if (now.getHours() < 17) {
      const todaySlot = new Date()
      const targetHour = Math.max(now.getHours() + 2, 11)
      todaySlot.setHours(targetHour, 0, 0, 0)
      const hourStr = todaySlot.getHours() % 12 || 12
      const ampm = todaySlot.getHours() >= 12 ? "PM" : "AM"
      slots.push({
        id: "today_slot",
        label: `Today, ${hourStr}:00 ${ampm}`,
        desc: "Urgent same-day",
        iso: todaySlot.toISOString().slice(0, 16),
      })
    }

    // 2. Tomorrow Morning
    const tmrwMorning = new Date()
    tmrwMorning.setDate(tmrwMorning.getDate() + 1)
    tmrwMorning.setHours(10, 30, 0, 0)
    slots.push({
      id: "tmrw_morning",
      label: "Tomorrow, 10:30 AM",
      desc: "Morning Slot",
      iso: tmrwMorning.toISOString().slice(0, 16),
    })

    // 3. Tomorrow Afternoon
    const tmrwAfternoon = new Date()
    tmrwAfternoon.setDate(tmrwAfternoon.getDate() + 1)
    tmrwAfternoon.setHours(14, 30, 0, 0)
    slots.push({
      id: "tmrw_afternoon",
      label: "Tomorrow, 2:30 PM",
      desc: "Afternoon Slot",
      iso: tmrwAfternoon.toISOString().slice(0, 16),
    })

    // 4. Tomorrow Evening
    const tmrwEvening = new Date()
    tmrwEvening.setDate(tmrwEvening.getDate() + 1)
    tmrwEvening.setHours(17, 0, 0, 0)
    slots.push({
      id: "tmrw_evening",
      label: "Tomorrow, 5:00 PM",
      desc: "Evening Slot",
      iso: tmrwEvening.toISOString().slice(0, 16),
    })

    return slots
  }

  useEffect(() => {
    loadCategories()
    initCustomerLocation()
  }, [])

  // Auto-detect customer location via cache, user profile, or browser GPS
  async function initCustomerLocation() {
    // 1. Check local storage cache for immediate location
    try {
      const cached = localStorage.getItem("ecofix_customer_location")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.lat && parsed.lng) {
          setCustomerCoords({ lat: parsed.lat, lng: parsed.lng })
          setHasLiveLocation(true)
          if (parsed.address) {
            setCustomerAddress(parsed.address)
            setSearchLocationInput(parsed.address)
          }
        }
      }
    } catch {}

    // 2. Fetch authenticated user profile details & contact info
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCustomerEmail(user.email || "")
        const meta = user.user_metadata || {}
        const metaName = (meta.name as string) || (meta.full_name as string) || ""
        const metaPhone = (meta.phone as string) || ""
        if (metaName) setCustomerName(metaName)
        if (metaPhone) setCustomerPhone(metaPhone)

        const { data: profileData } = await supabase
          .from("users")
          .select("name, phone")
          .eq("id", user.id)
          .maybeSingle()

        if (profileData?.name) setCustomerName(profileData.name)
        if (profileData?.phone && !customerPhone) setCustomerPhone(profileData.phone)

        const addr = (meta.street_address as string) || (meta.address as string) || ""
        if (addr && !customerAddress) {
          setCustomerAddress(addr)
          if (!searchLocationInput) setSearchLocationInput(addr)
        }
      }
    } catch {}

    // 3. Automatically request browser geolocation on customer side
    if (typeof window !== "undefined" && navigator.geolocation) {
      setIsLocating(true)
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const liveCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setCustomerCoords(liveCoords)
          setHasLiveLocation(true)
          setIsLocating(false)
          setLocationPermissionDenied(false)

          try {
            const res = await fetch(`/api/geocode/reverse?lat=${liveCoords.lat}&lng=${liveCoords.lng}`)
            const data = await res.json()
            if (data.display_name) {
              setCustomerAddress(data.display_name)
              setSearchLocationInput(data.display_name)
              localStorage.setItem("ecofix_customer_location", JSON.stringify({
                lat: liveCoords.lat,
                lng: liveCoords.lng,
                address: data.display_name,
                updatedAt: Date.now(),
              }))
            }
          } catch (e) {
            console.warn("Auto reverse geocode error:", e)
          }
        },
        (err) => {
          console.warn("Auto-geolocation error or denied:", err)
          setIsLocating(false)
          if (err.code === 1) {
            setLocationPermissionDenied(true)
          }
        },
        { timeout: 8000, enableHighAccuracy: true }
      )
    }
  }

  // Auto-reload nearby providers when customer location updates on Step 3
  useEffect(() => {
    if (step === "providers" && selectedCategory && customerCoords) {
      loadProviders(selectedCategory.id, customerCoords, searchRadiusKm)
    }
  }, [customerCoords.lat, customerCoords.lng, step])

  async function loadCategories() {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("display_order")

    if (!data || data.length === 0) return

    // Exclude non-electronic categories: Furniture, Fashion & Clothing, Automotive, Personal Accessories
    const EXCLUDED = ["Furniture", "Fashion & Clothing", "Automotive", "Personal Accessories"]

    // Specific sub-appliance models to collapse under "Home Appliances"
    const subAppliances = [
      "Washing Machines", "Refrigerators", "Air Conditioners",
      "Microwave Ovens", "Water Purifiers", "Vacuum Cleaners"
    ]

    const electronicsCategories = data.filter(c =>
      !EXCLUDED.includes(c.name) &&
      !subAppliances.includes(c.name) &&
      c.name !== "Electronics" // Specific gadget names (Smartphones, Laptops, etc.) take priority over generic "Electronics"
    )

    // Curated display order
    const ORDER = [
      "Smartphones",
      "Laptops & PCs",
      "Televisions",
      "Audio Equipment",
      "Home Appliances",
      "Gaming Devices",
      "Cameras",
      "Electrical & Wiring"
    ]

    electronicsCategories.sort((a, b) => {
      const idxA = ORDER.indexOf(a.name)
      const idxB = ORDER.indexOf(b.name)
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99)
    })

    setCategories(electronicsCategories)

    if (typeof window !== "undefined") {
      const paramCat = new URLSearchParams(window.location.search).get("category")
      if (paramCat) {
        const found = electronicsCategories.find(
          c => c.name.toLowerCase() === paramCat.toLowerCase()
        )
        if (found) {
          setSelectedCategory(found)
        }
      }
    }
  }

  async function loadProviders(
    categoryId: string,
    coords = customerCoords,
    radius = searchRadiusKm
  ) {
    setLoading(true)
    try {
      // 1. Primary PostGIS discovery via find_nearby_providers RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc("find_nearby_providers", {
        lat: coords.lat,
        lng: coords.lng,
        radius_km: radius,
        category_id: categoryId,
      })

      if (!rpcError && rpcData && rpcData.length > 0) {
        const enriched = rpcData.map((p: any) => {
          let lat = p.lat
          let lng = p.lng
          if ((!lat || !lng) && p.location) {
            const pt = parseWkbPoint(p.location)
            if (pt) {
              lat = pt.lat
              lng = pt.lng
            }
          }
          const distance =
            p.distance_km != null
              ? p.distance_km
              : lat && lng
              ? calculateDistanceKm(coords.lat, coords.lng, lat, lng)
              : 2.5

          return {
            ...p,
            lat: lat || coords.lat + (Math.random() - 0.5) * 0.02,
            lng: lng || coords.lng + (Math.random() - 0.5) * 0.02,
            distance_km: distance,
            open_status: isCurrentlyOpen(p.working_hours),
          }
        })

        setProviders(enriched)
        if (!selectedProvider || !enriched.find((ep: any) => ep.id === selectedProvider.id)) {
          setSelectedProvider(enriched[0])
        }
        return
      }

      // 2. Direct fallback: query approved provider_profiles servicing this category
      const { data: directData } = await supabase
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
          working_hours,
          is_active
        `)
        .eq("verification_status", "approved")
        .contains("categories", [categoryId])

      if (directData && directData.length > 0) {
        const enriched = directData
          .filter((p: any) => p.is_active !== false)
          .map((p: any, idx: number) => {
            const pt = parseWkbPoint(p.location)
            const lat = pt?.lat || coords.lat + (idx + 1) * 0.015
            const lng = pt?.lng || coords.lng + (idx + 1) * 0.015
            const distance = calculateDistanceKm(coords.lat, coords.lng, lat, lng)
            return {
              ...p,
              lat,
              lng,
              distance_km: distance,
              provider_name: p.business_name,
              provider_avatar_url: null,
              open_status: isCurrentlyOpen(p.working_hours),
            }
          })
          // Filter by coverage radius
          .filter((p: any) => p.distance_km <= Math.max(radius, p.service_radius_km || 15))
          .sort((a: any, b: any) => a.distance_km - b.distance_km)

        setProviders(enriched)
        if (enriched.length > 0) {
          if (!selectedProvider || !enriched.find((ep: any) => ep.id === selectedProvider.id)) {
            setSelectedProvider(enriched[0])
          }
        }
      } else {
        setProviders([])
      }
    } catch (err) {
      console.error("Failed to load providers:", err)
      setProviders([])
    } finally {
      setLoading(false)
    }
  }

  // Request browser geolocation on user click
  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.")
      return
    }

    setIsLocating(true)
    setLocationPermissionDenied(false)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCustomerCoords(newCoords)
        setHasLiveLocation(true)
        setIsLocating(false)
        toast.success("Location acquired!")

        try {
          const res = await fetch(`/api/geocode/reverse?lat=${newCoords.lat}&lng=${newCoords.lng}`)
          const data = await res.json()
          if (data.display_name) {
            setCustomerAddress(data.display_name)
            setSearchLocationInput(data.display_name)
            localStorage.setItem("ecofix_customer_location", JSON.stringify({
              lat: newCoords.lat,
              lng: newCoords.lng,
              address: data.display_name,
              updatedAt: Date.now(),
            }))
          }
        } catch (e) {
          console.warn("Reverse geocode error:", e)
        }

        if (selectedCategory) {
          loadProviders(selectedCategory.id, newCoords, searchRadiusKm)
        }
      },
      (err) => {
        setIsLocating(false)
        setLocationPermissionDenied(true)
        if (err.code === 1) {
          toast.error("Location permission denied. You can search manually.")
        } else {
          toast.error("Could not obtain location. Try manual search.")
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // Manual location search via forward geocode
  async function handleSearchAddress(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const q = searchLocationInput.trim()
    if (!q) return

    try {
      setIsSearchingGeocode(true)
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (data.results && data.results.length > 0) {
        const top = data.results[0]
        const newCoords = { lat: top.lat, lng: top.lng }
        setCustomerCoords(newCoords)
        setCustomerAddress(top.display_name)
        setSearchLocationInput(top.display_name)
        if (selectedCategory) {
          loadProviders(selectedCategory.id, newCoords, searchRadiusKm)
        }
        toast.success(`Found: ${top.display_name.split(",")[0]}`)
      } else {
        toast.error("No results found. Please check spelling or enter PIN code.")
      }
    } catch (err) {
      toast.error("Location search failed")
    } finally {
      setIsSearchingGeocode(false)
    }
  }

  // Map "Search This Area" drag handler
  function handleMapSearchArea(newCenter: { lat: number; lng: number }) {
    setCustomerCoords(newCenter)
    if (selectedCategory) {
      loadProviders(selectedCategory.id, newCenter, searchRadiusKm)
    }
    fetch(`/api/geocode/reverse?lat=${newCenter.lat}&lng=${newCenter.lng}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.display_name) {
          setCustomerAddress(d.display_name)
          setSearchLocationInput(d.display_name)
        }
      })
      .catch(() => {})
  }

  // Expand search radius
  function handleExpandRadius(addKm: number) {
    const newRadius = Math.min(searchRadiusKm + addKm, 100)
    setSearchRadiusKm(newRadius)
    if (selectedCategory) {
      loadProviders(selectedCategory.id, customerCoords, newRadius)
    }
    toast.success(`Search radius expanded to ${newRadius} km`)
  }

  async function uploadMedia(file: File): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
      const path = `${user?.id || "guest"}/${Date.now()}-${safeName}`
      const { error } = await supabase.storage.from("repair-media").upload(path, file, {
        upsert: true,
      })
      if (error) {
        console.warn("Storage upload warning:", error)
        return ""
      }
      const { data: { publicUrl } } = supabase.storage.from("repair-media").getPublicUrl(path)
      return publicUrl || ""
    } catch (err) {
      console.warn("Media upload error:", err)
      return ""
    }
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const newItems: UploadedMediaItem[] = []
    let hasVideo = false

    for (const file of files) {
      const isVideo = file.type.startsWith("video/")
      if (isVideo) {
        hasVideo = true
      }
      let base64 = ""
      if (!isVideo) {
        try {
          base64 = await readFileAsDataUrl(file)
        } catch (err) {
          console.warn("Could not read image file as DataURL:", err)
        }
      }
      const preview = URL.createObjectURL(file)
      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        previewUrl: preview,
        base64Data: base64,
        isVideo,
      })
    }

    if (hasVideo) {
      toast("Video attached. Note: AI vision diagnosis requires photos for component analysis. Your technician will review videos during physical quotation.", {
        icon: "ℹ️",
        duration: 5000,
      })
    }

    setUploadedItems((prev) => [...prev, ...newItems])
    setIsDiagnosisStale(true)
    if (e.target) e.target.value = ""
  }

  function triggerReplace(itemId: string) {
    setActiveReplaceItemId(itemId)
    replaceInputRef.current?.click()
  }

  async function handleReplaceFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeReplaceItemId) return

    let base64 = ""
    if (file.type.startsWith("image/")) {
      try {
        base64 = await readFileAsDataUrl(file)
      } catch (err) {
        console.warn("Could not read replacement image as DataURL:", err)
      }
    }
    const preview = URL.createObjectURL(file)

    setUploadedItems((prev) =>
      prev.map((item) => {
        if (item.id === activeReplaceItemId) {
          return {
            id: item.id,
            file,
            previewUrl: preview,
            base64Data: base64,
            isVideo: file.type.startsWith("video/"),
            validation: undefined,
          }
        }
        return item
      })
    )
    setIsDiagnosisStale(true)
    setActiveReplaceItemId(null)
    if (e.target) e.target.value = ""
    toast.success("Photo replaced. Re-run AI Diagnosis to update the assessment.")
  }

  function handleRemoveItem(id: string) {
    setUploadedItems((prev) => prev.filter((item) => item.id !== id))
    setIsDiagnosisStale(true)
  }

  async function handleAiDiagnosis() {
    if (!selectedCategory) {
      toast.error("Please select a device category first")
      setStep("category")
      return
    }
    if (!issueDescription.trim() && uploadedItems.length === 0) {
      toast.error("Please enter a description or upload photos for AI diagnosis")
      return
    }

    setDiagnosisLoading(true)
    try {
      const imagesPayload = uploadedItems
        .filter((item) => !item.isVideo && item.base64Data)
        .map((item) => ({
          filename: item.file.name,
          type: item.file.type,
          size: item.file.size,
          data: item.base64Data!,
        }))

      const res = await fetch("/api/ai-diagnosis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: selectedCategory.name,
          issue_description: issueDescription,
          brand,
          model,
          images: imagesPayload,
          videos_attached_count: uploadedItems.filter((i) => i.isVideo).length,
        }),
      })

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`)
      }

      const diagnosis: EnhancedDiagnosisResult = await res.json()
      setAiDiagnosis(diagnosis)
      setIsDiagnosisStale(false)

      // Match image evaluations to individual items
      if (diagnosis.image_evaluations && diagnosis.image_evaluations.length > 0) {
        setUploadedItems((prev) =>
          prev.map((item) => {
            const evalMatch = diagnosis.image_evaluations.find(
              (ev) => ev.filename === item.file.name
            )
            return evalMatch ? { ...item, validation: evalMatch } : item
          })
        )
      }

      if (diagnosis.has_blocking_mismatch) {
        toast.error("Wrong or mismatched photo detected! Please see details below.", {
          duration: 5000,
        })
      } else {
        toast.success("AI diagnosis generated! ✨")
      }
    } catch (err: any) {
      console.error("AI diagnosis error:", err)
      toast.error("Diagnosis failed — please try again")
    } finally {
      setDiagnosisLoading(false)
    }
  }

  async function handleSubmitBooking() {
    if (!selectedCategory) {
      toast.error("Please select a device category")
      setStep("category")
      return
    }
    if (!issueDescription.trim()) {
      toast.error("Please enter a description of the defect")
      setStep("product")
      return
    }
    if (!selectedProvider) {
      toast.error("Please select a nearby workshop or technician")
      setStep("providers")
      return
    }
    if (!scheduledAt) {
      toast.error("Please select your preferred appointment date and time")
      return
    }
    if (serviceType !== "in_store" && customerAddress.trim().length < 5) {
      toast.error(`Please provide your complete address for ${serviceType === "doorstep" ? "doorstep service" : "pickup"}`)
      return
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit contact phone number for the technician")
      return
    }
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please sign in to confirm your booking")
        router.push("/auth/login?redirect=/book")
        return
      }

      // Update customer phone in users table for future bookings
      if (user && customerPhone) {
        await supabase
          .from("users")
          .update({ phone: customerPhone.trim() })
          .eq("id", user.id)
      }

      // Upload media files gracefully
      const uploadedUrls: string[] = []
      for (const item of uploadedItems) {
        const url = await uploadMedia(item.file)
        if (url) uploadedUrls.push(url)
      }

      // Create product record
      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          customer_id: user!.id,
          category_id: selectedCategory.id,
          brand: brand || null,
          model: model || null,
          issue_description: issueDescription,
          media_urls: uploadedUrls,
          ai_diagnosis: (aiDiagnosis || null) as any,
        })
        .select()
        .single()

      if (productError) throw productError

      // Verify selected provider ID is present
      if (!selectedProvider?.id) {
        toast.error("Please select a technician workshop before confirming")
        setStep("providers")
        return
      }

      // Safely check provider status without querying unmigrated columns
      try {
        const { data: provData } = await supabase
          .from("provider_profiles")
          .select("id, verification_status, business_name")
          .eq("id", selectedProvider.id)
          .maybeSingle()

        if (provData && provData.verification_status && provData.verification_status !== "approved") {
          toast.error(`${provData.business_name || "Selected technician"} is not currently approved for bookings.`)
          setStep("providers")
          loadProviders(selectedCategory.id, customerCoords, searchRadiusKm)
          return
        }
      } catch (err) {
        console.warn("Provider verification query skipped:", err)
      }

      // Create booking
      const effectiveAddress = (serviceType !== "in_store")
        ? customerAddress
        : (selectedProvider.address || customerAddress || "Workshop Drop-off")

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          product_id: product.id,
          customer_id: user!.id,
          provider_id: selectedProvider.id,
          status: "booked",
          service_type: serviceType,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          customer_address: effectiveAddress,
          notes: bookingNotes.trim() || null,
        })
        .select()
        .single()

      if (bookingError) throw bookingError

      toast.success("Booking created successfully! 🎉")
      router.push(`/bookings/${booking.id}`)
    } catch (err: any) {
      toast.error(err.message ?? "Booking failed — try again")
    } finally {
      setLoading(false)
    }
  }

  const STEPS: Step[] = ["category", "product", "providers", "schedule"]
  const stepIdx = STEPS.indexOf(step)

  function nextStep() {
    if (step === "category" && selectedCategory) {
      setStep("product")
    } else if (step === "product") {
      if (!issueDescription.trim()) { toast.error("Please describe the issue"); return }
      if (aiDiagnosis?.has_blocking_mismatch) {
        toast.error("Cannot proceed: One or more uploaded photos do not match the selected category. Please replace or remove mismatched photos.", { duration: 5000 })
        return
      }
      setStep("providers")
      if (selectedCategory) {
        loadProviders(selectedCategory.id, customerCoords, searchRadiusKm)
      }
    } else if (step === "providers") {
      if (!selectedProvider) { toast.error("Please select a provider"); return }
      // Auto-prefill schedule address if discovered
      if (!customerAddress && searchLocationInput) {
        setCustomerAddress(searchLocationInput)
      }
      if (!selectedProvider.doorstep_available && serviceType === "doorstep") {
        setServiceType("in_store")
      }
      // Auto-select initial appointment slot if not already set
      if (!scheduledAt) {
        const slots = getQuickSlots()
        if (slots.length > 0 && slots[0]) {
          setScheduledAt(slots[0].iso)
          setSelectedQuickSlot(slots[0].id)
        }
      }
      setStep("schedule")
    } else {
      handleSubmitBooking()
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface-0)", padding: "2rem" }}>
      <div style={{ maxWidth: step === "providers" ? 1080 : 720, margin: "0 auto", transition: "max-width 0.25s ease" }}>

        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>Book a Repair</h1>
          <p style={{ color: "var(--color-text-secondary)" }}>Tell us what needs fixing — we&apos;ll find the right expert.</p>
        </div>

        {/* Progress stepper */}
        <div style={{ display: "flex", gap: "0", marginBottom: "2.5rem", position: "relative" }}>
          {[
            { id: "category",  label: "Category" },
            { id: "product",   label: "Details" },
            { id: "providers", label: "Provider" },
            { id: "schedule",  label: "Schedule" },
          ].map(({ id, label }, i) => {
            const done    = i < stepIdx
            const current = id === step
            return (
              <div key={id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {i < 3 && (
                  <div style={{
                    position: "absolute", top: 14, left: "50%", width: "100%",
                    height: 2,
                    background: done ? "var(--color-brand-500)" : "var(--color-surface-200)",
                    transition: "background 0.3s",
                  }} />
                )}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", zIndex: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? "var(--color-brand-500)" : current ? "var(--color-brand-900)" : "var(--color-surface-200)",
                  border: `2px solid ${current ? "var(--color-brand-500)" : done ? "var(--color-brand-500)" : "var(--color-surface-300)"}`,
                  fontSize: "0.75rem", fontWeight: 700,
                  color: done ? "white" : current ? "var(--color-brand-400)" : "var(--color-text-muted)",
                  marginBottom: "0.5rem",
                  transition: "all 0.3s",
                }}>
                  {done ? <Check size={14} /> : i + 1}
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: current ? 700 : 500, color: current ? "var(--color-brand-400)" : "var(--color-text-muted)" }}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>

        {/* ── Step 1: Category ── */}
        {step === "category" && (
          <div className="animate-fade-in">
            <h2 style={{ fontWeight: 700, marginBottom: "1.25rem" }}>What needs repairing?</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "1rem" }}>
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.name] ?? Smartphone
                const selected = selectedCategory?.id === cat.id
                return (
                  <button
                    key={cat.id}
                    id={`cat-${cat.id}`}
                    onClick={() => {
                      if (selectedCategory && selectedCategory.id !== cat.id) {
                        setAiDiagnosis(null)
                        setIsDiagnosisStale(false)
                      }
                      setSelectedCategory(cat)
                    }}
                    style={{
                      padding: "1.5rem 1rem", textAlign: "center",
                      background: selected ? "rgba(16,185,129,0.12)" : "var(--color-surface-100)",
                      border: `2px solid ${selected ? "var(--color-brand-500)" : "var(--color-surface-200)"}`,
                      borderRadius: "var(--radius-xl)", cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <Icon size={28} color={selected ? "var(--color-brand-400)" : "var(--color-text-muted)"} />
                    <div style={{ marginTop: "0.75rem", fontWeight: 600, fontSize: "0.875rem", color: selected ? "var(--color-brand-400)" : "var(--color-text-primary)" }}>
                      {cat.name}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Step 2: Product Details ── */}
        {step === "product" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
              <h2 style={{ fontWeight: 700, margin: 0 }}>Describe the Problem</h2>
              {selectedCategory && (
                <span style={{ fontSize: "0.8125rem", color: "var(--color-brand-400)", background: "rgba(16, 185, 129, 0.1)", padding: "0.2rem 0.6rem", borderRadius: "999px", fontWeight: 600 }}>
                  Selected: {selectedCategory.name}
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="label">Brand</label>
                <input
                  className="input"
                  placeholder="e.g. Samsung, LG, Apple, Sony"
                  value={brand}
                  onChange={(e) => {
                    setBrand(e.target.value)
                    if (aiDiagnosis) setIsDiagnosisStale(true)
                  }}
                />
              </div>
              <div>
                <label className="label">Model</label>
                <input
                  className="input"
                  placeholder="e.g. Galaxy S21, iPhone 14, Bravia 55"
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value)
                    if (aiDiagnosis) setIsDiagnosisStale(true)
                  }}
                />
              </div>
            </div>

            <div>
              <label className="label">Describe the Issue <span style={{ color: "#ef4444" }}>*</span></label>
              <textarea
                className="input"
                style={{ minHeight: 100, resize: "vertical" }}
                placeholder="What's wrong? e.g. Screen cracked, not turning on, unusual noise, water leakage..."
                value={issueDescription}
                onChange={(e) => {
                  setIssueDescription(e.target.value)
                  if (aiDiagnosis) setIsDiagnosisStale(true)
                }}
                required
              />
            </div>

            {/* Photo & Video upload */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
                <label className="label" style={{ margin: 0 }}>Device Photos & Videos</label>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  {uploadedItems.length} file{uploadedItems.length === 1 ? "" : "s"} attached
                </span>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed var(--color-surface-300)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.75rem 1.5rem",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: "var(--color-surface-100)",
                }}
              >
                <Upload size={28} style={{ color: "var(--color-brand-400)", marginBottom: "0.5rem" }} />
                <div style={{ fontWeight: 600, marginBottom: "0.25rem", color: "var(--color-text-primary)" }}>
                  Upload damage photos or videos
                </div>
                <div style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                  Click or drag files here (PNG, JPG, WebP, MP4) • Max 15MB each
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFilesSelected}
                />
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleReplaceFileSelected}
                />
              </div>

              {/* Uploaded Media Cards with Individual Match Assessment */}
              {uploadedItems.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                  {uploadedItems.map((item) => {
                    const val = item.validation
                    const isMismatch = val?.status === "wrong_category" || val?.status === "unrelated_image"
                    const isValid = val?.status === "valid_match"
                    const isLowQuality = val?.status === "insufficient_evidence" || val?.status === "unreadable_image"

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          padding: "0.75rem 1rem",
                          borderRadius: "var(--radius-lg)",
                          background: isMismatch
                            ? "rgba(239, 68, 68, 0.08)"
                            : isValid
                            ? "rgba(16, 185, 129, 0.06)"
                            : "var(--color-surface-100)",
                          border: `1.5px solid ${
                            isMismatch
                              ? "rgba(239, 68, 68, 0.35)"
                              : isValid
                              ? "rgba(16, 185, 129, 0.25)"
                              : "var(--color-surface-200)"
                          }`,
                          transition: "all 0.2s",
                        }}
                      >
                        {/* Thumbnail */}
                        <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0, borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--color-surface-200)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {item.isVideo ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: "var(--color-text-muted)" }}>
                              <Video size={24} />
                              <span style={{ fontSize: "0.625rem", fontWeight: 600 }}>VIDEO</span>
                            </div>
                          ) : (
                            <img src={item.previewUrl} alt={item.file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          )}
                        </div>

                        {/* Info and Validation Status */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "220px" }}>
                              {item.file.name}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                              ({(item.file.size / 1024 / 1024).toFixed(1)} MB)
                            </span>

                            {/* Validation Badge */}
                            {val ? (
                              <span style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                padding: "0.15rem 0.55rem",
                                borderRadius: "999px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                background: isValid
                                  ? "rgba(16, 185, 129, 0.15)"
                                  : isMismatch
                                  ? "rgba(239, 68, 68, 0.15)"
                                  : isLowQuality
                                  ? "rgba(156, 163, 175, 0.15)"
                                  : "rgba(245, 158, 11, 0.15)",
                                color: isValid
                                  ? "#34d399"
                                  : isMismatch
                                  ? "#f87171"
                                  : isLowQuality
                                  ? "#9ca3af"
                                  : "#fbbf24",
                              }}>
                                {isValid ? <CheckCircle2 size={11} /> : isMismatch ? <AlertTriangle size={11} /> : <Info size={11} />}
                                {isValid
                                  ? `Valid ${val.apparent_category || "Device"}`
                                  : val.status === "wrong_category"
                                  ? `Mismatch: Appears as ${val.apparent_category}`
                                  : val.status === "unrelated_image"
                                  ? `Unrelated: ${val.apparent_device_type || "Non-device"}`
                                  : val.status === "insufficient_evidence"
                                  ? "Unclear Image"
                                  : "Needs Review"}
                              </span>
                            ) : (
                              <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                                Ready for AI analysis
                              </span>
                            )}
                          </div>

                          {/* Detailed Explanation / Visual Assessment */}
                          {val && (
                            <div style={{ fontSize: "0.78125rem", color: isMismatch ? "#f87171" : "var(--color-text-secondary)", lineHeight: 1.4 }}>
                              {val.explanation}
                              {!val.is_fault_visually_verifiable && isValid && (
                                <span style={{ display: "block", color: "var(--color-text-muted)", fontSize: "0.71875rem", marginTop: "0.15rem" }}>
                                  🔍 Reported defect is internal/functional — physical technician test required.
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions: Replace / Remove */}
                        <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}>
                          {!item.isVideo && (
                            <button
                              type="button"
                              onClick={() => triggerReplace(item.id)}
                              className="btn btn-secondary btn-sm"
                              title="Replace with another photo"
                              style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                            >
                              <RefreshCw size={12} style={{ marginRight: "0.25rem" }} />
                              Replace
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="btn btn-secondary btn-sm"
                            title="Remove photo"
                            style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem", color: "#f87171" }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Blocking Mismatch Banner */}
              {aiDiagnosis?.has_blocking_mismatch && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "1rem 1.25rem",
                    borderRadius: "var(--radius-lg)",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1.5px solid rgba(239, 68, 68, 0.35)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.875rem",
                  }}
                >
                  <AlertTriangle size={22} style={{ color: "#ef4444", flexShrink: 0, marginTop: "0.125rem" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#f87171", marginBottom: "0.25rem" }}>
                      Photo & Category Mismatch Detected
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", lineHeight: 1.5, marginBottom: "0.5rem" }}>
                      {aiDiagnosis.blocking_reason ||
                        "One or more uploaded images depict a device or item that does not match your selected product category. To ensure accurate diagnosis and pricing, please replace or remove the mismatched photo."}
                    </div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#fca5a5" }}>
                      ⚠️ You must replace or remove mismatched photos before booking can proceed to technician selection.
                    </div>
                  </div>
                </div>
              )}

              {/* Stale Diagnosis Notice */}
              {isDiagnosisStale && aiDiagnosis && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.625rem 1rem",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    fontSize: "0.8125rem",
                    color: "#fbbf24",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <RefreshCw size={14} />
                    <span>Inputs or photos have changed. Re-run AI diagnosis to update the diagnostic report.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAiDiagnosis}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}
                  >
                    Update Report
                  </button>
                </div>
              )}

              {/* AI Diagnosis Action Banner */}
              <div style={{ marginTop: "1.25rem", padding: "1rem", borderRadius: "var(--radius-lg)", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.15)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-brand-400)" }}>
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--color-text-primary)" }}>
                        AI Defect Diagnosis & Estimation
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        Analyzes reported symptoms and visual evidence to estimate components, cost, and time
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleAiDiagnosis}
                    disabled={diagnosisLoading || (!issueDescription.trim() && uploadedItems.length === 0)}
                    style={{ gap: "0.5rem", padding: "0.4rem 1rem", fontSize: "0.8125rem" }}
                  >
                    {diagnosisLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {diagnosisLoading ? "Analyzing with Vision AI…" : aiDiagnosis ? "Re-diagnose" : "Run AI Diagnosis"}
                  </button>
                </div>

                {/* AI diagnosis results card */}
                {aiDiagnosis && (
                  <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(16, 185, 129, 0.12)" }}>
                    {/* Header with severity */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontWeight: 700, fontSize: "0.875rem", color: "var(--color-brand-400)" }}>
                        <CheckCircle2 size={15} /> Preliminary Diagnostic Assessment ({selectedCategory?.name})
                      </div>
                      {aiDiagnosis.severity && (
                        <span style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.6rem",
                          borderRadius: "999px",
                          background:
                            aiDiagnosis.severity === "Critical" ? "rgba(239, 68, 68, 0.15)" :
                            aiDiagnosis.severity === "High" ? "rgba(245, 158, 11, 0.15)" :
                            "rgba(16, 185, 129, 0.15)",
                          color:
                            aiDiagnosis.severity === "Critical" ? "#f87171" :
                            aiDiagnosis.severity === "High" ? "#fbbf24" :
                            "#34d399",
                          border: `1px solid ${
                            aiDiagnosis.severity === "Critical" ? "rgba(239, 68, 68, 0.3)" :
                            aiDiagnosis.severity === "High" ? "rgba(245, 158, 11, 0.3)" :
                            "rgba(16, 185, 129, 0.3)"
                          }`,
                        }}>
                          {aiDiagnosis.severity} Severity
                        </span>
                      )}
                    </div>

                    {/* Summary */}
                    {aiDiagnosis.summary && (
                      <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", marginBottom: "0.875rem", lineHeight: 1.5 }}>
                        {aiDiagnosis.summary}
                      </p>
                    )}

                    {/* Defect Findings (Qualitative Evidence - NO fabricated percentages) */}
                    {aiDiagnosis.defects && aiDiagnosis.defects.length > 0 && (
                      <div style={{ marginBottom: "1rem" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                          Identified Faults & Evidence
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {aiDiagnosis.defects.map((defect, i) => {
                            const isConfirmed = defect.status_label === "Confirmed by Image"
                            const isProbable = defect.status_label === "Probable Cause"
                            const isTestNeeded = defect.status_label === "Requires Physical Test"

                            return (
                              <div
                                key={i}
                                style={{
                                  background: "var(--color-surface-100)",
                                  borderRadius: "var(--radius-md)",
                                  padding: "0.625rem 0.875rem",
                                  border: "1px solid var(--color-surface-200)",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
                                  <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--color-text-primary)" }}>
                                    {defect.title}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      fontWeight: 700,
                                      padding: "0.15rem 0.5rem",
                                      borderRadius: "999px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                      background: isConfirmed
                                        ? "rgba(16, 185, 129, 0.15)"
                                        : isProbable
                                        ? "rgba(59, 130, 246, 0.15)"
                                        : isTestNeeded
                                        ? "rgba(168, 85, 247, 0.15)"
                                        : "rgba(245, 158, 11, 0.15)",
                                      color: isConfirmed
                                        ? "#34d399"
                                        : isProbable
                                        ? "#60a5fa"
                                        : isTestNeeded
                                        ? "#c084fc"
                                        : "#fbbf24",
                                    }}
                                  >
                                    {isConfirmed ? <CheckCircle2 size={11} /> : isProbable ? <Wrench size={11} /> : isTestNeeded ? <Cpu size={11} /> : <AlertTriangle size={11} />}
                                    {defect.status_label}
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                                  {defect.description}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Estimates Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                      <div style={{ background: "var(--color-surface-100)", padding: "0.75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-200)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                          <IndianRupee size={13} style={{ color: "#34d399" }} /> Est. Repair Cost
                        </div>
                        <div style={{ fontWeight: 800, fontSize: "1rem", color: "#34d399" }}>
                          {aiDiagnosis.repair_estimate?.cost_range || aiDiagnosis.estimated_cost_range || "Cost requires technician inspection"}
                        </div>
                        <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                          {aiDiagnosis.repair_estimate?.pricing_note || "Preliminary estimate • Final quote after bench inspection"}
                        </div>
                      </div>

                      <div style={{ background: "var(--color-surface-100)", padding: "0.75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-200)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
                          <Clock size={13} style={{ color: "#60a5fa" }} /> Est. Turnaround
                        </div>
                        <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--color-text-primary)" }}>
                          {aiDiagnosis.repair_estimate?.turnaround_time || aiDiagnosis.turnaround_estimate || "1 - 2 business days"}
                        </div>
                        {aiDiagnosis.repair_estimate?.labor_time && (
                          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                            Hands-on bench time: ~{aiDiagnosis.repair_estimate.labor_time}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recommended Procedure */}
                    {(aiDiagnosis.recommended_procedure || aiDiagnosis.recommended_action) && (
                      <div style={{ background: "rgba(59, 130, 246, 0.06)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "var(--radius-md)", padding: "0.75rem", marginBottom: "0.875rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", fontWeight: 700, color: "#60a5fa", marginBottom: "0.25rem" }}>
                          <Wrench size={13} /> Recommended Repair Procedure
                        </div>
                        <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                          {aiDiagnosis.recommended_procedure || aiDiagnosis.recommended_action}
                        </div>
                      </div>
                    )}

                    {/* Follow-up Diagnostic Questions */}
                    {aiDiagnosis.follow_up_questions && aiDiagnosis.follow_up_questions.length > 0 && (
                      <div style={{ background: "rgba(168, 85, 247, 0.06)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: "var(--radius-md)", padding: "0.75rem", marginBottom: "0.875rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", fontWeight: 700, color: "#c084fc", marginBottom: "0.25rem" }}>
                          <HelpCircle size={13} /> Technician Diagnostic Checklist
                        </div>
                        <ul style={{ paddingLeft: "1.25rem", margin: 0, fontSize: "0.78125rem", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                          {aiDiagnosis.follow_up_questions.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Pre-service Tips */}
                    {((aiDiagnosis.pre_service_tips && aiDiagnosis.pre_service_tips.length > 0) || (aiDiagnosis.tips && aiDiagnosis.tips.length > 0)) && (
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontWeight: 600, color: "#fbbf24", marginBottom: "0.25rem" }}>
                          <Lightbulb size={12} /> Pre-handover Recommendations:
                        </div>
                        <ul style={{ paddingLeft: "1.25rem", margin: 0, lineHeight: 1.4 }}>
                          {(aiDiagnosis.pre_service_tips || aiDiagnosis.tips || []).map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Provider Selection ── */}
        {step === "providers" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: "1.375rem", marginBottom: "0.25rem" }}>Choose a Verified Technician</h2>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                  Showing authorized repair centers within <strong>{searchRadiusKm} km</strong> of your selected location.
                </p>
              </div>

              {/* Service Type Filter Chips */}
              <div style={{ display: "flex", gap: "0.375rem", background: "var(--color-surface-100)", padding: "0.25rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-surface-200)" }}>
                {[
                  { id: "all", label: "All Providers" },
                  { id: "doorstep", label: "🏠 Doorstep" },
                  { id: "in_store", label: "🏢 In-Store" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setServiceTypeFilter(tab.id as any)}
                    style={{
                      padding: "0.375rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      border: "none",
                      background: serviceTypeFilter === tab.id ? "var(--color-brand-500)" : "transparent",
                      color: serviceTypeFilter === tab.id ? "white" : "var(--color-text-secondary)",
                      fontSize: "0.75rem",
                      fontWeight: serviceTypeFilter === tab.id ? 700 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location Actions Bar */}
            <div
              style={{
                background: "var(--color-surface-100)",
                border: "1px solid var(--color-surface-200)",
                borderRadius: "var(--radius-xl)",
                padding: "1rem 1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                {/* Use My Location Button */}
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.875rem",
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    flexShrink: 0,
                  }}
                >
                  {isLocating ? <Loader2 size={15} className="animate-spin" /> : <Locate size={15} style={{ color: "var(--color-brand-400)" }} />}
                  {isLocating ? "Acquiring GPS…" : "Use My Current Location"}
                </button>

                {/* Manual Search Form */}
                <form
                  onSubmit={handleSearchAddress}
                  style={{ flex: 1, display: "flex", gap: "0.5rem", minWidth: "260px" }}
                >
                  <div style={{ position: "relative", flex: 1 }}>
                    <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
                    <input
                      type="text"
                      className="form-input form-input-sm"
                      placeholder="Search locality, street, city or PIN code..."
                      value={searchLocationInput}
                      onChange={(e) => setSearchLocationInput(e.target.value)}
                      style={{ paddingLeft: "2.25rem", width: "100%", fontSize: "0.8125rem" }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingGeocode || !searchLocationInput.trim()}
                    className="btn btn-primary btn-sm"
                    style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
                  >
                    {isSearchingGeocode ? <Loader2 size={14} className="animate-spin" /> : "Search"}
                  </button>
                </form>

                {/* Search Radius Dropdown */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600 }}>Radius:</span>
                  <select
                    value={searchRadiusKm}
                    onChange={(e) => {
                      const r = Number(e.target.value)
                      setSearchRadiusKm(r)
                      if (selectedCategory) {
                        loadProviders(selectedCategory.id, customerCoords, r)
                      }
                    }}
                    className="form-input form-input-sm"
                    style={{ fontSize: "0.75rem", padding: "0.4rem 0.6rem", width: "85px" }}
                  >
                    <option value={10}>10 km</option>
                    <option value={15}>15 km</option>
                    <option value={25}>25 km</option>
                    <option value={50}>50 km</option>
                    <option value={100}>100 km</option>
                  </select>
                </div>
              </div>

              {/* Selected location feedback pill */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: hasLiveLocation ? "#10b981" : "#fbbf24",
                      boxShadow: hasLiveLocation ? "0 0 8px #10b981" : "none",
                      flexShrink: 0,
                    }}
                  />
                  <span>
                    {hasLiveLocation ? "Your Current Location: " : "Area: "}
                    <strong>{customerAddress ? customerAddress.split(",").slice(0, 3).join(",") : isLocating ? "Acquiring your location..." : "Locating..."}</strong>
                    {" "}({customerCoords.lat.toFixed(4)}, {customerCoords.lng.toFixed(4)})
                  </span>
                </div>
                {locationPermissionDenied ? (
                  <span style={{ color: "#fbbf24", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    ⚠️ Device GPS disabled. Search locality or drag the map.
                  </span>
                ) : hasLiveLocation ? (
                  <span style={{ color: "var(--color-brand-400)", fontWeight: 600 }}>
                    ✓ Live GPS Active
                  </span>
                ) : null}
              </div>
            </div>

            {/* Interactive Leaflet Map */}
            <div style={{ position: "relative" }}>
              <CustomerProviderMap
                customerLocation={customerCoords}
                providers={providers
                  .filter((p) => {
                    if (serviceTypeFilter === "doorstep") return p.doorstep_available
                    if (serviceTypeFilter === "in_store") return true
                    return true
                  })
                  .map((p: any) => ({
                    id: p.id,
                    business_name: p.business_name,
                    address: p.address,
                    distance_km: p.distance_km,
                    rating_avg: p.rating_avg,
                    total_reviews: p.total_reviews,
                    doorstep_available: p.doorstep_available,
                    lat: p.lat,
                    lng: p.lng,
                    is_selected: selectedProvider?.id === p.id,
                  }))}
                selectedProviderId={selectedProvider?.id || null}
                onSelectProvider={(id) => {
                  const found = providers.find((p) => p.id === id)
                  if (found) setSelectedProvider(found)
                }}
                onSearchArea={handleMapSearchArea}
                radiusKm={searchRadiusKm}
                height="380px"
              />
            </div>

            {/* Provider Cards or Empty State */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 1rem", color: "var(--color-brand-500)" }} />
                <div style={{ fontWeight: 600 }}>Scanning area for verified technicians…</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                  Calculating distance and service coverage within {searchRadiusKm} km
                </div>
              </div>
            ) : providers.filter((p) => {
                if (serviceTypeFilter === "doorstep") return p.doorstep_available
                if (serviceTypeFilter === "in_store") return true
                return true
              }).length === 0 ? (
              <div className="card" style={{ padding: "3rem 2rem", textAlign: "center" }}>
                <MapPin size={40} style={{ color: "var(--color-text-muted)", margin: "0 auto 1rem" }} />
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                  No verified technicians found in this area.
                </h3>
                <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", maxWidth: "500px", margin: "0 auto 1.5rem", lineHeight: 1.5 }}>
                  We couldn&apos;t find approved repair centers for <strong>{selectedCategory?.name || "this category"}</strong> within {searchRadiusKm} km of your selected location.
                </p>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => handleExpandRadius(25)}
                    className="btn btn-secondary btn-sm"
                  >
                    Expand Radius (+25 km)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExpandRadius(50)}
                    className="btn btn-secondary btn-sm"
                  >
                    Expand Radius (+50 km)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchLocationInput("")
                      toast("Enter a new locality or city name in the search bar above.")
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    Enter Another PIN Code
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>
                    Found <strong>{providers.filter((p) => {
                      if (serviceTypeFilter === "doorstep") return p.doorstep_available
                      if (serviceTypeFilter === "in_store") return true
                      return true
                    }).length}</strong> verified technicians near you
                  </span>
                  <span>Click a card or map pin to select</span>
                </div>

                {providers
                  .filter((p) => {
                    if (serviceTypeFilter === "doorstep") return p.doorstep_available
                    if (serviceTypeFilter === "in_store") return true
                    return true
                  })
                  .map((p: any) => {
                    const isSelected = selectedProvider?.id === p.id
                    const openStatus = p.open_status || isCurrentlyOpen(p.working_hours)

                    return (
                      <div
                        key={p.id}
                        id={`provider-${p.id}`}
                        onClick={() => setSelectedProvider(p)}
                        style={{
                          background: isSelected ? "rgba(16, 185, 129, 0.08)" : "var(--color-surface-100)",
                          border: `2px solid ${isSelected ? "var(--color-brand-500)" : "var(--color-surface-200)"}`,
                          borderRadius: "var(--radius-xl)",
                          padding: "1.25rem 1.5rem",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          boxShadow: isSelected ? "0 4px 20px rgba(16, 185, 129, 0.15)" : "none",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                          <div style={{ flex: 1 }}>
                            {/* Business name + Verified Badge */}
                            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap", marginBottom: "0.375rem" }}>
                              <span style={{ fontWeight: 800, fontSize: "1.0625rem", color: "var(--color-text-primary)" }}>
                                {p.business_name}
                              </span>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  background: "rgba(16, 185, 129, 0.15)",
                                  color: "var(--color-brand-400)",
                                  padding: "0.15rem 0.5rem",
                                  borderRadius: "999px",
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  border: "1px solid rgba(16, 185, 129, 0.3)",
                                }}
                              >
                                <ShieldCheck size={12} /> Verified
                              </span>

                              {/* Live Availability Badge */}
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                  padding: "0.15rem 0.5rem",
                                  borderRadius: "999px",
                                  background: openStatus?.isOpen ? "rgba(16, 185, 129, 0.12)" : "rgba(148, 163, 184, 0.12)",
                                  color: openStatus?.isOpen ? "#34d399" : "#94a3b8",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                }}
                              >
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: openStatus?.isOpen ? "#10b981" : "#64748b" }} />
                                {openStatus?.label || "Open Today"}
                              </span>
                            </div>

                            {/* Description / Specialization */}
                            {p.description && (
                              <p style={{ margin: "0 0 0.625rem", color: "var(--color-text-secondary)", fontSize: "0.8125rem", lineHeight: 1.4 }}>
                                {p.description.slice(0, 120)}
                              </p>
                            )}

                            {/* Metadata Pills: Distance, Rating, Service Options */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontWeight: 700, color: "var(--color-brand-400)" }}>
                                <Navigation size={13} />
                                {p.distance_km != null ? `${p.distance_km} km away` : "Nearby"}
                              </span>

                              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                <Star size={13} style={{ color: "#fbbf24" }} />
                                <strong style={{ color: "var(--color-text-primary)" }}>{(p.rating_avg || 4.8).toFixed(1)}</strong> ({p.total_reviews || 0} reviews)
                              </span>

                              {p.doorstep_available && (
                                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#60a5fa" }}>
                                  <Home size={13} /> Doorstep Repair
                                </span>
                              )}

                              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--color-text-secondary)" }}>
                                <Building size={13} /> Workshop Drop-off
                              </span>

                              {p.address && (
                                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--color-text-muted)" }}>
                                  📍 {p.address.slice(0, 45)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Selection indicator & Price */}
                          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Inspection From</div>
                            <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--color-brand-400)" }}>₹199</div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedProvider(p)
                              }}
                              className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-secondary"}`}
                              style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
                            >
                              {isSelected ? (
                                <>
                                  <Check size={14} /> Selected
                                </>
                              ) : (
                                "Choose Technician"
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Schedule ── */}
        {step === "schedule" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <h2 style={{ fontWeight: 800, fontSize: "1.375rem", marginBottom: "0.25rem" }}>Confirm & Schedule Your Repair</h2>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                Review workshop details and select how you would like your repair completed.
              </p>
            </div>

            {/* Selected Workshop / Store Details Card */}
            {selectedProvider && (
              <div
                style={{
                  background: "var(--color-surface-100)",
                  border: "2px solid var(--color-brand-500)",
                  borderRadius: "var(--radius-xl)",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.875rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                      <Building size={18} style={{ color: "var(--color-brand-400)" }} />
                      <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--color-text-primary)" }}>
                        {selectedProvider.business_name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "999px",
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#34d399",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                        }}
                      >
                        Verified Workshop
                      </span>
                    </div>

                    {selectedProvider.address && (
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <MapPin size={14} style={{ color: "var(--color-brand-400)", flexShrink: 0 }} />
                        <span>{selectedProvider.address}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    {selectedProvider.distance_km != null && (
                      <span
                        style={{
                          fontSize: "0.8125rem",
                          fontWeight: 700,
                          color: "var(--color-brand-400)",
                          background: "rgba(16, 185, 129, 0.12)",
                          padding: "0.25rem 0.625rem",
                          borderRadius: "var(--radius-md)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        <Navigation size={12} /> {selectedProvider.distance_km} km away
                      </span>
                    )}
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem", fontWeight: 700 }}>
                      <Star size={14} style={{ color: "#fbbf24" }} />
                      {(selectedProvider.rating_avg || 4.8).toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Service Type Guidance Callout */}
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-lg)",
                    background: serviceType === "in_store" ? "rgba(16, 185, 129, 0.08)" : "rgba(59, 130, 246, 0.08)",
                    border: `1px solid ${serviceType === "in_store" ? "rgba(16, 185, 129, 0.2)" : "rgba(59, 130, 246, 0.2)"}`,
                    fontSize: "0.8125rem",
                    color: "var(--color-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.625rem",
                  }}
                >
                  {serviceType === "in_store" ? (
                    <>
                      <Building size={16} style={{ color: "var(--color-brand-400)", flexShrink: 0 }} />
                      <span>
                        <strong>Workshop Drop-off:</strong> Please visit <strong>{selectedProvider.business_name}</strong> at the workshop address above during open hours. Inspection begins immediately upon drop-off.
                      </span>
                    </>
                  ) : serviceType === "doorstep" ? (
                    <>
                      <Home size={16} style={{ color: "#60a5fa", flexShrink: 0 }} />
                      <span>
                        <strong>Doorstep Repair:</strong> A certified technician from <strong>{selectedProvider.business_name}</strong> will visit your address to repair your device on site.
                      </span>
                    </>
                  ) : (
                    <>
                      <Truck size={16} style={{ color: "#c084fc", flexShrink: 0 }} />
                      <span>
                        <strong>Device Pickup:</strong> An EcoFix delivery partner will collect your device from your address and transport it safely to <strong>{selectedProvider.business_name}</strong>.
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Service option */}
            <div>
              <label className="label">Select Service Option</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                {[
                  { value: "in_store", label: "In Store Drop-off", icon: Building, desc: "Visit workshop" },
                  { value: "pickup",   label: "Device Pickup",    icon: Truck,    desc: "Courier collection" },
                  {
                    value: "doorstep",
                    label: "Doorstep Repair",
                    icon: Home,
                    desc: selectedProvider?.doorstep_available ? "Technician visits you" : "Workshop only",
                    disabled: Boolean(selectedProvider && !selectedProvider.doorstep_available),
                  },
                ].map(({ value, label, icon: Icon, desc, disabled }) => {
                  const sel = serviceType === value
                  return (
                    <button
                      key={value}
                      id={`service-${value}`}
                      type="button"
                      disabled={Boolean(disabled)}
                      onClick={() => !disabled && setServiceType(value as typeof serviceType)}
                      style={{
                        padding: "0.875rem 0.75rem",
                        textAlign: "center",
                        background: sel ? "rgba(16,185,129,0.12)" : "var(--color-surface-100)",
                        border: `2px solid ${sel ? "var(--color-brand-500)" : "var(--color-surface-200)"}`,
                        borderRadius: "var(--radius-lg)",
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.45 : 1,
                        transition: "all 0.2s",
                      }}
                    >
                      <Icon size={20} color={sel ? "var(--color-brand-400)" : "var(--color-text-muted)"} style={{ margin: "0 auto 0.375rem" }} />
                      <div style={{ fontWeight: 600, fontSize: "0.8125rem", color: sel ? "var(--color-brand-400)" : "var(--color-text-primary)" }}>{label}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "0.15rem" }}>{desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Address (for doorstep/pickup) */}
            {serviceType !== "in_store" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
                  <label className="label" style={{ margin: 0 }}>Your Service Address</label>
                  {customerAddress && (
                    <span style={{ fontSize: "0.75rem", color: "var(--color-brand-400)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <MapPin size={12} /> Auto-filled from your location
                    </span>
                  )}
                </div>
                <textarea
                  className="input"
                  style={{ resize: "vertical", minHeight: 80 }}
                  placeholder="Enter your flat/house number, street, locality, city and PIN code"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Customer Contact Verification */}
            <div
              style={{
                background: "var(--color-surface-100)",
                border: "1px solid var(--color-surface-200)",
                borderRadius: "var(--radius-xl)",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Phone size={16} style={{ color: "var(--color-brand-400)" }} />
                <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Customer Contact Details</span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  (Required for technician coordination)
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label className="label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Your Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Full Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    Contact Phone Number <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="10-digit mobile number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Preferred Appointment Date & Time */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label className="label" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <Calendar size={15} style={{ color: "var(--color-brand-400)" }} />
                  Preferred Appointment Date & Time <span style={{ color: "#ef4444" }}>*</span>
                </label>
                {scheduledAt && (
                  <span style={{ fontSize: "0.75rem", color: "var(--color-brand-400)", fontWeight: 700 }}>
                    ✓ {new Date(scheduledAt).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })} at {new Date(scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>

              {/* Quick slots pills */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                {getQuickSlots().map((slot) => {
                  const isSlotActive = selectedQuickSlot === slot.id || scheduledAt === slot.iso
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => {
                        setSelectedQuickSlot(slot.id)
                        setScheduledAt(slot.iso)
                      }}
                      style={{
                        padding: "0.45rem 0.85rem",
                        borderRadius: "var(--radius-md)",
                        border: isSlotActive ? "1.5px solid var(--color-brand-500)" : "1px solid var(--color-surface-200)",
                        background: isSlotActive ? "rgba(16, 185, 129, 0.15)" : "var(--color-surface-100)",
                        color: isSlotActive ? "var(--color-brand-400)" : "var(--color-text-primary)",
                        fontSize: "0.8125rem",
                        fontWeight: isSlotActive ? 700 : 500,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: "0.1rem",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{slot.label}</span>
                      <span style={{ fontSize: "0.6875rem", color: isSlotActive ? "var(--color-brand-400)" : "var(--color-text-muted)" }}>
                        {slot.desc}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Custom Date & Time Picker */}
              <input
                className="input"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => {
                  setScheduledAt(e.target.value)
                  setSelectedQuickSlot("custom")
                }}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>

            {/* Special Instructions / Notes */}
            <div>
              <label className="label" style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <FileText size={14} style={{ color: "var(--color-text-muted)" }} />
                Special Instructions or Notes (Optional)
              </label>
              <textarea
                className="input"
                style={{ resize: "vertical", minHeight: 65 }}
                placeholder="Any special remarks for the technician (e.g. backup status, landmark, gate code)..."
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
              />
            </div>

            {/* Complete Detailed Booking Summary Card */}
            <div className="glass-brand" style={{ borderRadius: "var(--radius-xl)", padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--color-brand-400)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <CheckCircle2 size={18} /> Complete Booking Details
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Step 4 of 4
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.875rem", fontSize: "0.875rem" }}>
                {/* 1. Device & Issue */}
                <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: "var(--radius-md)", padding: "0.875rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>
                    Device & Reported Issue
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>
                      {brand || ""} {model || ""} {(!brand && !model) ? selectedCategory?.name : `(${selectedCategory?.name})`}
                    </span>
                    {uploadedItems.length > 0 && (
                      <span style={{ fontSize: "0.75rem", color: "var(--color-brand-400)", fontWeight: 600 }}>
                        📷 {uploadedItems.length} media item{uploadedItems.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                    &ldquo;{issueDescription}&rdquo;
                  </div>
                  {aiDiagnosis?.estimated_cost_range && (
                    <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--color-brand-400)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span>✨ AI Estimate: {aiDiagnosis.estimated_cost_range}</span>
                      {aiDiagnosis.turnaround_estimate && <span>• {aiDiagnosis.turnaround_estimate}</span>}
                    </div>
                  )}
                </div>

                {/* 2. Assigned Workshop & Service Mode */}
                <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: "var(--radius-md)", padding: "0.875rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>
                    Selected Workshop & Service Mode
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>
                      {selectedProvider?.business_name}
                    </span>
                    {selectedProvider?.distance_km != null && (
                      <span style={{ fontWeight: 700, color: "var(--color-brand-400)" }}>
                        📍 {selectedProvider.distance_km} km away
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
                    <strong>Service Option:</strong> {serviceType === "in_store" ? "In-Store Workshop Drop-off" : serviceType === "doorstep" ? "Doorstep Service" : "Device Pickup"}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                    {serviceType === "in_store" ? (
                      <>Drop-off Workshop Address: <strong>{selectedProvider?.address || "At workshop"}</strong></>
                    ) : (
                      <>Service Address: <strong>{customerAddress || "Your location"}</strong></>
                    )}
                  </div>
                </div>

                {/* 3. Appointment Slot & Customer Contact */}
                <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: "var(--radius-md)", padding: "0.875rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>
                    Schedule & Contact Info
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>Appointment Slot:</span>
                    <span style={{ fontWeight: 700, color: scheduledAt ? "var(--color-brand-400)" : "#ef4444" }}>
                      {scheduledAt ? (
                        `${new Date(scheduledAt).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })} at ${new Date(scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                      ) : (
                        "Not selected yet"
                      )}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>Customer Contact:</span>
                    <span style={{ fontWeight: 600, color: customerPhone ? "var(--color-text-primary)" : "#ef4444" }}>
                      {customerPhone ? `${customerName || "Customer"} (${customerPhone})` : "Phone required above"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: "0.5rem" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>Initial Inspection Fee:</span>
                    <span style={{ fontWeight: 800, color: "var(--color-brand-400)", fontSize: "1rem" }}>
                      ₹199 <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>(Pay after inspection)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--color-surface-200)" }}>
          <button
            id="back-step-btn"
            className="btn btn-secondary"
            onClick={() => {
              if (stepIdx === 0) {
                router.push("/dashboard")
              } else {
                const prev = STEPS[stepIdx - 1]
                if (prev) setStep(prev)
              }
            }}
          >
            <ChevronLeft size={16} /> Back
          </button>

          {(() => {
            const isScheduleValid = Boolean(
              scheduledAt &&
              customerPhone.trim().length >= 10 &&
              (serviceType === "in_store" || customerAddress.trim().length >= 5)
            )

            let buttonLabel = "Confirm Booking"
            if (step === "schedule") {
              if (!scheduledAt) buttonLabel = "Select Date & Time"
              else if (!customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 10) buttonLabel = "Enter Phone Number"
              else if (serviceType !== "in_store" && customerAddress.trim().length < 5) buttonLabel = "Enter Service Address"
              else buttonLabel = "Confirm Booking"
            }

            return (
              <button
                id="next-step-btn"
                className="btn btn-primary btn-lg"
                onClick={nextStep}
                disabled={loading || (step === "category" && !selectedCategory) || (step === "schedule" && !isScheduleValid)}
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : step === "schedule" ? (
                  <><Check size={16} /> {buttonLabel}</>
                ) : (
                  <>Next <ChevronRight size={16} /></>
                )}
              </button>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
