package com.ecofix.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ── Enums ────────────────────────────────────────────────────

enum class UserRole { customer, technician, admin }
enum class BookingStatus {
    booked, assigned, diagnosis, awaiting_approval,
    in_repair, quality_check, completed, cancelled
}
enum class ServiceType { doorstep, pickup, in_store }
enum class VerificationStatus { pending, approved, rejected }
enum class PaymentStatus { pending, paid, failed, refunded }

// ── DTOs (mirror Postgres table rows exactly) ────────────────

@Serializable
data class UserDto(
    val id: String,
    val role: String,
    val name: String,
    val email: String,
    val phone: String? = null,
    @SerialName("avatar_url")   val avatarUrl: String? = null,
    @SerialName("fcm_token")    val fcmToken: String? = null,
    @SerialName("created_at")   val createdAt: String = "",
    @SerialName("updated_at")   val updatedAt: String = "",
)

@Serializable
data class ProviderProfileDto(
    val id: String,
    @SerialName("user_id")              val userId: String,
    @SerialName("business_name")        val businessName: String,
    val description: String? = null,
    val categories: List<String> = emptyList(),
    @SerialName("verification_status")  val verificationStatus: String = "pending",
    @SerialName("rating_avg")           val ratingAvg: Double = 0.0,
    @SerialName("total_reviews")        val totalReviews: Int = 0,
    @SerialName("service_radius_km")    val serviceRadiusKm: Int = 10,
    @SerialName("doorstep_available")   val doorstepAvailable: Boolean = false,
    val address: String? = null,
    @SerialName("created_at")           val createdAt: String = "",
    @SerialName("updated_at")           val updatedAt: String = "",
)

@Serializable
data class CategoryDto(
    val id: String,
    val name: String,
    @SerialName("parent_id")      val parentId: String? = null,
    @SerialName("icon_url")       val iconUrl: String? = null,
    @SerialName("display_order")  val displayOrder: Int = 0,
    @SerialName("created_at")     val createdAt: String = "",
)

@Serializable
data class ProductDto(
    val id: String = "",
    @SerialName("customer_id")      val customerId: String,
    @SerialName("category_id")      val categoryId: String,
    val brand: String? = null,
    val model: String? = null,
    @SerialName("issue_description") val issueDescription: String,
    @SerialName("media_urls")        val mediaUrls: List<String> = emptyList(),
    @SerialName("ai_diagnosis")      val aiDiagnosis: AiDiagnosisDto? = null,
    @SerialName("created_at")        val createdAt: String = "",
)

@Serializable
data class AiDiagnosisDto(
    @SerialName("issue_labels")         val issueLabels: List<String> = emptyList(),
    @SerialName("confidence_scores")    val confidenceScores: List<Double> = emptyList(),
    @SerialName("estimated_cost_range") val estimatedCostRange: String? = null,
    @SerialName("recommended_action")   val recommendedAction: String? = null,
    @SerialName("severity")             val severity: String? = null,
)

@Serializable
data class BookingDto(
    val id: String = "",
    @SerialName("product_id")       val productId: String,
    @SerialName("customer_id")      val customerId: String,
    @SerialName("provider_id")      val providerId: String? = null,
    val status: String = "booked",
    @SerialName("estimated_cost")   val estimatedCost: Double? = null,
    @SerialName("final_cost")       val finalCost: Double? = null,
    @SerialName("scheduled_at")     val scheduledAt: String? = null,
    @SerialName("service_type")     val serviceType: String = "in_store",
    @SerialName("customer_address") val customerAddress: String? = null,
    val notes: String? = null,
    @SerialName("created_at")       val createdAt: String = "",
    @SerialName("updated_at")       val updatedAt: String = "",
)

@Serializable
data class RepairStatusLogDto(
    val id: String,
    @SerialName("booking_id")  val bookingId: String,
    val status: String,
    val note: String? = null,
    @SerialName("changed_by")  val changedBy: String,
    @SerialName("changed_at")  val changedAt: String = "",
)

