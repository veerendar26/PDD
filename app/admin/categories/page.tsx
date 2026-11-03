import { createAdminClient } from "@/lib/supabase/server"
import { CategoryManagerClient, CategoryItem } from "./CategoryManagerClient"

export const dynamic = "force-dynamic"
export const metadata = { title: "Category Management — EcoFix Admin" }

export default async function AdminCategoriesPage() {
  const adminSupabase = await createAdminClient()

  const { data: categories, error } = await adminSupabase
    .from("categories")
    .select(`
      id,
      name,
      parent_id,
      icon_url,
      display_order,
      created_at,
      parent:categories!categories_parent_id_fkey(name)
    `)
    .order("display_order", { ascending: true })

  if (error) {
    console.error("Error fetching categories:", error.message)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--color-brand-400)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Catalog Configuration
          </span>
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
          Service Categories & Catalog ({categories?.length ?? 0})
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          Create and organize repair departments, device classifications, and service taxonomies.
        </p>
      </div>

      <CategoryManagerClient categories={(categories as unknown as CategoryItem[]) || []} />
    </div>
  )
}
