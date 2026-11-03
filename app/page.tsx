import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import {
  Wrench, Shield, Star, Clock, MapPin, Leaf, ArrowRight,
  Smartphone, Laptop, Tv, Headphones, Refrigerator, Gamepad2, Camera, Zap,
  CheckCircle, Users, TrendingUp
} from "lucide-react"

const CATEGORIES = [
  { icon: Smartphone,   label: "Smartphones",         color: "#3b82f6" },
  { icon: Laptop,       label: "Laptops & PCs",       color: "#6366f1" },
  { icon: Tv,           label: "Televisions",         color: "#8b5cf6" },
  { icon: Headphones,   label: "Audio Equipment",     color: "#ec4899" },
  { icon: Refrigerator, label: "Home Appliances",     color: "#10b981" },
  { icon: Gamepad2,     label: "Gaming Devices",      color: "#f59e0b" },
  { icon: Camera,       label: "Cameras",             color: "#06b6d4" },
  { icon: Zap,          label: "Electrical & Wiring", color: "#eab308" },
]

const FEATURES = [
  {
    icon: Shield,
    title: "Verified Technicians",
    desc: "Every provider is background-checked, skill-verified, and rated by real customers.",
  },
  {
    icon: Clock,
    title: "Live Repair Tracking",
    desc: "Watch your repair progress in real time — from diagnosis to quality check — on web or mobile.",
  },
  {
    icon: Star,
    title: "90-Day Warranty",
    desc: "Every completed repair comes with a digital warranty covering the fixed components.",
  },
  {
    icon: MapPin,
    title: "Doorstep Service",
    desc: "Book doorstep pickup or repair at home. No need to lug heavy appliances anywhere.",
  },
  {
    icon: Leaf,
    title: "Eco Impact",
    desc: "Each repair keeps e-waste out of landfills. Track your personal sustainability contribution.",
  },
  {
    icon: Wrench,
    title: "AI Diagnosis",
    desc: "Upload a photo of the damage — our AI identifies the likely issue before a technician visits.",
  },
]

const STATS = [
  { label: "Repairs Completed",  value: "48,000+",   icon: CheckCircle },
  { label: "Verified Providers", value: "1,200+",    icon: Users },
  { label: "Cities Covered",     value: "32",        icon: MapPin },
  { label: "E-Waste Prevented",  value: "120+ Tons", icon: TrendingUp },
]

