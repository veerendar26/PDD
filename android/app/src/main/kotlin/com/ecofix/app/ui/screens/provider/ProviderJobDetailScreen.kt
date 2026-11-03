package com.ecofix.app.ui.screens.provider

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import com.ecofix.app.ui.viewmodel.BookingViewModel

private val BrandGreen  = Color(0xFF10B981)
private val Surface0    = Color(0xFF0A0F1A)
private val Surface100  = Color(0xFF1E293B)
private val TextPrimary = Color(0xFFF1F5F9)
private val TextSecondary = Color(0xFF94A3B8)
private val TextMuted   = Color(0xFF64748B)
private val WarningAmber = Color(0xFFF59E0B)

private val PROVIDER_ACTIONS = mapOf(
    "booked"    to ("assigned"          to "Accept Job"),
    "assigned"  to ("diagnosis"         to "Start Diagnosis"),
    "diagnosis" to ("awaiting_approval" to "Submit Quotation"),
    "in_repair" to ("quality_check"     to "Move to Quality Check"),
    "quality_check" to ("completed"     to "Mark as Completed"),
)

@Composable
fun ProviderJobDetailScreen(
    bookingId: String,
    viewModel: BookingViewModel = hiltViewModel(),
    providerVm: com.ecofix.app.ui.viewmodel.ProviderViewModel = hiltViewModel(),
    onBack: () -> Unit,
) {
    val state   by viewModel.detailState.collectAsState()
    val booking = state.booking

    var diagnosisNotes by remember { mutableStateOf("") }
    var quotedAmount   by remember { mutableStateOf("") }
    var showQuotationForm by remember { mutableStateOf(false) }
    var updating by remember { mutableStateOf(false) }

    LaunchedEffect(bookingId) { viewModel.loadBookingDetail(bookingId) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Surface0)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        if (state.isLoading) {
            CircularProgressIndicator(color = BrandGreen, modifier = Modifier.align(Alignment.Center))
        } else if (booking == null) {
            Text("Booking not found", color = TextSecondary, modifier = Modifier.align(Alignment.Center))
        } else {
            val action = PROVIDER_ACTIONS[booking.status]

            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // Header
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = TextSecondary)
                        }
                        Column {
                            Text("Job Detail", fontSize = 22.sp, fontWeight = FontWeight.Black, color = TextPrimary)
                            Text("#${bookingId.take(8).uppercase()}", fontSize = 12.sp, color = TextMuted)
                        }
                    }
                }

                // Status badge
                item {
                    val statusColor = when (booking.status) {
                        "booked"            -> Color(0xFF60A5FA)
                        "assigned"          -> Color(0xFFC084FC)
                        "diagnosis"         -> Color(0xFFFBBF24)
                        "awaiting_approval" -> WarningAmber
                        "in_repair"         -> BrandGreen
                        "quality_check"     -> Color(0xFF2DD4BF)
                        "completed"         -> Color(0xFF4ADE80)
                        else                -> TextMuted
                    }
                    Surface(color = statusColor.copy(alpha = 0.12f), shape = RoundedCornerShape(12.dp)) {
                        Text(
                            booking.status.replace("_", " ").replaceFirstChar { it.uppercase() },
                            color = statusColor, fontWeight = FontWeight.Bold, fontSize = 14.sp,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        )
                    }
                }

                // Job details card
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = Surface100), shape = RoundedCornerShape(20.dp)) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text("Job Information", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 16.sp)
                            Spacer(Modifier.height(12.dp))
                            DetailItem("Service Type", booking.serviceType.replace("_", " ").replaceFirstChar { it.uppercase() })
                            booking.estimatedCost?.let { DetailItem("Estimate", "₹${String.format("%,.0f", it)}") }
                            booking.customerAddress?.let { DetailItem("Address", it) }
                            booking.scheduledAt?.let { DetailItem("Scheduled", it.take(16).replace("T", " ")) }
                        }
                    }
                }

                // Quotation form (when moving to awaiting_approval)
                if (showQuotationForm) {
                    item {
                        Card(colors = CardDefaults.cardColors(containerColor = Surface100), shape = RoundedCornerShape(20.dp)) {
                            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text("Submit Quotation", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 16.sp)

                                OutlinedTextField(
                                    value = diagnosisNotes,
                                    onValueChange = { diagnosisNotes = it },
                                    label = { Text("Diagnosis Notes") },
                                    modifier = Modifier.fillMaxWidth(),
                                    minLines = 3,
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = BrandGreen,
                                        focusedLabelColor  = BrandGreen,
                                        unfocusedBorderColor = Color(0xFF475569),
                                        unfocusedLabelColor  = TextMuted,
                                        focusedTextColor   = TextPrimary,
                                        unfocusedTextColor = TextPrimary,
                                    ),
                                )

                                OutlinedTextField(
                                    value = quotedAmount,
                                    onValueChange = { quotedAmount = it },
                                    label = { Text("Quoted Amount (₹)") },
                                    modifier = Modifier.fillMaxWidth(),
                                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal
                                    ),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = BrandGreen,
                                        focusedLabelColor  = BrandGreen,
                                        unfocusedBorderColor = Color(0xFF475569),
                                        unfocusedLabelColor  = TextMuted,
                                        focusedTextColor   = TextPrimary,
                                        unfocusedTextColor = TextPrimary,
                                    ),
                                )
                            }
                        }
                    }
                }

                // Action button
                if (action != null && booking.status != "completed") {
                    item {
                        val (nextStatus, actionLabel) = action

                        Button(
                            onClick = {
                                if (nextStatus == "awaiting_approval" && !showQuotationForm) {
                                    showQuotationForm = true
                                } else if (nextStatus == "awaiting_approval" && showQuotationForm) {
                                    val amount = quotedAmount.toDoubleOrNull() ?: 0.0
                                    updating = true
                                    providerVm.submitQuotationAndProgress(
                                        bookingId = bookingId,
                                        diagnosisNotes = diagnosisNotes.ifBlank { "Diagnostic inspection completed" },
                                        quotedAmount = amount,
                                        onSuccess = { updating = false; onBack() },
                                        onError   = { updating = false },
                                    )
                                } else {
                                    updating = true
                                    providerVm.updateJobStatus(
                                        bookingId = bookingId,
                                        newStatus = nextStatus,
                                        onSuccess = { updating = false; onBack() },
                                        onError   = { updating = false },
                                    )
                                }
                            },
                            colors  = ButtonDefaults.buttonColors(containerColor = BrandGreen),
                            shape   = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            enabled = !updating,
                        ) {
                            if (updating) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    if (nextStatus == "awaiting_approval" && !showQuotationForm) "Fill Quotation" else actionLabel,
                                    fontWeight = FontWeight.Bold, fontSize = 15.sp,
                                )
                            }
                        }
                    }
                }

                if (booking.status == "completed") {
                    item {
                        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF052E16)), shape = RoundedCornerShape(20.dp)) {
                            Row(
                                modifier = Modifier.padding(20.dp).fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = BrandGreen, modifier = Modifier.size(32.dp))
                                Text("Job completed successfully!", fontWeight = FontWeight.Bold, color = BrandGreen, fontSize = 15.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DetailItem(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, color = TextMuted, fontSize = 13.sp)
        Text(value, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}
