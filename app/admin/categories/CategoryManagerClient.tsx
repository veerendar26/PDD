"use client"

import { useState } from "react"
import { 
  Tag, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  CheckCircle, 
  X, 
  AlertTriangle, 
  Layers, 
  FolderPlus 
} from "lucide-react"
import { 
  createCategoryAdmin, 
  updateCategoryAdmin, 
  deleteCategoryAdmin 
} from "../actions"

export interface CategoryItem {
  id: string
  name: string
  parent_id: string | null
  icon_url?: string | null
  display_order: number
  created_at: string
  parent?: {
    name: string
  } | null
}

export function CategoryManagerClient({
  categories,
}: {
  categories: CategoryItem[]
}) {
  const [search, setSearch] = useState("")
  const [filterParent, setFilterParent] = useState<string>("all")
  const [modalType, setModalType] = useState<"create" | "edit" | null>(null)
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)

  // Form states
  const [catName, setCatName] = useState("")
  const [catParentId, setCatParentId] = useState<string>("")
  const [catDisplayOrder, setCatDisplayOrder] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Top level categories (parent_id is null)
  const topLevel = categories.filter((c) => !c.parent_id)
  const subCategories = categories.filter((c) => c.parent_id)

  // Filter
  const filtered = categories.filter((c) => {
    if (filterParent === "top_only" && c.parent_id) return false
    if (filterParent === "sub_only" && !c.parent_id) return false
    if (filterParent !== "all" && filterParent !== "top_only" && filterParent !== "sub_only" && c.parent_id !== filterParent) {
      return false
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = c.name.toLowerCase().includes(q)
      const matchParent = c.parent?.name?.toLowerCase().includes(q)
      const matchId = c.id.toLowerCase().includes(q)
      if (!matchName && !matchParent && !matchId) return false
    }

    return true
  })

  function openCreateModal(defaultParentId?: string) {
    setEditingCategory(null)
    setCatName("")
    setCatParentId(defaultParentId || "")
    setCatDisplayOrder(categories.length)
    setModalType("create")
  }

  function openEditModal(cat: CategoryItem) {
    setEditingCategory(cat)
    setCatName(cat.name)
    setCatParentId(cat.parent_id || "")
    setCatDisplayOrder(cat.display_order)
    setModalType("edit")
  }

  async function handleSave() {
    if (!catName.trim()) {
      alert("Please enter a category name.")
      return
    }

    setIsSubmitting(true)
    try {
      if (modalType === "create") {
        const res = await createCategoryAdmin(
          catName.trim(), 
          catParentId && catParentId !== "" ? catParentId : null, 
          Number(catDisplayOrder) || 0
        )
        if (!res.success) throw new Error(res.error)
      } else if (modalType === "edit" && editingCategory) {
        const res = await updateCategoryAdmin(
          editingCategory.id, 
          catName.trim(), 
          catParentId && catParentId !== "" ? catParentId : null, 
          Number(catDisplayOrder) || 0
        )
        if (!res.success) throw new Error(res.error)
      }

      setModalType(null)
    } catch (err: any) {
      alert("Operation failed: " + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    const hasChildren = subCategories.some((s) => s.parent_id === id)
    if (hasChildren) {
      if (!confirm(`Warning: "${name}" has sub-categories attached to it. Deleting it will unlink child categories. Continue?`)) {
        return
      }
    } else {
      if (!confirm(`Are you sure you want to delete category "${name}"?`)) {
        return
      }
    }

    try {
      const res = await deleteCategoryAdmin(id)
      if (!res.success) throw new Error(res.error)
    } catch (err: any) {
      alert("Failed to delete category: " + err.message)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* ─── Control Header ───────────────────────────────────────── */}
      <div 
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          background: "var(--color-surface-100)",
          padding: "1.25rem",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-surface-200)",
        }}
      >
        <div style={{ position: "relative", minWidth: "260px", flex: 1 }}>
          <Search size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
          <input
            type="text"
            placeholder="Search categories or sub-departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.625rem 1rem 0.625rem 2.5rem",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-0)",
              border: "1px solid var(--color-surface-200)",
              color: "var(--color-text-primary)",
              fontSize: "0.875rem",
            }}
          />
        </div>

        {/* Parent Dropdown filter */}
        <select
          value={filterParent}
          onChange={(e) => setFilterParent(e.target.value)}
          style={{
            padding: "0.625rem 0.875rem",
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface-0)",
            border: "1px solid var(--color-surface-200)",
            color: "var(--color-text-primary)",
            fontSize: "0.8125rem",
            fontWeight: 500,
          }}
        >
          <option value="all">All Classifications ({categories.length})</option>
          <option value="top_only">Top-Level Departments Only ({topLevel.length})</option>
          <option value="sub_only">Sub-Categories Only ({subCategories.length})</option>
          {topLevel.map((p) => (
            <option key={p.id} value={p.id}>
              Under: {p.name}
            </option>
          ))}
        </select>

        {/* Add Category Button */}
        <button 
          onClick={() => openCreateModal()} 
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.25rem" }}
        >
          <Plus size={16} />
          <span>Add New Category</span>
        </button>
      </div>

      {/* ─── Top-Level Departments Cards ─────────────────────────── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>
            Top-Level Departments ({topLevel.length})
          </h2>
          <button 
            onClick={() => openCreateModal("")} 
            className="btn btn-secondary"
            style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem", display: "flex", alignItems: "center", gap: "0.375rem" }}
          >
            <FolderPlus size={13} />
            <span>New Department</span>
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
          {topLevel.map((cat) => {
            const children = subCategories.filter((s) => s.parent_id === cat.id)
            return (
              <div 
                key={cat.id} 
                className="card"
                style={{
                  padding: "1.25rem",
                  background: "var(--color-surface-100)",
                  border: "1px solid var(--color-surface-200)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "#ffffff" }}>{cat.name}</div>
                    <span style={{ fontSize: "0.6875rem", padding: "2px 8px", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", borderRadius: "999px" }}>
                      Order #{cat.display_order}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                    Sub-categories: <strong>{children.length}</strong>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.625rem" }}>
                    {children.slice(0, 4).map((sub) => (
                      <span key={sub.id} style={{ fontSize: "0.6875rem", padding: "2px 6px", background: "var(--color-surface-200)", borderRadius: "4px", color: "var(--color-text-secondary)" }}>
                        {sub.name}
                      </span>
                    ))}
                    {children.length > 4 && (
                      <span style={{ fontSize: "0.6875rem", padding: "2px 6px", background: "var(--color-surface-200)", borderRadius: "4px", color: "var(--color-text-muted)" }}>
                        +{children.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.375rem", paddingTop: "0.625rem", borderTop: "1px solid rgba(255, 255, 255, 0.06)", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => openCreateModal(cat.id)}
                    className="btn btn-secondary"
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.6875rem" }}
                    title="Add Subcategory to this Department"
                  >
                    <Plus size={11} />
                    <span>Sub</span>
                  </button>
                  <button
                    onClick={() => openEditModal(cat)}
                    className="btn btn-secondary"
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.6875rem" }}
                    title="Edit Department"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="btn btn-danger"
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.6875rem" }}
                    title="Delete Department"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── All Classifications Table ───────────────────────────── */}
      <div>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.875rem" }}>
          Full Taxonomy Listing ({filtered.length})
        </h2>

        <div 
          style={{
            background: "var(--color-surface-100)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--color-surface-200)",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-surface-200)", background: "rgba(0,0,0,0.2)" }}>
                  <th style={{ padding: "0.875rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Classification</th>
                  <th style={{ padding: "0.875rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Type</th>
                  <th style={{ padding: "0.875rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Parent Department</th>
                  <th style={{ padding: "0.875rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Display Order</th>
                  <th style={{ padding: "0.875rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>UUID</th>
                  <th style={{ padding: "0.875rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "2.5rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
                      No categories found matching your query.
                    </td>
                  </tr>
                ) : (
                  filtered.map((cat, idx) => (
                    <tr key={cat.id} style={{ borderBottom: idx < filtered.length - 1 ? "1px solid var(--color-surface-200)" : undefined }}>
                      <td style={{ padding: "0.875rem 1rem", fontWeight: 600, color: "#ffffff", fontSize: "0.875rem" }}>
                        {cat.name}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", fontSize: "0.75rem" }}>
                        <span 
                          style={{
                            padding: "2px 8px",
                            borderRadius: "999px",
                            fontWeight: 700,
                            background: !cat.parent_id ? "rgba(16, 185, 129, 0.15)" : "rgba(96, 165, 250, 0.15)",
                            color: !cat.parent_id ? "#34d399" : "#60a5fa",
                          }}
                        >
                          {!cat.parent_id ? "Top Level" : "Subcategory"}
                        </span>
                      </td>
                      <td style={{ padding: "0.875rem 1rem", fontSize: "0.8125rem", color: "var(--color-brand-400)" }}>
                        {cat.parent?.name || "—"}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                        {cat.display_order}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", fontSize: "0.75rem", fontFamily: "monospace", color: "var(--color-text-muted)" }}>
                        {cat.id.slice(0, 8)}...
                      </td>
                      <td style={{ padding: "0.875rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.375rem", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => openEditModal(cat)}
                            className="btn btn-secondary"
                            style={{ padding: "0.375rem 0.625rem", fontSize: "0.75rem" }}
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id, cat.name)}
                            className="btn btn-danger"
                            style={{ padding: "0.375rem 0.625rem", fontSize: "0.75rem" }}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Modal Dialog (Create / Edit) ─────────────────────────── */}
      {modalType && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            zIndex: 100,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "480px",
              background: "var(--color-surface-100)",
              border: "1px solid var(--color-surface-300)",
              padding: "1.75rem",
              borderRadius: "var(--radius-xl)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Tag size={18} color="var(--color-brand-400)" />
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>
                  {modalType === "create" ? "Add New Category" : "Edit Category"}
                </h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Smartphones, Screens & Displays, Audio"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-surface-0)",
                    border: "1px solid var(--color-surface-200)",
                    color: "#ffffff",
                    fontSize: "0.875rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Parent Department (Optional)
                </label>
                <select
                  value={catParentId}
                  onChange={(e) => setCatParentId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-surface-0)",
                    border: "1px solid var(--color-surface-200)",
                    color: "#ffffff",
                    fontSize: "0.875rem",
                  }}
                >
                  <option value="">None (Top-Level Department)</option>
                  {topLevel
                    .filter((t) => t.id !== editingCategory?.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Display Order
                </label>
                <input
                  type="number"
                  value={catDisplayOrder}
                  onChange={(e) => setCatDisplayOrder(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-surface-0)",
                    border: "1px solid var(--color-surface-200)",
                    color: "#ffffff",
                    fontSize: "0.875rem",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button onClick={() => setModalType(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting || !catName.trim()}
                  className="btn btn-primary"
                >
                  {isSubmitting ? "Saving..." : modalType === "create" ? "Create Category" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
