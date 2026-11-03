package com.ecofix.app.ui.screens.provider

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ecofix.app.data.model.ProviderProfileDto
import com.ecofix.app.data.remote.ProviderRepository
import com.ecofix.app.data.remote.SupabaseService
import com.ecofix.app.ui.viewmodel.AuthViewModel
import kotlinx.coroutines.launch

private val BrandGreen   = Color(0xFF10B981)
private val Surface0     = Color(0xFF0A0F1A)
private val Surface100   = Color(0xFF1E293B)
private val Surface200   = Color(0xFF334155)
private val TextPrimary  = Color(0xFFF1F5F9)
private val TextSecondary = Color(0xFF94A3B8)
private val TextMuted    = Color(0xFF64748B)
private val WarningAmber = Color(0xFFF59E0B)
private val CoralRed     = Color(0xFFEF4444)

@Composable
fun ProviderPendingScreen(
    providerRepository: ProviderRepository = ProviderRepository(SupabaseService()),
    authViewModel: AuthViewModel = hiltViewModel(),
    onApproved: () -> Unit,
    onLogout: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var profile by remember { mutableStateOf<ProviderProfileDto?>(null) }
    var isChecking by remember { mutableStateOf(false) }

    fun checkStatus() {
        val user = authViewModel.getCurrentUser() ?: return
        scope.launch {
            isChecking = true
            try {
                val p = providerRepository.getMyProfile(user.id)
                profile = p
                if (p?.verificationStatus == "approved") {
                    onApproved()
                }
            } catch (_: Exception) {}
            finally {
                isChecking = false
            }
        }
    }

    LaunchedEffect(Unit) {
        checkStatus()
    }

    val isRejected = profile?.verificationStatus == "rejected"
    val accentColor = if (isRejected) CoralRed else WarningAmber
    val title = if (isRejected) "Application Rejected" else "Application Under Review"
    val description = if (isRejected) {
        "Your technician application was not approved at this time. Please contact support or update your credentials."
    } else {
        "Your technician profile has been submitted and is currently being verified by the EcoFix administration team."
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Surface0)
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Surface100),
            shape = RoundedCornerShape(24.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Surface200),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Status Icon with Pulse Ring
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .background(accentColor.copy(alpha = 0.15f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        if (isRejected) Icons.Default.Close else Icons.Default.Schedule,
                        contentDescription = null,
                        tint = accentColor,
                        modifier = Modifier.size(36.dp)
                    )
                }

                Text(
                    title,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Text(
                    description,
                    fontSize = 13.sp,
                    color = TextSecondary,
                    textAlign = TextAlign.Center,
                    lineHeight = 18.sp
                )

                // Info card if profile exists
                profile?.let { p ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Surface0),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Business Name", fontSize = 12.sp, color = TextMuted)
                                Text(p.businessName, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Current Status", fontSize = 12.sp, color = TextMuted)
                                Text(
                                    p.verificationStatus.uppercase(),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = accentColor
                                )
                            }
                        }
                    }
                }

                Spacer(Modifier.height(8.dp))

                // Action Buttons
                Button(
                    onClick = { checkStatus() },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandGreen),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    enabled = !isChecking
                ) {
                    if (isChecking) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Refresh Status", fontWeight = FontWeight.Bold)
                    }
                }

                OutlinedButton(
                    onClick = {
                        authViewModel.signOut()
                        onLogout()
                    },
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = TextSecondary),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Surface200),
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Sign Out", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
