package com.ecofix.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ecofix.app.data.model.AdminMetricsDto
import com.ecofix.app.data.model.BookingDto
import com.ecofix.app.data.model.ProviderProfileDto
import com.ecofix.app.data.model.UserDto
import com.ecofix.app.data.remote.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AdminViewModel @Inject constructor(
    private val adminRepository: AdminRepository,
) : ViewModel() {

    private val _metrics = MutableStateFlow(AdminMetricsDto())
    val metrics: StateFlow<AdminMetricsDto> = _metrics.asStateFlow()

    private val _pendingProviders = MutableStateFlow<List<ProviderProfileDto>>(emptyList())
    val pendingProviders: StateFlow<List<ProviderProfileDto>> = _pendingProviders.asStateFlow()

    private val _allBookings = MutableStateFlow<List<BookingDto>>(emptyList())
    val allBookings: StateFlow<List<BookingDto>> = _allBookings.asStateFlow()

    private val _allUsers = MutableStateFlow<List<UserDto>>(emptyList())
    val allUsers: StateFlow<List<UserDto>> = _allUsers.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    fun loadAll() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                _metrics.value = adminRepository.getMetrics()
                _pendingProviders.value = adminRepository.getPendingApplications()
                _allBookings.value = adminRepository.getAllBookings()
                _allUsers.value = adminRepository.getAllUsers()
            } catch (_: Exception) {}
            finally {
                _isLoading.value = false
            }
        }
    }

    fun approveProvider(id: String) {
        viewModelScope.launch {
            try {
                adminRepository.approveProvider(id)
                loadAll()
            } catch (_: Exception) {}
        }
    }

    fun rejectProvider(id: String) {
        viewModelScope.launch {
            try {
                adminRepository.rejectProvider(id)
                loadAll()
            } catch (_: Exception) {}
        }
    }

    fun filterBookings(status: String) {
        viewModelScope.launch {
            try {
                _allBookings.value = adminRepository.getAllBookings(if (status == "all") null else status)
            } catch (_: Exception) {}
        }
    }
}
