"use client"

import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"

export type Theme = "dark" | "light"

export function ThemeToggle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [theme, setTheme] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem("ecofix-theme") as Theme | null
    if (stored === "light" || stored === "dark") {
      setTheme(stored)
      applyTheme(stored)
    } else {
      // Check system preference
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches
      const initial = prefersLight ? "light" : "dark"
      setTheme(initial)
      applyTheme(initial)
    }
  }, [])

  function applyTheme(newTheme: Theme) {
    document.documentElement.setAttribute("data-theme", newTheme)
    if (newTheme === "light") {
      document.documentElement.classList.add("light")
      document.documentElement.classList.remove("dark")
      document.body.classList.add("light")
      document.body.classList.remove("dark")
    } else {
      document.documentElement.classList.add("dark")
      document.documentElement.classList.remove("light")
      document.body.classList.add("dark")
      document.body.classList.remove("light")
    }
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    applyTheme(next)
    localStorage.setItem("ecofix-theme", next)
  }

  if (!mounted) {
    return (
      <div
        style={{
          width: 84,
          height: 38,
          borderRadius: "9999px",
          background: "var(--color-surface-100)",
          border: "1px solid var(--color-surface-200)",
          ...style,
        }}
        className={className}
      />
    )
  }

  const isDark = theme === "dark"

  return (
    <button
      onClick={toggleTheme}
      id="theme-toggle-btn"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.375rem 0.625rem",
        borderRadius: "9999px",
        background: "var(--color-surface-100)",
        border: "1px solid var(--color-surface-200)",
        color: "var(--color-text-primary)",
        cursor: "pointer",
        fontSize: "0.8125rem",
        fontWeight: 600,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        userSelect: "none",
        ...style,
      }}
      className={className}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isDark ? "rgba(251, 191, 36, 0.15)" : "rgba(59, 130, 246, 0.15)",
          color: isDark ? "#fbbf24" : "#3b82f6",
          transition: "transform 0.3s ease, background 0.3s ease, color 0.3s ease",
          transform: isDark ? "rotate(0deg)" : "rotate(360deg)",
        }}
      >
        {isDark ? <Moon size={14} /> : <Sun size={14} />}
      </div>
      <span style={{ fontSize: "0.75rem", letterSpacing: "0.02em" }}>
        {isDark ? "Dark" : "Light"}
      </span>
    </button>
  )
}
