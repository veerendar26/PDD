"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient, createClient } from "@/lib/supabase/server"

/**
 * Helper to ensure the current authenticated user is an admin.
 * Throws an error immediately if unauthenticated or not an admin.
 */
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized: Not authenticated")

  const { data: profile, error } = await supabase
    .from("users")
    .select("role, name")
    .eq("id", user.id)
    .single()

  if (error || profile?.role !== "admin") {
    throw new Error("Forbidden: Admin privileges required")
  }

  return { adminId: user.id, adminName: profile.name }
}

/**
 * Safe audit logger: attempts to insert into admin_audit_logs.
 * If the optional table does not exist in the database, safely ignores without failing the operation.
 */
async function safeLogAdminAudit(
  adminSupabase: any,
  entry: {
    admin_id: string
    action: string
    target_type: string
    target_id?: string
    details: Record<string, any>
  }
) {
  try {
    await adminSupabase.from("admin_audit_logs").insert(entry)
  } catch (err) {
    // Non-destructive fallback if admin_audit_logs table has not been applied to DB
    console.warn("admin_audit_logs insert safely skipped:", (err as any)?.message || err)
  }
}

/**
 * Approve and verify a technician/provider account.
 * Database enum value: 'approved' (presented as 'Verified' in UI)
 */
