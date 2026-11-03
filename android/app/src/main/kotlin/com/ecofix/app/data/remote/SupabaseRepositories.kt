package com.ecofix.app.data.remote

import com.ecofix.app.BuildConfig
import com.ecofix.app.data.model.*
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.functions.Functions
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.postgrest.rpc
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage
import io.github.jan.supabase.annotations.SupabaseInternal
import io.ktor.client.plugins.HttpTimeout
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Singleton

private val repoJson = Json { ignoreUnknownKeys = true; isLenient = true; encodeDefaults = false }

// ── Supabase singleton (injected via Hilt) ───────────────────

@OptIn(SupabaseInternal::class)
@Singleton
class SupabaseService @Inject constructor() {
    val client: SupabaseClient = createSupabaseClient(
        supabaseUrl    = BuildConfig.SUPABASE_URL.ifBlank { "https://wiueemknsjfwisxfmcox.supabase.co" },
        supabaseKey    = BuildConfig.SUPABASE_ANON_KEY.ifBlank { "sb_publishable__9RdFy3AqCtefgoRHsT_0g_eraq4YDr" },
    ) {
        httpConfig {
            install(HttpTimeout) {
                connectTimeoutMillis = 30_000L
                requestTimeoutMillis = 60_000L
                socketTimeoutMillis  = 60_000L
            }
        }
        install(Auth)
        install(Postgrest)
        install(Realtime)
        install(Storage)
        install(Functions)
    }
}

// ── Repository: Bookings ─────────────────────────────────────

