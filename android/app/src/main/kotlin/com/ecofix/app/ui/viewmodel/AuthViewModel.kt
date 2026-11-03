package com.ecofix.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ecofix.app.data.remote.SupabaseService
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.user.UserInfo
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

import com.ecofix.app.data.model.ProviderProfileDto
import com.ecofix.app.data.model.UserDto
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

sealed class AuthState {
    object Loading       : AuthState()
    data class Authenticated(
        val user: UserInfo,
        val role: String,
        val verificationStatus: String = "approved",
    ) : AuthState()
    object Unauthenticated : AuthState()
    data class Error(val message: String) : AuthState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val supabase: SupabaseService,
) : ViewModel() {

    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val auth get() = supabase.client.auth

    init {
        checkSession()
    }

    fun getCurrentUser() = auth.currentUserOrNull()

    suspend fun getDatabaseRole(userId: String): String {
        return try {
            val userRow = supabase.client.postgrest["users"]
                .select { filter { eq("id", userId) } }
                .decodeSingleOrNull<UserDto>()
            userRow?.role ?: "customer"
        } catch (_: Exception) {
            "customer"
        }
    }

    suspend fun getVerificationStatus(userId: String): String {
        return try {
            val profile = supabase.client.postgrest["provider_profiles"]
                .select { filter { eq("user_id", userId) } }
                .decodeSingleOrNull<ProviderProfileDto>()
            profile?.verificationStatus ?: "pending"
        } catch (_: Exception) {
            "pending"
        }
    }

    fun checkSession() {
        viewModelScope.launch {
            try {
                val user = auth.currentUserOrNull()
                if (user != null) {
                    val role = getDatabaseRole(user.id)
                    val status = if (role == "technician") getVerificationStatus(user.id) else "approved"
                    _authState.value = AuthState.Authenticated(user, role, status)
                } else {
                    _authState.value = AuthState.Unauthenticated
                }
            } catch (e: Exception) {
                _authState.value = AuthState.Unauthenticated
            }
        }
    }

    fun signIn(email: String, password: String, onSuccess: (role: String, status: String) -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                _authState.value = AuthState.Loading
                auth.signInWith(Email) {
                    this.email    = email.trim().lowercase()
                    this.password = password.trim()
                }
                val user = auth.currentUserOrNull()!!
                val role = getDatabaseRole(user.id)
                val status = if (role == "technician") getVerificationStatus(user.id) else "approved"
                _authState.value = AuthState.Authenticated(user, role, status)
                onSuccess(role, status)
            } catch (e: Exception) {
                _authState.value = AuthState.Unauthenticated
                onError(formatAuthError(e))
            }
        }
    }

    fun signUp(
        name: String,
        email: String,
        password: String,
        phone: String,
        role: String,
        onSuccess: (role: String, status: String) -> Unit,
        onError: (String) -> Unit,
    ) {
        viewModelScope.launch {
            try {
                _authState.value = AuthState.Loading
                val cleanEmail = email.trim().lowercase()
                val cleanPassword = password.trim()
                auth.signUpWith(Email) {
                    this.email    = cleanEmail
                    this.password = cleanPassword
                    data = kotlinx.serialization.json.buildJsonObject {
                        put("name",  kotlinx.serialization.json.JsonPrimitive(name.trim()))
                        put("phone", kotlinx.serialization.json.JsonPrimitive(phone.trim()))
                        put("role",  kotlinx.serialization.json.JsonPrimitive(role))
                    }
                }
                val user = auth.currentUserOrNull()
                if (user != null) {
                    val dbRole = getDatabaseRole(user.id)
                    val status = if (dbRole == "technician") {
                        try {
                            supabase.client.postgrest["provider_profiles"].insert(
                                buildJsonObject {
                                    put("user_id", user.id)
                                    put("business_name", name.trim())
                                    put("verification_status", "pending")
                                }
                            )
                        } catch (_: Exception) {}
                        "pending"
                    } else "approved"

                    _authState.value = AuthState.Authenticated(user, dbRole, status)
                    onSuccess(dbRole, status)
                } else {
                    try {
                        auth.signInWith(Email) {
                            this.email    = cleanEmail
                            this.password = cleanPassword
                        }
                        val loggedInUser = auth.currentUserOrNull()
                        if (loggedInUser != null) {
                            val dbRole = getDatabaseRole(loggedInUser.id)
                            val status = if (dbRole == "technician") {
                                try {
                                    supabase.client.postgrest["provider_profiles"].insert(
                                        buildJsonObject {
                                            put("user_id", loggedInUser.id)
                                            put("business_name", name.trim())
                                            put("verification_status", "pending")
                                        }
                                    )
                                } catch (_: Exception) {}
                                "pending"
                            } else "approved"

                            _authState.value = AuthState.Authenticated(loggedInUser, dbRole, status)
                            onSuccess(dbRole, status)
                        } else {
                            _authState.value = AuthState.Unauthenticated
                            onError("Account created. Please sign in.")
                        }
                    } catch (_: Exception) {
                        _authState.value = AuthState.Unauthenticated
                        onError("Account created. Please verify your email or disable Confirm Email in Supabase.")
                    }
                }
            } catch (e: Exception) {
                _authState.value = AuthState.Unauthenticated
                onError(formatAuthError(e))
            }
        }
    }

    private fun formatAuthError(e: Throwable): String {
        val msg = e.localizedMessage ?: e.message ?: "Authentication failed"
        return when {
            msg.contains("timeout", ignoreCase = true) || msg.contains("timed out", ignoreCase = true) ->
                "Connection timed out. Please check your network connection and try again."
            msg.contains("rate_limit", ignoreCase = true) ->
                "Rate limit exceeded. Please wait a few moments before trying again."
            msg.contains("already registered", ignoreCase = true) || msg.contains("already exists", ignoreCase = true) ->
                "An account with this email already exists. Please sign in instead."
            msg.contains("invalid login credentials", ignoreCase = true) || msg.contains("invalid credentials", ignoreCase = true) ->
                "Invalid email or password. Please verify and try again."
            msg.contains("email not confirmed", ignoreCase = true) ->
                "Email not confirmed. Please check your inbox for the confirmation link."
            msg.contains("Unable to resolve host", ignoreCase = true) || msg.contains("ConnectException", ignoreCase = true) ->
                "Cannot connect to EcoFix server. Please check your internet connection."
            else -> msg
        }
    }

    fun signOut() {
        viewModelScope.launch {
            try {
                auth.signOut()
                _authState.value = AuthState.Unauthenticated
            } catch (e: Exception) {
                _authState.value = AuthState.Unauthenticated
            }
        }
    }
}
