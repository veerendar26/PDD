import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "./components.css"
import { Toaster } from "react-hot-toast"
import { ThemeToggle } from "@/components/theme-toggle"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "EcoFix — Repair. Reuse. Revalue.",
  description:
    "Connect with verified repair technicians for electronics, appliances, smartphones, laptops, and gadgets. Book a repair, track it live, and contribute to a sustainable future.",
  keywords: ["repair", "technician", "electronics repair", "appliance repair", "smartphone repair", "laptop repair", "eco-friendly", "ecofix"],
  openGraph: {
    title: "EcoFix — Repair. Reuse. Revalue.",
    description: "Your trusted repair marketplace",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('ecofix-theme');
                  var isLight = stored === 'light' || (!stored && window.matchMedia('(prefers-color-scheme: light)').matches);
                  if (isLight) {
                    document.documentElement.setAttribute('data-theme', 'light');
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {/* Top-Right Theme Toggle */}
        <div
          id="global-theme-toggle-container"
          style={{
            position: "fixed",
            top: "1rem",
            right: "1.25rem",
            zIndex: 9999,
          }}
        >
          <ThemeToggle />
        </div>

        {children}
        <Toaster
          position="top-right"
          containerStyle={{
            top: 64,
          }}
          toastOptions={{
            style: {
              background: "var(--color-surface-100)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-surface-200)",
            },
          }}
        />
      </body>
    </html>
  )
}