@Singleton
class BookingRepository @Inject constructor(
    private val supabase: SupabaseService,
) {
    private val db get() = supabase.client

    /** Fetch all bookings for the logged-in customer */
    suspend fun getMyBookings(): List<BookingDto> =
        db.postgrest["bookings"]
            .select {
                order("created_at", Order.DESCENDING)
            }
            .decodeList<BookingDto>()

    /** Fetch a single booking with full detail */
    suspend fun getBookingById(bookingId: String): BookingDto =
        db.postgrest["bookings"]
            .select { filter { eq("id", bookingId) } }
            .decodeSingle<BookingDto>()

    /** Create a new booking */
    suspend fun createBooking(booking: BookingDto): BookingDto {
        val payload = buildJsonObject {
            if (booking.id.isNotBlank()) put("id", booking.id)
            put("product_id", booking.productId)
            put("customer_id", booking.customerId)
            booking.providerId?.let { if (it.isNotBlank()) put("provider_id", it) }
            put("status", booking.status)
            booking.estimatedCost?.let { put("estimated_cost", it) }
            booking.finalCost?.let { put("final_cost", it) }
            booking.scheduledAt?.let { if (it.isNotBlank()) put("scheduled_at", it) }
            put("service_type", booking.serviceType)
            booking.customerAddress?.let { if (it.isNotBlank()) put("customer_address", it) }
            booking.notes?.let { if (it.isNotBlank()) put("notes", it) }
        }
        return db.postgrest["bookings"]
            .insert(payload) { select() }
            .decodeSingle<BookingDto>()
    }

    /** Update booking status (provider action) */
    suspend fun updateStatus(bookingId: String, newStatus: String) {
        db.postgrest["bookings"]
            .update({ set("status", newStatus) }) {
                filter { eq("id", bookingId) }
            }
    }

    /** Get status log for a booking */
    suspend fun getStatusLog(bookingId: String): List<RepairStatusLogDto> =
        db.postgrest["repair_status_log"]
            .select {
                filter { eq("booking_id", bookingId) }
                order("changed_at", Order.ASCENDING)
            }
            .decodeList<RepairStatusLogDto>()

    /** Submit a quotation */
    suspend fun submitQuotation(quotation: QuotationDto): QuotationDto {
        val payload = buildJsonObject {
            if (quotation.id.isNotBlank()) put("id", quotation.id)
            put("booking_id", quotation.bookingId)
            put("diagnosis_notes", quotation.diagnosisNotes)
            put("quoted_amount", quotation.quotedAmount)
            quotation.partsBreakdown?.let { put("parts_breakdown", it) }
            quotation.labourCost?.let { put("labour_cost", it) }
            quotation.approvedByCustomer?.let { put("approved_by_customer", it) }
            quotation.respondedAt?.let { put("responded_at", it) }
        }
        return db.postgrest["quotations"]
            .insert(payload) { select() }
            .decodeSingle<QuotationDto>()
    }

    /** Customer approve or reject quotation */
    suspend fun respondToQuotation(quotationId: String, approved: Boolean) {
        db.postgrest["quotations"]
            .update({ set("approved_by_customer", approved) }) {
                filter { eq("id", quotationId) }
            }
    }

    /** Fetch quotation for a booking */
    suspend fun getQuotation(bookingId: String): QuotationDto? =
        db.postgrest["quotations"]
            .select { filter { eq("booking_id", bookingId) } }
            .decodeSingleOrNull<QuotationDto>()

    /** Find nearby providers via RPC */
    suspend fun findNearbyProviders(
        lat: Double,
        lng: Double,
        radiusKm: Double = 25.0,
        categoryId: String? = null,
    ): List<NearbyProviderDto> =
        db.postgrest.rpc(
            "find_nearby_providers",
            buildJsonObject {
                put("lat", lat)
                put("lng", lng)
                put("radius_km", radiusKm)
                if (categoryId != null) put("category_id", categoryId)
            }
        ).decodeList<NearbyProviderDto>()

    /** Create a product record */
    suspend fun createProduct(product: ProductDto): ProductDto {
        val payload = buildJsonObject {
            if (product.id.isNotBlank()) put("id", product.id)
            put("customer_id", product.customerId)
            put("category_id", product.categoryId)
            product.brand?.let { if (it.isNotBlank()) put("brand", it) }
            product.model?.let { if (it.isNotBlank()) put("model", it) }
            put("issue_description", product.issueDescription)
            put("media_urls", JsonArray(product.mediaUrls.map { JsonPrimitive(it) }))
            product.aiDiagnosis?.let {
                put("ai_diagnosis", repoJson.encodeToJsonElement(AiDiagnosisDto.serializer(), it))
            }
        }
        return db.postgrest["products"]
            .insert(payload) { select() }
            .decodeSingle<ProductDto>()
    }

    /** Get payment record for a booking */
    suspend fun getPayment(bookingId: String): PaymentDto? =
        db.postgrest["payments"]
            .select { filter { eq("booking_id", bookingId) } }
            .decodeSingleOrNull<PaymentDto>()

    /** Create payment record */
    suspend fun createPayment(payment: PaymentDto): PaymentDto {
        val payload = buildJsonObject {
            if (payment.id.isNotBlank()) put("id", payment.id)
            put("booking_id", payment.bookingId)
            put("amount", payment.amount)
            put("method", payment.method)
            put("status", payment.status)
            payment.transactionRef?.let { put("transaction_ref", it) }
            payment.paidAt?.let { put("paid_at", it) }
        }
        return db.postgrest["payments"]
            .insert(payload) { select() }
            .decodeSingle<PaymentDto>()
    }

    /** Get warranty record for a booking */
    suspend fun getWarranty(bookingId: String): WarrantyDto? =
        db.postgrest["warranties"]
            .select { filter { eq("booking_id", bookingId) } }
            .decodeSingleOrNull<WarrantyDto>()

    /** Get review for a booking */
    suspend fun getReview(bookingId: String): ReviewDto? =
        db.postgrest["reviews"]
            .select { filter { eq("booking_id", bookingId) } }
            .decodeSingleOrNull<ReviewDto>()

    /** Submit a review for a completed repair */
    suspend fun submitReview(review: ReviewDto): ReviewDto {
        val payload = buildJsonObject {
            if (review.id.isNotBlank()) put("id", review.id)
            put("booking_id", review.bookingId)
            put("customer_id", review.customerId)
            put("provider_id", review.providerId)
            put("rating", review.rating)
            review.qualityScore?.let { put("quality_score", it) }
            review.priceScore?.let { put("price_score", it) }
            review.timelinessScore?.let { put("timeliness_score", it) }
            review.comment?.let { put("comment", it) }
        }
        return db.postgrest["reviews"]
            .insert(payload) { select() }
            .decodeSingle<ReviewDto>()
    }
}

// ── Repository: Categories ───────────────────────────────────

@Singleton
class CategoryRepository @Inject constructor(private val supabase: SupabaseService) {
    suspend fun getTopLevel(): List<CategoryDto> =
        supabase.client.postgrest["categories"]
            .select { filter { filter("parent_id", io.github.jan.supabase.postgrest.query.filter.FilterOperator.IS, null) }; order("display_order", Order.ASCENDING) }
            .decodeList<CategoryDto>()
}

// ── Repository: Notifications ────────────────────────────────

@Singleton
class NotificationRepository @Inject constructor(private val supabase: SupabaseService) {
    suspend fun getUnread(): List<NotificationDto> =
        supabase.client.postgrest["notifications"]
            .select { filter { eq("read", false) }; order("created_at", Order.DESCENDING) }
            .decodeList<NotificationDto>()