const HOW_IT_WORKS = [
  { step: "01", title: "Describe the Problem", desc: "Upload photos and describe the issue. Our AI helps identify it instantly." },
  { step: "02", title: "Get Matched",           desc: "We match you with nearby verified providers sorted by rating, price, and availability." },
  { step: "03", title: "Book & Track",          desc: "Schedule your service and follow the repair journey live from your phone or browser." },
  { step: "04", title: "Pay Safely & Review",   desc: "Pay only after approval. Receive a digital warranty. Rate your experience." },
]

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let dashboardHref = "/dashboard"
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role === "technician") {
      dashboardHref = "/provider/dashboard"
    } else if (profile?.role === "admin") {
      dashboardHref = "/admin"
    }
  }

  return (
    <div style={{ background: "var(--color-surface-0)", minHeight: "100vh" }}>

      {/* ── Navbar ──────────────────────────────────────── */}
      <nav className="navbar">
        <div className="page-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none" }}>
            <div style={{
              width: 36, height: 36,
              background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))",
              borderRadius: "var(--radius-md)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Wrench size={18} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: "1.25rem", color: "var(--color-text-primary)" }}>
              Eco<span style={{ color: "var(--color-brand-500)" }}>Fix</span>
            </span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingRight: "6.5rem" }}>
            {user ? (
              <Link href={dashboardHref} className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <span>Dashboard</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="btn btn-ghost">Log in</Link>
                <Link href="/auth/register" className="btn btn-primary">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section style={{ padding: "7rem 0 5rem", position: "relative", overflow: "hidden" }}>
        {/* Background glow blobs */}
        <div style={{
          position: "absolute", top: "-20%", left: "-10%",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: "10%", right: "-10%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div className="page-container" style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <div className="glass-brand animate-fade-in" style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            padding: "0.375rem 1rem", borderRadius: 9999,
            fontSize: "0.8125rem", fontWeight: 600,
            color: "var(--color-brand-400)", marginBottom: "1.5rem",
          }}>
            <Leaf size={14} />
            Repair. Reuse. Revalue.
          </div>

          <h1 className="animate-fade-in" style={{
            fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
            fontWeight: 900, lineHeight: 1.1,
            marginBottom: "1.5rem",
            animationDelay: "0.1s",
          }}>
            Your Trusted<br />
            <span className="gradient-text">Repair Marketplace</span>
          </h1>

          <p className="animate-fade-in" style={{
            fontSize: "clamp(1rem, 2vw, 1.25rem)",
            color: "var(--color-text-secondary)",
            maxWidth: 600, margin: "0 auto 2.5rem",
            animationDelay: "0.2s",
          }}>
            Connect with verified technicians for smartphones, laptops, TVs, appliances, and gadgets.
            Book in minutes, track in real time, pay only when done.
          </p>

          <div className="animate-fade-in" style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", animationDelay: "0.3s" }}>
            <Link href={user ? "/book" : "/auth/register?role=customer"} className="btn btn-primary btn-xl">
              Book a Repair <ArrowRight size={18} />
            </Link>
            {!user ? (
              <Link href="/auth/register?role=technician" className="btn btn-secondary btn-xl">
                Join as Technician
              </Link>
            ) : (
              <Link href={dashboardHref} className="btn btn-secondary btn-xl">
                My Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────── */}
      <section style={{ padding: "3rem 0", borderTop: "1px solid var(--color-surface-200)", borderBottom: "1px solid var(--color-surface-200)" }}>
        <div className="page-container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "2rem" }}>
          {STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <Icon size={24} style={{ color: "var(--color-brand-500)", margin: "0 auto 0.5rem" }} />
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-text-primary)" }}>{value}</div>
              <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ──────────────────────────────────── */}
      <section className="section">
        <div className="page-container">
          <h2 style={{ textAlign: "center", fontSize: "2rem", marginBottom: "0.75rem" }}>
            We Fix <span className="gradient-text">Electronics & Appliances</span>
          </h2>
          <p style={{ textAlign: "center", color: "var(--color-text-secondary)", marginBottom: "3rem" }}>
            Eight specialized repair categories, one trusted platform.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "1rem" }}>
            {CATEGORIES.map(({ icon: Icon, label, color }) => (
              <Link
                key={label}
                href={`/book?category=${encodeURIComponent(label)}`}
                style={{ textDecoration: "none" }}
              >
                <div className="card card-brand" style={{ padding: "1.5rem 1rem", textAlign: "center", cursor: "pointer" }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: "var(--radius-md)",
                    background: `${color}1a`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 0.75rem",
                  }}>
                    <Icon size={24} color={color} />
                  </div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text-primary)" }}>{label}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────── */}
      <section className="section" style={{ background: "var(--color-surface-50)" }}>
        <div className="page-container">
          <h2 style={{ textAlign: "center", fontSize: "2rem", marginBottom: "0.75rem" }}>
            How <span className="gradient-text">EcoFix</span> Works
          </h2>
          <p style={{ textAlign: "center", color: "var(--color-text-secondary)", marginBottom: "3rem" }}>
            From problem to repaired in 4 simple steps.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2rem" }}>
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} style={{ position: "relative" }}>
                <div style={{
                  fontSize: "3.5rem", fontWeight: 900, lineHeight: 1,
                  color: "var(--color-brand-500)", opacity: 0.15,
                  marginBottom: "0.5rem",
                }}>
                  {step}
                </div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.5rem" }}>{title}</h3>
                <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section className="section">
        <div className="page-container">
          <h2 style={{ textAlign: "center", fontSize: "2rem", marginBottom: "0.75rem" }}>
            Why <span className="gradient-text">EcoFix</span>?
          </h2>
          <p style={{ textAlign: "center", color: "var(--color-text-secondary)", marginBottom: "3rem" }}>
            Built for trust, transparency, and sustainability.
          </p>
          <div className="grid-auto-fill-sm">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card" style={{ padding: "1.75rem" }}>
                <div style={{
                  width: 44, height: 44,
                  background: "rgba(16,185,129,0.1)",
                  borderRadius: "var(--radius-md)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "1rem",
                }}>
                  <Icon size={22} color="var(--color-brand-500)" />
                </div>
                <h3 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>{title}</h3>
                <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="section" style={{ background: "var(--color-surface-50)" }}>
        <div className="page-container" style={{ textAlign: "center" }}>
          <div className="glass-brand" style={{
            display: "inline-block", padding: "3rem 4rem",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-glow-brand)",
          }}>
            <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
              Ready to Fix <span className="gradient-text">Something?</span>
            </h2>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "2rem" }}>
              Join 48,000+ customers who chose repair over replace.
            </p>
            <Link href={user ? "/book" : "/auth/register"} className="btn btn-primary btn-xl">
              Book Your First Repair <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid var(--color-surface-200)",
        padding: "2rem 0",
        color: "var(--color-text-muted)",
        fontSize: "0.875rem",
      }}>
        <div className="page-container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <span>© 2026 EcoFix. All rights reserved.</span>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <Link href="/privacy" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>Terms</Link>
            <Link href="/contact" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
