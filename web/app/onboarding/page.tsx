"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  Wrench, ShieldCheck, MapPin, CheckCircle, UploadCloud,
  Sparkles, ArrowRight, Building2, Phone, Mail, FileText,
  Clock, AlertCircle, Loader2, Compass, Layers, Check
} from "lucide-react"
import toast from "react-hot-toast"

interface Category {
  id: string
  name: string
  icon_url?: string | null
}

export default function TechnicianOnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState("")

  // Form Fields
  const [businessName, setBusinessName] = useState("")
  const [contactName, setContactName] = useState("")
  const [phone, setPhone] = useState("")
  const [description, setDescription] = useState("")
  const [serviceRadiusKm, setServiceRadiusKm] = useState(15)
  const [doorstepAvailable, setDoorstepAvailable] = useState(true)
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("Bangalore")
  const [pinCode, setPinCode] = useState("560001")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // Document upload
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docFileName, setDocFileName] = useState("")
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [uploadedDocUrl, setUploadedDocUrl] = useState<string | null>(null)

  // Categories list
  const [categories, setCategories] = useState<Category[]>([])

  // Is this a resubmission (previously rejected)?
  const [isResubmission, setIsResubmission] = useState(false)
  const [existingStatus, setExistingStatus] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login?redirectTo=/onboarding")
          return
        }

        setUserId(user.id)
        setUserEmail(user.email || "")

        // Check if user already has a provider profile
        const { data: existingProfile } = await supabase
          .from("provider_profiles")
          .select("verification_status, business_name, description, categories, service_radius_km, doorstep_available, address")
          .eq("user_id", user.id)
          .maybeSingle()

        if (existingProfile) {
          const status = existingProfile.verification_status
          const isActive = (existingProfile as any).is_active !== false

          // Approved & active → no need to re-onboard
          if (status === "approved" && isActive) {
            toast.success("Your account is already approved!")
            router.push("/provider/dashboard")
            return
          }

          // Pending → show them the pending page
          if (status === "pending") {
            router.push("/provider/pending")
            return
          }

          // Rejected → allow resubmission; pre-fill existing data
          if (status === "rejected") {
            setIsResubmission(true)
            setExistingStatus("rejected")
            setBusinessName(existingProfile.business_name || "")
            setDescription(existingProfile.description || "")
            setSelectedCategories(existingProfile.categories || [])
            setServiceRadiusKm(existingProfile.service_radius_km || 15)
            setDoorstepAvailable(existingProfile.doorstep_available ?? true)
            // Pre-fill address if available
            if (existingProfile.address) setAddress(existingProfile.address)
          }
        }

        // Fetch user metadata
        const { data: userData } = await supabase
          .from("users")
          .select("name, phone, role")
          .eq("id", user.id)
          .maybeSingle()

        const defaultName = userData?.name || user.user_metadata?.name || ""
        const defaultPhone = userData?.phone || user.user_metadata?.phone || ""
        setContactName(defaultName)
        if (!businessName) {
          setBusinessName(defaultName ? `${defaultName}'s Repair Workshop` : "EcoFix Pro Repairs")
        }
        setPhone(defaultPhone)

        // Fetch available service categories
        const { data: cats } = await supabase
          .from("categories")
          .select("id, name, icon_url")
          .order("display_order", { ascending: true })

        if (cats && cats.length > 0) {
          const EXCLUDED = ["Furniture", "Fashion & Clothing", "Automotive", "Personal Accessories"]
          const filteredCats = cats.filter(c => !EXCLUDED.includes(c.name))
          setCategories(filteredCats)
          // Default select first two if no pre-fill
          if (selectedCategories.length === 0) {
            setSelectedCategories([filteredCats[0]?.id, filteredCats[1]?.id].filter(Boolean))
          }
        } else {
          setCategories([
            { id: "electronics", name: "Electronics" },
            { id: "appliances", name: "Home Appliances" },
            { id: "smartphones", name: "Smartphones & Tablets" },
            { id: "laptops", name: "Laptops & Computers" },
            { id: "electrical", name: "Electrical & Wiring" },
          ])
          if (selectedCategories.length === 0) {
            setSelectedCategories(["electronics", "appliances"])
          }
        }
      } catch (err: any) {
        console.error("Error loading onboarding state:", err)
      } finally {
        setLoading(false)
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleCategory(catId: string) {
    setSelectedCategories(prev =>
      prev.includes(catId)
        ? prev.filter(id => id !== catId)
        : [...prev, catId]
    )
  }

  // Quick 1-click fill for demo testing (fills all required fields — does NOT skip verification)
  function handleFillDemoData() {
    setBusinessName("EcoFix Apex Electronics Lab")
    setContactName("Harsha")
    setPhone("+91 98765 43210")
    setDescription("Certified service technician with 8+ years specializing in smartphone screen repairs, micro-soldering, appliance diagnostics, and eco-friendly component renewal.")
    setServiceRadiusKm(20)
    setDoorstepAvailable(true)
    setAddress("Shop 4, Commercial Plaza, 12 MG Road")
    setCity("Bangalore")
    setPinCode("560001")
    setDocFileName("Harsha_Trade_License.pdf")
    setUploadedDocUrl("https://wiueemknsjfwisxfmcox.supabase.co/storage/v1/object/public/repair-media/provider-docs/demo-license.pdf")
    if (categories.length > 0) {
      setSelectedCategories(categories.slice(0, 3).map(c => c.id))
    }
    toast.success("Pre-filled all required fields — ready to submit!")
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB")
      return
    }
    setDocFile(file)
    setDocFileName(file.name)
    setUploadedDocUrl(null) // will upload on submit
    toast.success(`Attached: ${file.name}`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) {
      toast.error("User session missing. Please sign in again.")
      router.push("/auth/login")
      return
    }

    if (!businessName.trim()) {
      toast.error("Please enter the Workshop / Business Name.")
      return
    }

    if (!contactName.trim()) {
      toast.error("Please enter the Lead Technician Name.")
      return
    }

    if (!phone.trim()) {
      toast.error("Please enter a Phone / WhatsApp Number.")
      return
    }

    if (!description.trim()) {
      toast.error("Please enter your Professional Bio & Experience.")
      return
    }

    if (selectedCategories.length === 0) {
      toast.error("Please select at least one Repair Specialization.")
      return
    }

    if (!address.trim()) {
      toast.error("Please enter your Workshop Street Address.")
      return
    }

    if (!city.trim()) {
      toast.error("Please enter your City.")
      return
    }

    if (!pinCode.trim()) {
      toast.error("Please enter your PIN Code.")
      return
    }

    if (!docFile && !uploadedDocUrl) {
      toast.error("Please upload your Trade License, Certificate, or ID document.")
      return
    }

    setSubmitting(true)

    try {
      let identityDocUrl: string | null = uploadedDocUrl

      // Upload document to Supabase Storage or convert to data URL fallback
      if (docFile && !identityDocUrl) {
        setUploadingDoc(true)
        const fileExt = docFile.name.split(".").pop() || "png"
        const filePath = `provider-docs/${userId}-${Date.now()}.${fileExt}`

        const { error: uploadErr } = await supabase.storage
          .from("repair-media")
          .upload(filePath, docFile, { upsert: true })

        if (!uploadErr) {
          const { data: publicUrlData } = supabase.storage
            .from("repair-media")
            .getPublicUrl(filePath)
          identityDocUrl = publicUrlData?.publicUrl || null
        } else {
          // If storage bucket upload fails, convert to data URL so the document is still retained
          const reader = new FileReader()
          identityDocUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(docFile)
          })
        }
        setUploadedDocUrl(identityDocUrl)
        setUploadingDoc(false)
      }

      const fullAddress = `${address.trim()}, ${city.trim()} - ${pinCode.trim()}`

      // Submit to our secure API route (NOT directly to Supabase)
      const response = await fetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          contactName: contactName.trim(),
          phone: phone.trim(),
          description: description.trim(),
          categories: selectedCategories,
          serviceRadiusKm,
          doorstepAvailable,
          address: fullAddress,
          identityDocUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Submission failed")
      }

      toast.success(
        isResubmission
          ? "✅ Application resubmitted! Our team will review your updated information."
          : "📋 Application submitted! You'll receive access once an admin approves your account."
      )

      // Always go to the pending page — admin must approve before dashboard access
      router.push("/provider/pending")
      router.refresh()
    } catch (err: any) {
      console.error("Onboarding submission failed:", err)
      toast.error(err.message || "Failed to complete onboarding. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-surface-0)" }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 className="animate-spin" size={40} style={{ color: "var(--color-brand-500)", margin: "0 auto 1rem" }} />
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9375rem" }}>Preparing onboarding portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface-0)", padding: "2.5rem 1rem" }}>
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        
        {/* Header Banner */}
        <div style={{
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 78, 59, 0.3))",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          borderRadius: "var(--radius-lg)",
          padding: "2rem",
          marginBottom: "2rem",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(16, 185, 129, 0.2)", padding: "0.375rem 0.75rem", borderRadius: "9999px", color: "var(--color-brand-400)", fontSize: "0.8125rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                <Sparkles size={14} /> EcoFix Partner Network
              </div>
              <h1 style={{ fontSize: "1.875rem", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>
                {isResubmission ? "Update & Resubmit Application" : "Technician & Provider Onboarding"}
              </h1>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9375rem", maxWidth: 560, lineHeight: 1.5 }}>
                {isResubmission
                  ? "Update your application with the requested corrections and resubmit for admin review."
                  : "Join our certified circular repair platform. Setup your workshop profile, define service radius, and start receiving verified customer repair jobs."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleFillDemoData}
              className="btn btn-outline"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8125rem",
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-md)",
                borderColor: "rgba(16, 185, 129, 0.4)",
                color: "var(--color-brand-400)"
              }}
              title="Click to automatically fill realistic technician credentials"
            >
              <Sparkles size={14} /> Quick Demo Fill
            </button>
          </div>
        </div>

        {/* Verification info notice */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.75rem",
          background: "rgba(251, 191, 36, 0.06)",
          border: "1px solid rgba(251, 191, 36, 0.2)",
          borderRadius: "var(--radius-md)",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
        }}>
          <Clock size={18} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", lineHeight: 1.55 }}>
            <strong style={{ color: "#fbbf24" }}>Admin verification required.</strong>{" "}
            After submitting, your application will be reviewed by the EcoFix admin team before you can access the Technician Dashboard.
            This typically takes 1–2 business days.
          </div>
        </div>

        {/* Onboarding Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* 1. Business & Contact Information */}
          <div className="card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.25rem" }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-brand-400)" }}>
                <Building2 size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  Workshop &amp; Contact Information
                </h2>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                  How customers and the EcoFix dispatch team identify your service center
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label className="label">Workshop / Business Name *</label>
                <input
                  type="text"
                  name="businessName"
                  required
                  className="input"
                  placeholder="e.g. Precision Device Care"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Lead Technician Name *</label>
                <input
                  type="text"
                  name="contactName"
                  required
                  className="input"
                  placeholder="e.g. Alex Morgan"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label className="label">Phone / WhatsApp Number *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  className="input"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Registered Email</label>
                <input
                  type="email"
                  name="userEmail"
                  disabled
                  className="input"
                  value={userEmail}
                  style={{ opacity: 0.7, cursor: "not-allowed" }}
                />
              </div>
            </div>

            <div>
              <label className="label">Professional Bio &amp; Experience *</label>
              <textarea
                name="description"
                required
                className="input"
                rows={3}
                placeholder="Highlight your diagnostic tools, certifications, warranty guarantee, and years in the industry..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ resize: "vertical", minHeight: 80 }}
              />
            </div>
          </div>

          {/* 2. Service Specialization (Categories) */}
          <div className="card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.25rem" }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa" }}>
                <Layers size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  Repair Specializations *
                </h2>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                  Select all product domains you service and diagnose
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem" }}>
              {categories.map(cat => {
                const isSelected = selectedCategories.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.625rem 1rem",
                      borderRadius: "var(--radius-md)",
                      border: `1px solid ${isSelected ? "var(--color-brand-500)" : "var(--color-border-subtle)"}`,
                      background: isSelected ? "rgba(16, 185, 129, 0.15)" : "var(--color-surface-1)",
                      color: isSelected ? "var(--color-brand-400)" : "var(--color-text-secondary)",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontWeight: isSelected ? 600 : 500,
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: `1.5px solid ${isSelected ? "var(--color-brand-400)" : "var(--color-text-muted)"}`,
                      background: isSelected ? "var(--color-brand-500)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white"
                    }}>
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                    {cat.name}
                  </button>
                )
              })}
            </div>
            {selectedCategories.length === 0 && (
              <p style={{ fontSize: "0.75rem", color: "#f87171", marginTop: "0.5rem" }}>
                * Please select at least one repair domain.
              </p>
            )}
          </div>

          {/* 3. Coverage, Location & Doorstep Service */}
          <div className="card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.25rem" }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "rgba(245, 158, 11, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24" }}>
                <Compass size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  Operating Radius &amp; Service Location
                </h2>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                  Set your workshop base and maximum dispatch distance for customer doorstep visits
                </p>
              </div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label className="label" style={{ marginBottom: 0 }}>Service Radius</label>
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-brand-400)" }}>
                  {serviceRadiusKm} km coverage
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={serviceRadiusKm}
                onChange={e => setServiceRadiusKm(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--color-brand-500)", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                <span>5 km (Local)</span>
                <span>25 km (Citywide)</span>
                <span>50 km (Metro Area)</span>
              </div>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem",
              background: "var(--color-surface-1)",
              borderRadius: "var(--radius-md)",
              marginBottom: "1.25rem",
              border: "1px solid var(--color-border-subtle)"
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text-primary)" }}>
                  Doorstep / On-Site Repair Available
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Allow customers to request technician home visits for appliance &amp; device fixes
                </div>
              </div>
              <label style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={doorstepAvailable}
                  onChange={e => setDoorstepAvailable(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: "var(--color-brand-500)" }}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="label">Workshop Street Address *</label>
                <input
                  type="text"
                  name="address"
                  required
                  className="input"
                  placeholder="e.g. Shop 4, Commercial Plaza"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="label">City *</label>
                <input
                  type="text"
                  name="city"
                  required
                  className="input"
                  placeholder="e.g. Bangalore"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
              </div>

              <div>
                <label className="label">PIN Code *</label>
                <input
                  type="text"
                  name="pinCode"
                  required
                  className="input"
                  placeholder="e.g. 560001"
                  value={pinCode}
                  onChange={e => setPinCode(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 4. Credentials & Document Upload */}
          <div className="card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.25rem" }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "rgba(168, 85, 247, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#c084fc" }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  Credentials &amp; Supporting Documents *
                </h2>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                  Upload your trade license, certification, or ID (Mandatory for verification)
                </p>
              </div>
            </div>

            <div style={{
              border: `2px dashed ${docFileName || uploadedDocUrl ? "rgba(16, 185, 129, 0.6)" : "var(--color-border-subtle)"}`,
              borderRadius: "var(--radius-md)",
              padding: "1.5rem",
              textAlign: "center",
              background: docFileName || uploadedDocUrl ? "rgba(16, 185, 129, 0.05)" : "var(--color-surface-1)"
            }}>
              <UploadCloud size={32} style={{ color: docFileName || uploadedDocUrl ? "var(--color-brand-400)" : "var(--color-text-muted)", margin: "0 auto 0.5rem" }} />
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: docFileName || uploadedDocUrl ? "var(--color-brand-400)" : "var(--color-text-primary)", marginBottom: "0.25rem" }}>
                {docFileName ? `✓ Attached: ${docFileName}` : "Upload Trade License, Certificate, or Government ID * (Required)"}
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
                Accepted formats: PDF, PNG, JPG (Max 5MB) — Required before submission can proceed
              </p>
              <label className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "0.375rem 0.875rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <FileText size={14} /> {docFileName ? "Change Document" : "Browse Document *"}
                <input
                  type="file"
                  name="identityDoc"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <Link
              href="/dashboard"
              className="btn btn-outline"
              style={{ padding: "0.75rem 1.5rem", textDecoration: "none" }}
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.75rem 2rem",
                fontSize: "0.9375rem",
                fontWeight: 700
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  {uploadingDoc ? "Uploading Document..." : "Submitting Application..."}
                </>
              ) : (
                <>
                  {isResubmission ? "Resubmit Application" : "Submit Application"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