    suspend fun markAsRead(notificationId: String) {
        supabase.client.postgrest["notifications"]
            .update({ set("read", true) }) { filter { eq("id", notificationId) } }
    }
}

// ── Repository: Provider ─────────────────────────────────────

@Singleton
class ProviderRepository @Inject constructor(private val supabase: SupabaseService) {
    suspend fun getMyProfile(userId: String): ProviderProfileDto? =
        supabase.client.postgrest["provider_profiles"]
            .select { filter { eq("user_id", userId) } }
            .decodeSingleOrNull<ProviderProfileDto>()

    suspend fun createProfile(profile: ProviderProfileDto): ProviderProfileDto {
        val payload = buildJsonObject {
            if (profile.id.isNotBlank()) put("id", profile.id)
            put("user_id", profile.userId)
            put("business_name", profile.businessName)
            profile.description?.let { put("description", it) }
            put("categories", JsonArray(profile.categories.map { JsonPrimitive(it) }))
            put("verification_status", profile.verificationStatus)
            put("service_radius_km", profile.serviceRadiusKm)
            put("doorstep_available", profile.doorstepAvailable)
            profile.address?.let { put("address", it) }
        }
        return supabase.client.postgrest["provider_profiles"]
            .insert(payload) { select() }
            .decodeSingle<ProviderProfileDto>()
    }

    suspend fun getAssignedJobs(providerId: String): List<BookingDto> =
        supabase.client.postgrest["bookings"]
            .select {
                filter {
                    eq("provider_id", providerId)
                    neq("status", "completed")
                    neq("status", "cancelled")
                }
                order("created_at", Order.DESCENDING)
            }
            .decodeList<BookingDto>()

    suspend fun getAvailableJobs(): List<BookingDto> =
        supabase.client.postgrest["bookings"]
            .select {
                filter {
                    eq("status", "booked")
                }
                order("created_at", Order.DESCENDING)
            }
            .decodeList<BookingDto>()

    suspend fun claimJob(bookingId: String, providerId: String) {
        supabase.client.postgrest["bookings"]
            .update({
                set("provider_id", providerId)
                set("status", "assigned")
            }) {
                filter { eq("id", bookingId) }
            }
    }
}

// ── Repository: Admin & Governance ───────────────────────────

@Singleton
class AdminRepository @Inject constructor(private val supabase: SupabaseService) {
    private val db get() = supabase.client

    suspend fun getMetrics(): AdminMetricsDto {
        try {
            val allBookings = db.postgrest["bookings"].select().decodeList<BookingDto>()
            val active = allBookings.count { it.status !in listOf("completed", "cancelled") }
            val completed = allBookings.filter { it.status == "completed" }
            val gmv = completed.sumOf { it.finalCost ?: it.estimatedCost ?: 0.0 }

            val providers = db.postgrest["provider_profiles"].select().decodeList<ProviderProfileDto>()
            val pendingCount = providers.count { it.verificationStatus == "pending" }

            val allUsers = db.postgrest["users"].select().decodeList<UserDto>()

            return AdminMetricsDto(
                totalBookings = allBookings.size,
                activeRepairs = active,
                pendingVerifications = pendingCount,
                totalUsers = allUsers.size,
                settledGmv = gmv,
            )
        } catch (e: Exception) {
            return AdminMetricsDto()
        }
    }

    suspend fun getPendingApplications(): List<ProviderProfileDto> =
        db.postgrest["provider_profiles"]
            .select {
                filter { eq("verification_status", "pending") }
                order("created_at", Order.DESCENDING)
            }
            .decodeList<ProviderProfileDto>()

    suspend fun approveProvider(providerId: String) {
        db.postgrest["provider_profiles"]
            .update({
                set("verification_status", "approved")
            }) {
                filter { eq("id", providerId) }
            }
    }

    suspend fun rejectProvider(providerId: String) {
        db.postgrest["provider_profiles"]
            .update({
                set("verification_status", "rejected")
            }) {
                filter { eq("id", providerId) }
            }
    }

    suspend fun getAllBookings(status: String? = null): List<BookingDto> =
        db.postgrest["bookings"]
            .select {
                if (!status.isNullOrBlank() && status != "all") {
                    filter { eq("status", status) }
                }
                order("created_at", Order.DESCENDING)
            }
            .decodeList<BookingDto>()

    suspend fun getAllUsers(): List<UserDto> =
        db.postgrest["users"]
            .select {
                order("created_at", Order.DESCENDING)
            }
            .decodeList<UserDto>()

    suspend fun updateUserRole(userId: String, newRole: String) {
        db.postgrest["users"]
            .update({
                set("role", newRole)
            }) {
                filter { eq("id", userId) }
            }
    }
}