export async function approveProvider(providerId: string, notes?: string) {
  const { adminId } = await assertAdmin()
  const adminSupabase = await createAdminClient()

  // 1. Fetch current profile
  const { data: provider, error: fetchErr } = await adminSupabase
    .from("provider_profiles")
    .select("*, users(id, name, email)")
    .eq("id", providerId)
    .single()

  if (fetchErr || !provider) {
    return { success: false, error: "Provider profile not found" }
  }

  // 2. Update provider_profiles (using existing schema columns)
  const { error: updateErr } = await adminSupabase
    .from("provider_profiles")
    .update({
      verification_status: "approved",
    })
    .eq("id", providerId)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  // 3. Log audit
  await safeLogAdminAudit(adminSupabase, {
    admin_id: adminId,
    action: "technician_approved",
    target_type: "provider_profile",
    target_id: providerId,
    details: {
      business_name: provider.business_name,
      user_id: provider.user_id,
      notes: notes || "Approved & Verified by Administrator",
      previous_status: provider.verification_status,
      new_status: "approved",
    },
  })

  // 4. Send notification to the technician
  await adminSupabase.from("notifications").insert({
    user_id: provider.user_id,
    type: "system",
    title: "🎉 Account Verified & Activated!",
    body: "Congratulations! Your technician profile has been verified by the administration. You can now access the Technician Dashboard and receive repair bookings.",
    payload: { provider_id: providerId, status: "approved" },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/providers")
  revalidatePath("/admin/audit-logs")
  revalidatePath("/provider")
  return { success: true }
}

/**
 * Reject a technician/provider verification request.
 */
export async function rejectProvider(providerId: string, reason: string) {
  const { adminId } = await assertAdmin()
  const adminSupabase = await createAdminClient()

  const { data: provider } = await adminSupabase
    .from("provider_profiles")
    .select("*, users(id, name, email)")
    .eq("id", providerId)
    .single()

  if (!provider) {
    return { success: false, error: "Provider profile not found" }
  }

  const { error: updateErr } = await adminSupabase
    .from("provider_profiles")
    .update({
      verification_status: "rejected",
    })
    .eq("id", providerId)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  await safeLogAdminAudit(adminSupabase, {
    admin_id: adminId,
    action: "technician_rejected",
    target_type: "provider_profile",
    target_id: providerId,
    details: {
      business_name: provider.business_name,
      user_id: provider.user_id,
      reason,
      previous_status: provider.verification_status,
      new_status: "rejected",
    },
  })

  // Notify technician with specific reason
  await adminSupabase.from("notifications").insert({
    user_id: provider.user_id,
    type: "system",
    title: "Technician Application Update",
    body: `Your technician application could not be verified at this time: ${reason}. Please update your credentials or contact support.`,
    payload: { provider_id: providerId, status: "rejected", reason },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/providers")
  revalidatePath("/admin/audit-logs")
  revalidatePath("/provider")
  return { success: true }
}

/**
 * Request resubmission of credentials from a technician
 */
export async function requestResubmissionProvider(providerId: string, message: string) {
  const { adminId } = await assertAdmin()
  const adminSupabase = await createAdminClient()

  const { data: provider } = await adminSupabase
    .from("provider_profiles")
    .select("*, users(id, name, email)")
    .eq("id", providerId)
    .single()

  if (!provider) {
    return { success: false, error: "Provider profile not found" }
  }

  // Keep or set to pending
  await adminSupabase
    .from("provider_profiles")
    .update({
      verification_status: "pending",
    })
    .eq("id", providerId)

  await safeLogAdminAudit(adminSupabase, {
    admin_id: adminId,
    action: "technician_resubmission_requested",
    target_type: "provider_profile",
    target_id: providerId,
    details: {
      business_name: provider.business_name,
      user_id: provider.user_id,
      instructions: message,
    },
  })

  // Notify technician with action request
  await adminSupabase.from("notifications").insert({
    user_id: provider.user_id,
    type: "system",
    title: "Action Required: Update Verification Documents",
    body: `The EcoFix review team has requested updated information: ${message}. Please review and update your profile.`,
    payload: { provider_id: providerId, status: "resubmission_requested", message },
  })

  revalidatePath("/admin/providers")
  revalidatePath("/admin/audit-logs")
  return { success: true }
}

/**
 * Toggle Technician Active / Suspended state
 * Sets verification_status to 'approved' (active) or 'rejected' (suspended)
 */
export async function toggleProviderActiveStatus(providerId: string, isActive: boolean) {
  const { adminId } = await assertAdmin()
  const adminSupabase = await createAdminClient()

  const { data: provider } = await adminSupabase
    .from("provider_profiles")
    .select("business_name, user_id, verification_status")
    .eq("id", providerId)
    .single()

  if (!provider) return { success: false, error: "Provider profile not found" }

  const newStatus = isActive ? "approved" : "rejected"

  const { error } = await adminSupabase
    .from("provider_profiles")
    .update({ 
      verification_status: newStatus,
    })
    .eq("id", providerId)

  if (error) return { success: false, error: error.message }

  await safeLogAdminAudit(adminSupabase, {
    admin_id: adminId,
    action: isActive ? "technician_activated" : "technician_suspended",
    target_type: "provider_profile",
    target_id: providerId,
    details: {
      business_name: provider?.business_name,
      new_status: newStatus,
    },
  })

  // Notify technician
  await adminSupabase.from("notifications").insert({
    user_id: provider.user_id,
    type: "system",
    title: isActive ? "Account Re-activated" : "Account Suspended",
    body: isActive 
      ? "Your technician account has been re-activated by an administrator."
      : "Your technician account has been suspended by an administrator. Please reach out to support for details.",
    payload: { provider_id: providerId, status: newStatus },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/providers")
  revalidatePath("/admin/audit-logs")
  return { success: true }
}

/**
 * Admin manual booking status override
 * Requires a reason and always appends to the immutable repair_status_log
 */
export async function updateBookingStatusAdmin(
  bookingId: string,
  newStatus: "booked" | "assigned" | "diagnosis" | "awaiting_approval" | "in_repair" | "quality_check" | "completed" | "cancelled",
  adminNote: string
) {
  const { adminId, adminName } = await assertAdmin()
  const adminSupabase = await createAdminClient()

  if (!adminNote || adminNote.trim() === "") {
    return { success: false, error: "An administrative override reason is mandatory." }
  }

  const { data: booking, error: fetchErr } = await adminSupabase
    .from("bookings")
    .select("status, customer_id, provider_id")
    .eq("id", bookingId)
    .single()

  if (fetchErr || !booking) return { success: false, error: "Booking not found" }

  // 1. Update booking status
  const { error: updateErr } = await adminSupabase
    .from("bookings")
    .update({ 
      status: newStatus, 
      updated_at: new Date().toISOString() 
    })
    .eq("id", bookingId)

  if (updateErr) return { success: false, error: updateErr.message }

  // 2. Append to immutable repair_status_log
  await adminSupabase.from("repair_status_log").insert({
    booking_id: bookingId,
    status: newStatus,
    changed_by: adminId,
    note: `[Admin Override by ${adminName || 'Admin'}]: ${adminNote.trim()}`,
  })

  // 3. Safe audit log
  await safeLogAdminAudit(adminSupabase, {
    admin_id: adminId,
    action: "booking_status_override",
    target_type: "booking",
    target_id: bookingId,
    details: {
      previous_status: booking.status,
      new_status: newStatus,
      note: adminNote.trim(),
    },
  })

  // 4. Notify customer
  await adminSupabase.from("notifications").insert({
    user_id: booking.customer_id,
    type: "system",
    title: `Repair Status Updated to ${newStatus.replace(/_/g, " ").toUpperCase()}`,
    body: `Your repair order #${bookingId.slice(0, 8).toUpperCase()} was updated: ${adminNote.trim()}`,
    payload: { booking_id: bookingId, status: newStatus },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/bookings")
  revalidatePath("/admin/timelines")
  revalidatePath("/admin/audit-logs")
  revalidatePath(`/bookings/${bookingId}`)
  return { success: true }
}

/**
 * Reassign a technician to a booking
 */
export async function reassignProviderAdmin(bookingId: string, newProviderId: string, note?: string) {
  const { adminId, adminName } = await assertAdmin()
  const adminSupabase = await createAdminClient()

  const { error } = await adminSupabase
    .from("bookings")
    .update({
      provider_id: newProviderId,
      status: "assigned",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)

  if (error) return { success: false, error: error.message }

  await adminSupabase.from("repair_status_log").insert({
    booking_id: bookingId,
    status: "assigned",
    changed_by: adminId,
    note: note ? `[Admin Reassigned by ${adminName || 'Admin'}]: ${note}` : `Booking reassigned to technician by administrator`,
  })

  await safeLogAdminAudit(adminSupabase, {
    admin_id: adminId,
    action: "provider_reassigned",
    target_type: "booking",
    target_id: bookingId,
    details: { new_provider_id: newProviderId, note },
  })

  revalidatePath("/admin/bookings")
  revalidatePath("/admin/timelines")
  revalidatePath("/admin/audit-logs")
  return { success: true }
}

/**
 * Update user role (Customer <-> Technician <-> Admin)
 * Safety: Admins CANNOT modify their own role.
 */
export async function updateUserRoleAdmin(targetUserId: string, newRole: "customer" | "technician" | "admin") {
  const { adminId } = await assertAdmin()
  const adminSupabase = await createAdminClient()

  if (targetUserId === adminId) {
    return { success: false, error: "Security restriction: You cannot modify your own administrative role." }
  }

  const { data: targetUser, error: fetchErr } = await adminSupabase
    .from("users")
    .select("name, email, role")
    .eq("id", targetUserId)
    .single()

  if (fetchErr || !targetUser) {
    return { success: false, error: "Target user not found" }
  }

  const { error: updateErr } = await adminSupabase
    .from("users")
    .update({
      role: newRole,
    })
    .eq("id", targetUserId)

  if (updateErr) return { success: false, error: updateErr.message }

  await safeLogAdminAudit(adminSupabase, {
    admin_id: adminId,
    action: "user_role_updated",
    target_type: "user",
    target_id: targetUserId,
    details: {
      target_name: targetUser.name,
      target_email: targetUser.email,
      old_role: targetUser.role,
      new_role: newRole,
    },
  })

  revalidatePath("/admin/users")
  revalidatePath("/admin/audit-logs")
  return { success: true }
}

/**
 * Create a new service category
 */
export async function createCategoryAdmin(name: string, parentId?: string | null, displayOrder: number = 0) {
  const { adminId } = await assertAdmin()
  const adminSupabase = await createAdminClient()

  if (!name || !name.trim()) {
    return { success: false, error: "Category name is required" }
  }

  const { data, error } = await adminSupabase
    .from("categories")
    .insert({
      name: name.trim(),
      parent_id: parentId && parentId.trim() !== "" ? parentId : null,
      display_order: displayOrder,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await safeLogAdminAudit(adminSupabase, {
    admin_id: adminId,
    action: "category_created",
    target_type: "category",
    target_id: data.id,
    details: { name: name.trim(), parent_id: parentId, display_order: displayOrder },
  })

  revalidatePath("/admin/categories")
  revalidatePath("/admin")
  return { success: true }
}

/**
 * Update an existing service category
 */
export async function updateCategoryAdmin(
  categoryId: string, 
  name: string, 
  parentId?: string | null, 
  displayOrder: number = 0
) {
  const { adminId } = await assertAdmin()
  const adminSupabase = await createAdminClient()

  if (!name || !name.trim()) {
    return { success: false, error: "Category name is required" }
  }

  const { error } = await adminSupabase
    .from("categories")
    .update({
      name: name.trim(),
      parent_id: parentId && parentId.trim() !== "" ? parentId : null,
      display_order: displayOrder,
    })
    .eq("id", categoryId)

  if (error) return { success: false, error: error.message }

  await safeLogAdminAudit(adminSupabase, {
    admin_id: adminId,
    action: "category_updated",
    target_type: "category",
    target_id: categoryId,
    details: { name: name.trim(), parent_id: parentId, display_order: displayOrder },
  })

  revalidatePath("/admin/categories")
  revalidatePath("/admin")
  return { success: true }
}

/**
 * Delete a service category
 */
export async function deleteCategoryAdmin(categoryId: string) {
  const { adminId } = await assertAdmin()
  const adminSupabase = await createAdminClient()

  const { error } = await adminSupabase
    .from("categories")
    .delete()
    .eq("id", categoryId)

  if (error) return { success: false, error: error.message }

  await safeLogAdminAudit(adminSupabase, {
    admin_id: adminId,
    action: "category_deleted",
    target_type: "category",
    target_id: categoryId,
    details: { deleted_id: categoryId },
  })

  revalidatePath("/admin/categories")
  revalidatePath("/admin")
  return { success: true }
}

/**
 * Delete / Moderate an inappropriate review
 */
export async function deleteReviewAdmin(reviewId: string) {
  const { adminId } = await assertAdmin()
  const adminSupabase = await createAdminClient()

  const { data: review } = await adminSupabase
    .from("reviews")
    .select("booking_id, customer_id, provider_id, rating")
    .eq("id", reviewId)
    .single()

  const { error } = await adminSupabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)

  if (error) return { success: false, error: error.message }

  await safeLogAdminAudit(adminSupabase, {
    admin_id: adminId,
    action: "review_deleted",
    target_type: "review",
    target_id: reviewId,
    details: { review },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/timelines")
  return { success: true }
}

/**
 * Sign out administrator session on the server and clear auth cookies
 */
export async function adminSignOut() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      return { success: false, error: error.message }
    }
    revalidatePath("/", "layout")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to sign out on server" }
  }
}

