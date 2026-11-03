package com.ecofix.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ecofix.app.data.model.*
import com.ecofix.app.data.remote.BookingRepository
import com.ecofix.app.data.remote.ProviderRepository
import com.ecofix.app.data.remote.SupabaseService
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProviderViewModel @Inject constructor(
    private val providerRepository: ProviderRepository,
    private val bookingRepository: BookingRepository,
    private val supabase: SupabaseService,
) : ViewModel() {

    private val _providerProfile = MutableStateFlow<ProviderProfileDto?>(null)
    val providerProfile: StateFlow<ProviderProfileDto?> = _providerProfile.asStateFlow()

    private val _activeJobs = MutableStateFlow<List<BookingDto>>(emptyList())
    val activeJobs: StateFlow<List<BookingDto>> = _activeJobs.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    fun loadDashboard() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val userId = supabase.client.auth.currentUserOrNull()?.id ?: return@launch
                val profile = providerRepository.getMyProfile(userId) ?: return@launch
                _providerProfile.value = profile
                _activeJobs.value = providerRepository.getAssignedJobs(profile.id)
            } catch (e: Exception) {
                // handled by UI
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun updateJobStatus(bookingId: String, newStatus: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                bookingRepository.updateStatus(bookingId, newStatus)
                // Refresh list
                _activeJobs.value = _activeJobs.value.map { job ->
                    if (job.id == bookingId) job.copy(status = newStatus) else job
                }.filter { it.status !in listOf("completed", "cancelled") }
                onSuccess()
            } catch (e: Exception) {
                onError(e.message ?: "Update failed")
            }
        }
    }

    fun submitQuotationAndProgress(
        bookingId: String,
        diagnosisNotes: String,
        quotedAmount: Double,
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
    ) {
        viewModelScope.launch {
            try {
                bookingRepository.submitQuotation(
                    QuotationDto(
                        id = "",
                        bookingId = bookingId,
                        diagnosisNotes = diagnosisNotes,
                        quotedAmount = quotedAmount,
                    )
                )
                bookingRepository.updateStatus(bookingId, "awaiting_approval")
                _activeJobs.value = _activeJobs.value.map { job ->
                    if (job.id == bookingId) job.copy(status = "awaiting_approval") else job
                }
                onSuccess()
            } catch (e: Exception) {
                onError(e.message ?: "Failed to submit quotation")
            }
        }
    }
}