@Serializable
data class QuotationDto(
    val id: String,
    @SerialName("booking_id")           val bookingId: String,
    @SerialName("diagnosis_notes")      val diagnosisNotes: String,
    @SerialName("quoted_amount")        val quotedAmount: Double,
    @SerialName("parts_breakdown")      val partsBreakdown: String? = null,
    @SerialName("labour_cost")          val labourCost: Double? = null,
    @SerialName("approved_by_customer") val approvedByCustomer: Boolean? = null,
    @SerialName("responded_at")         val respondedAt: String? = null,
    @SerialName("created_at")           val createdAt: String = "",
)

@Serializable
data class PaymentDto(
    val id: String,
    @SerialName("booking_id")      val bookingId: String,
    val amount: Double,
    val method: String = "razorpay",
    val status: String = "pending",
    @SerialName("transaction_ref") val transactionRef: String? = null,
    @SerialName("paid_at")         val paidAt: String? = null,
    @SerialName("created_at")      val createdAt: String = "",
)

@Serializable
data class WarrantyDto(
    val id: String,
    @SerialName("booking_id")    val bookingId: String,
    @SerialName("duration_days") val durationDays: Int,
    @SerialName("starts_at")     val startsAt: String,
    @SerialName("expires_at")    val expiresAt: String,
    val terms: String? = null,
    @SerialName("created_at")    val createdAt: String = "",
)

@Serializable
data class ReviewDto(
    val id: String,
    @SerialName("booking_id")      val bookingId: String,
    @SerialName("customer_id")     val customerId: String,
    @SerialName("provider_id")     val providerId: String,
    val rating: Double,
    @SerialName("quality_score")   val qualityScore: Int? = null,
    @SerialName("price_score")     val priceScore: Int? = null,
    @SerialName("timeliness_score") val timelinessScore: Int? = null,
    val comment: String? = null,
    @SerialName("created_at")      val createdAt: String = "",
)

@Serializable
data class NotificationDto(
    val id: String,
    @SerialName("user_id")    val userId: String,
    val type: String,
    val title: String,
    val body: String,
    val payload: String = "{}",    // JSON string
    val read: Boolean = false,
    @SerialName("created_at") val createdAt: String = "",
)

// ── Enriched / joined types used in UI ───────────────────────

@Serializable
data class NearbyProviderDto(
    val id: String,
    @SerialName("user_id")             val userId: String,
    @SerialName("business_name")       val businessName: String,
    val description: String? = null,
    val categories: List<String> = emptyList(),
    @SerialName("rating_avg")          val ratingAvg: Double,
    @SerialName("total_reviews")       val totalReviews: Int,
    @SerialName("service_radius_km")   val serviceRadiusKm: Int,
    @SerialName("doorstep_available")  val doorstepAvailable: Boolean,
    val address: String? = null,
    @SerialName("distance_km")         val distanceKm: Double,
    @SerialName("provider_name")       val providerName: String,
    @SerialName("provider_avatar_url") val providerAvatarUrl: String? = null,
)

// ── Admin & Governance DTOs ──────────────────────────────────

@Serializable
data class AdminMetricsDto(
    val totalBookings: Int = 0,
    val activeRepairs: Int = 0,
    val pendingVerifications: Int = 0,
    val totalUsers: Int = 0,
    val settledGmv: Double = 0.0,
)

@Serializable
data class ProviderApplicationDto(
    val id: String,
    @SerialName("user_id")              val userId: String = "",
    @SerialName("business_name")        val businessName: String = "",
    val description: String? = null,
    val categories: List<String> = emptyList(),
    @SerialName("verification_status")  val verificationStatus: String = "pending",
    @SerialName("rating_avg")           val ratingAvg: Double = 0.0,
    @SerialName("total_reviews")        val totalReviews: Int = 0,
    @SerialName("service_radius_km")    val serviceRadiusKm: Int = 10,
    @SerialName("doorstep_available")   val doorstepAvailable: Boolean = false,
    val address: String? = null,
    @SerialName("created_at")           val createdAt: String = "",
    val user: UserDto? = null,
)
