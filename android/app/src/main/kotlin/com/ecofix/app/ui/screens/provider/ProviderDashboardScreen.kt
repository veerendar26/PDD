package com.ecofix.app.ui.screens.provider

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ecofix.app.data.model.BookingDto
import com.ecofix.app.ui.viewmodel.AuthViewModel
import com.ecofix.app.ui.viewmodel.ProviderViewModel

private val BrandGreen  = Color(0xFF10B981)
private val Surface0    = Color(0xFF0A0F1A)
private val Surface100  = Color(0xFF1E293B)
private val TextPrimary = Color(0xFFF1F5F9)
private val TextSecondary = Color(0xFF94A3B8)
private val TextMuted   = Color(0xFF64748B)

@Composable
fun ProviderDashboardScreen(
    viewModel: ProviderViewModel = hiltViewModel(),
    authViewModel: AuthViewModel = hiltViewModel(),
    onOpenJob: (String) -> Unit,
    onLogout: () -> Unit = {},
) {
    val jobs          by viewModel.activeJobs.collectAsState()
    val providerProfile by viewModel.providerProfile.collectAsState()
    val isLoading     by viewModel.isLoading.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadDashboard() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Surface0)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        if (isLoading) {
            CircularProgressIndicator(color = BrandGreen, modifier = Modifier.align(Alignment.Center))
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                providerProfile?.businessName ?: "Technician Portal",
                                fontSize = 24.sp, fontWeight = FontWeight.Black, color = TextPrimary,
                            )
                            providerProfile?.let { pp ->
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFBBF24), modifier = Modifier.size(14.dp))
                                    Text("${pp.ratingAvg} (${pp.totalReviews} reviews)", fontSize = 13.sp, color = TextSecondary)
                                }
                            }
                        }

                        IconButton(
                            onClick = {
                                authViewModel.signOut()
                                onLogout()
                            },
                            modifier = Modifier
                                .size(44.dp)
                                .background(Surface100, CircleShape)
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.ExitToApp,
                                contentDescription = "Sign Out",
                                tint = Color(0xFFEF4444)
                            )
                        }
                    }
                }

                // Stats row
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        ProviderStatCard("Active Jobs", jobs.size.toString(), BrandGreen, Modifier.weight(1f))
                        ProviderStatCard("Rating", "${providerProfile?.ratingAvg ?: "—"} ★", Color(0xFFFBBF24), Modifier.weight(1f))
                    }
                }

                item {
                    Text("Active Jobs", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextMuted, modifier = Modifier.padding(top = 8.dp))
                }

                if (jobs.isEmpty()) {
                    item {
                        Card(colors = CardDefaults.cardColors(containerColor = Surface100), shape = RoundedCornerShape(20.dp)) {
                            Column(
                                modifier = Modifier.fillMaxWidth().padding(40.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = BrandGreen, modifier = Modifier.size(48.dp))
                                Spacer(Modifier.height(12.dp))
                                Text("All caught up! 🎉", fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text("No active jobs right now.", color = TextSecondary, fontSize = 13.sp)
                            }
                        }
                    }
                }

                items(jobs, key = { it.id }) { job ->
                    ProviderJobCard(job = job, onClick = { onOpenJob(job.id) })
                }
            }
        }
    }
}

@Composable
private fun ProviderStatCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(colors = CardDefaults.cardColors(containerColor = Surface100), shape = RoundedCornerShape(16.dp), modifier = modifier) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(value, fontSize = 22.sp, fontWeight = FontWeight.Black, color = color)
            Text(label, fontSize = 12.sp, color = TextSecondary)
        }
    }
}

@Composable
private fun ProviderJobCard(job: BookingDto, onClick: () -> Unit) {
    val statusColor = when (job.status) {
        "booked"  -> Color(0xFF60A5FA)
        "assigned" -> Color(0xFFC084FC)
        "diagnosis" -> Color(0xFFFBBF24)
        "awaiting_approval" -> Color(0xFFFB923C)
        "in_repair" -> BrandGreen
        "quality_check" -> Color(0xFF2DD4BF)
        else -> TextMuted
    }

    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Surface100),
        shape  = RoundedCornerShape(16.dp),
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Job #${job.id.take(8).uppercase()}",
                    fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 15.sp,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    job.serviceType.replace("_", " ").replaceFirstChar { it.uppercase() },
                    color = TextSecondary, fontSize = 13.sp,
                )
                Spacer(Modifier.height(8.dp))
                Surface(color = statusColor.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp)) {
                    Text(
                        job.status.replace("_", " ").replaceFirstChar { it.uppercase() },
                        color = statusColor, fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    )
                }
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextMuted)
        }
    }
}
