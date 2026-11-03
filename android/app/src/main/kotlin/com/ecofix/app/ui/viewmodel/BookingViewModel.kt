package com.ecofix.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ecofix.app.data.local.BookingDao
import com.ecofix.app.data.local.StatusLogDao
import com.ecofix.app.data.model.*
import com.ecofix.app.data.remote.BookingRepository
import com.ecofix.app.data.remote.SupabaseService
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.realtime.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BookingDetailUiState(
    val booking: BookingDto? = null,
    val statusLog: List<RepairStatusLogDto> = emptyList(),
    val quotation: QuotationDto? = null,
    val payment: PaymentDto? = null,
    val warranty: WarrantyDto? = null,
    val review: ReviewDto? = null,
    val isLoading: Boolean = true,
    val isSubmittingReview: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class BookingViewModel @Inject constructor(
    private val repository: BookingRepository,
    private val supabase: SupabaseService,
    private val bookingDao: BookingDao,
    private val statusLogDao: StatusLogDao,
) : ViewModel() {

    private val _myBookings = MutableStateFlow<List<BookingDto>>(emptyList())
    val myBookings: StateFlow<List<BookingDto>> = _myBookings.asStateFlow()

    private val _detailState = MutableStateFlow(BookingDetailUiState())
    val detailState: StateFlow<BookingDetailUiState> = _detailState.asStateFlow()

    private val _notifications = MutableStateFlow<List<NotificationDto>>(emptyList())
    val notifications: StateFlow<List<NotificationDto>> = _notifications.asStateFlow()

    private var realtimeChannel: RealtimeChannel? = null

    fun loadNotifications() {
        viewModelScope.launch {
            try {
                val userId = supabase.client.auth.currentUserOrNull()?.id ?: return@launch
                val notes = supabase.client.postgrest["notifications"]
                    .select {
                        filter { eq("user_id", userId) }
                        order("created_at", Order.DESCENDING)
                    }
                    .decodeList<NotificationDto>()
                _notifications.value = notes
            } catch (_: Exception) {}
        }
    }

    fun markNotificationRead(id: String) {
        viewModelScope.launch {
            try {
                supabase.client.postgrest["notifications"]
                    .update({ set("read", true) }) { filter { eq("id", id) } }
                _notifications.value = _notifications.value.map {
                    if (it.id == id) it.copy(read = true) else it
                }
            } catch (_: Exception) {}
        }
    }

    fun loadMyBookings() {
        viewModelScope.launch {
            try {
                val bookings = repository.getMyBookings()
                _myBookings.value = bookings
            } catch (e: Exception) {
                // Fall back to Room cache on network error
                bookingDao.observeAll()
                    .collect { entities ->
                        _myBookings.value = entities.map { it.toDto() }
                    }
            }
        }
    }

    fun loadBookingDetail(bookingId: String) {
        viewModelScope.launch {
            _detailState.update { it.copy(isLoading = true, error = null) }
            try {
                val booking   = repository.getBookingById(bookingId)
                val statusLog = repository.getStatusLog(bookingId)
                val quotation = repository.getQuotation(bookingId)
                val payment   = repository.getPayment(bookingId)
                val warranty  = repository.getWarranty(bookingId)
                val review    = repository.getReview(bookingId)

                _detailState.update {
                    it.copy(
                        booking   = booking,
                        statusLog = statusLog,
                        quotation = quotation,
                        payment   = payment,
                        warranty  = warranty,
                        review    = review,
                        isLoading = false,
                    )
                }

                // Subscribe to realtime changes for this booking
                subscribeToBooking(bookingId)

            } catch (e: Exception) {
                _detailState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    /**
     * Real-time subscription to repair_status_log for this booking.
     *
     * This is the Android implementation of Section 6 item 2 of the sync
     * architecture: when a technician updates status (from web or Android),
     * this subscription fires and updates the customer's tracking UI within
     * milliseconds — no polling.
     */
    private fun subscribeToBooking(bookingId: String) {
        viewModelScope.launch {
            try {
                val channel = supabase.client.realtime.channel("booking-$bookingId")

                // Listen for new status log entries
                channel.postgresChangeFlow<PostgresAction.Insert>(schema = "public") {
                    table = "repair_status_log"
                    filter(io.github.jan.supabase.postgrest.query.filter.FilterOperation("booking_id", io.github.jan.supabase.postgrest.query.filter.FilterOperator.EQ, bookingId))
                }.onEach { change ->
                    val newEntry = change.decodeRecord<RepairStatusLogDto>()
                    _detailState.update { state ->
                        state.copy(
                            statusLog = state.statusLog + newEntry,
                            booking   = state.booking?.copy(status = newEntry.status),
                        )
                    }
                }.launchIn(viewModelScope)

                // Listen for quotation inserts
                channel.postgresChangeFlow<PostgresAction.Insert>(schema = "public") {
                    table = "quotations"
                    filter(io.github.jan.supabase.postgrest.query.filter.FilterOperation("booking_id", io.github.jan.supabase.postgrest.query.filter.FilterOperator.EQ, bookingId))
                }.onEach { change ->
                    val quotation = change.decodeRecord<QuotationDto>()
                    _detailState.update { it.copy(quotation = quotation) }
                }.launchIn(viewModelScope)

                channel.subscribe()
                realtimeChannel = channel

            } catch (e: Exception) {
                // Realtime unavailable — UI still shows cached data
            }
        }
    }

    suspend fun approveQuotation(quotationId: String, approved: Boolean) {
        repository.respondToQuotation(quotationId, approved)
        _detailState.update { state ->
            state.copy(quotation = state.quotation?.copy(approvedByCustomer = approved))
        }
    }

    fun submitReview(bookingId: String, rating: Double, comment: String) {
        viewModelScope.launch {
            _detailState.update { it.copy(isSubmittingReview = true) }
            try {
                val booking = _detailState.value.booking ?: return@launch
                val userId = supabase.client.auth.currentUserOrNull()?.id ?: return@launch
                val providerId = booking.providerId ?: return@launch

                val review = repository.submitReview(
                    ReviewDto(
                        id = "",
                        bookingId = bookingId,
                        customerId = userId,
                        providerId = providerId,
                        rating = rating,
                        comment = comment.takeIf { it.isNotBlank() },
                    )
                )
                _detailState.update { it.copy(review = review, isSubmittingReview = false) }
            } catch (e: Exception) {
                _detailState.update { it.copy(isSubmittingReview = false, error = e.message ?: "Review submission failed") }
            }
        }
    }

    fun recordPayment(bookingId: String, amount: Double, transactionRef: String) {
        viewModelScope.launch {
            try {
                val payment = repository.createPayment(
                    PaymentDto(
                        id = "",
                        bookingId = bookingId,
                        amount = amount,
                        method = "razorpay",
                        status = "success",
                        transactionRef = transactionRef,
                    )
                )
                _detailState.update { it.copy(payment = payment) }
            } catch (e: Exception) {
                _detailState.update { it.copy(error = e.message ?: "Payment recording failed") }
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        viewModelScope.launch {
            realtimeChannel?.unsubscribe()
        }
    }

    // Extension to convert Room entity back to DTO for display
    private fun com.ecofix.app.data.local.BookingEntity.toDto() = BookingDto(
        id              = id,
        productId       = productId,
        customerId      = customerId,
        providerId      = providerId,
        status          = status,
        estimatedCost   = estimatedCost,
        finalCost       = finalCost,
        scheduledAt     = scheduledAt,
        serviceType     = serviceType,
        customerAddress = customerAddress,
        notes           = notes,
        createdAt       = createdAt,
        updatedAt       = updatedAt,
    )
}
