package com.ecofix.app.ui.screens.customer

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import com.ecofix.app.data.model.RepairStatusLogDto
import com.ecofix.app.ui.viewmodel.BookingViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

private val BrandGreen  = Color(0xFF10B981)
private val Surface0    = Color(0xFF0A0F1A)
private val Surface100  = Color(0xFF1E293B)
private val Surface200  = Color(0xFF334155)
private val TextPrimary = Color(0xFFF1F5F9)
private val TextSecondary = Color(0xFF94A3B8)
private val TextMuted   = Color(0xFF64748B)
private val WarningAmber = Color(0xFFF59E0B)

private val STATUS_STEPS = listOf(
    Triple("booked",            "Booking Confirmed",       "Your booking is confirmed."),
    Triple("assigned",          "Technician Assigned",     "A technician has been assigned."),
    Triple("diagnosis",         "Diagnosis In Progress",   "Your device is being examined."),
    Triple("awaiting_approval", "Review Quotation",        "Please approve the repair quote."),
    Triple("in_repair",         "Repair In Progress",      "Your device is being repaired."),
    Triple("quality_check",     "Quality Check",           "Final quality inspection."),
    Triple("completed",         "Repair Completed ✓",      "Your device is ready!"),
)

@Composable
fun TrackingScreen(
    bookingId: String,
    viewModel: BookingViewModel = hiltViewModel(),
    onBack: () -> Unit,
) {
    val state by viewModel.detailState.collectAsState()

    LaunchedEffect(bookingId) { viewModel.loadBookingDetail(bookingId) }

    val booking   = state.booking
    val statusLog = state.statusLog
    val quotation = state.quotation
    val payment   = state.payment
    val warranty  = state.warranty
    val review    = state.review
    val scope     = rememberCoroutineScope()

    var reviewRating by remember { mutableDoubleStateOf(5.0) }
    var reviewComment by remember { mutableStateOf("") }
    var isPaying by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Surface0)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        if (state.isLoading) {
            CircularProgressIndicator(
                color    = BrandGreen,
                modifier = Modifier.align(Alignment.Center),
            )
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Back + title
                item {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = TextSecondary)
                        }
                        Column {
                            Text("Repair Tracking", fontSize = 22.sp, fontWeight = FontWeight.Black, color = TextPrimary)
                            Text(
                                "Booking #${bookingId.take(8).uppercase()}",
                                fontSize = 12.sp, color = TextMuted,
                            )
                        }
                    }
                }

                // Current status badge
                booking?.let { b ->
                    item {
                        val statusColor = statusColorFor(b.status)
                        Surface(
                            color = statusColor.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Text(
                                text = b.status.replace("_", " ").replaceFirstChar { it.uppercase() },
                                color = statusColor, fontWeight = FontWeight.Bold, fontSize = 14.sp,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            )
                        }
                    }
                }

                // ── Timeline ──────────────────────────────
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Surface100),
                        shape  = RoundedCornerShape(20.dp),
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                "Repair Timeline",
                                fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 16.sp,
                            )
                            Spacer(Modifier.height(20.dp))

                            val currentStepIdx = STATUS_STEPS.indexOfFirst { it.first == booking?.status }

                            STATUS_STEPS.forEachIndexed { i, (status, label, desc) ->
                                val isDone    = i < currentStepIdx
                                val isCurrent = i == currentStepIdx
                                val logEntry  = statusLog.find { it.status == status }

                                TimelineItem(
                                    label    = label,
                                    desc     = if (isCurrent) desc else null,
                                    time     = logEntry?.changedAt?.let { formatDate(it) },
                                    isDone   = isDone,
                                    isCurrent = isCurrent,
                                    isLast   = i == STATUS_STEPS.lastIndex,
                                )
                            }
                        }
                    }
                }

                // ── Quotation approval ────────────────────
                if (quotation != null && quotation.approvedByCustomer == null) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Surface100),
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = androidx.compose.ui.graphics.SolidColor(WarningAmber)
                            ),
                            shape = RoundedCornerShape(20.dp),
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Icon(Icons.Default.Warning, contentDescription = null, tint = WarningAmber, modifier = Modifier.size(20.dp))
                                    Text("Quotation Received", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 16.sp)
                                }
                                Spacer(Modifier.height(12.dp))
                                Text(quotation.diagnosisNotes, color = TextSecondary, fontSize = 14.sp)
                                Spacer(Modifier.height(12.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text("Quoted Amount", color = TextMuted, fontSize = 13.sp)
                                    Text(
                                        "₹${String.format("%,.0f", quotation.quotedAmount)}",
                                        fontSize = 24.sp, fontWeight = FontWeight.Black, color = BrandGreen,
                                    )
                                }
                                Spacer(Modifier.height(16.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Button(
                                        onClick = { scope.launch { viewModel.approveQuotation(quotation.id, true) } },
                                        colors  = ButtonDefaults.buttonColors(containerColor = BrandGreen),
                                        shape   = RoundedCornerShape(12.dp),
                                        modifier = Modifier.weight(1f),
                                    ) {
                                        Icon(Icons.Default.ThumbUp, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.width(6.dp))
                                        Text("Approve", fontWeight = FontWeight.Bold)
                                    }
                                    OutlinedButton(
                                        onClick = { scope.launch { viewModel.approveQuotation(quotation.id, false) } },
                                        colors  = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFF87171)),
                                        shape   = RoundedCornerShape(12.dp),
                                        modifier = Modifier.weight(1f),
                                    ) {
                                        Icon(Icons.Default.ThumbDown, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.width(6.dp))
                                        Text("Reject", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }

                // ── Payment Card (When completed) ─────────
                if (booking?.status == "completed") {
                    item {
                        if (payment != null) {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF064E3B)),
                                shape = RoundedCornerShape(20.dp),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(
                                    modifier = Modifier.padding(20.dp).fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                                ) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = BrandGreen, modifier = Modifier.size(28.dp))
                                    Column {
                                        Text("Payment Settled", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 15.sp)
                                        Text("₹${String.format("%,.0f", payment.amount)} paid via ${payment.method.uppercase()}", color = Color(0xFFA7F3D0), fontSize = 13.sp)
                                    }
                                }
                            }
                        } else {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Surface100),
                                shape = RoundedCornerShape(20.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, BrandGreen),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text("Payment Due", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 16.sp)
                                            Text("Repair complete. Please settle payment.", color = TextSecondary, fontSize = 12.sp)
                                        }
                                        Text(
                                            "₹${String.format("%,.0f", booking.finalCost ?: booking.estimatedCost ?: 0.0)}",
                                            fontSize = 20.sp,
                                            fontWeight = FontWeight.Black,
                                            color = BrandGreen,
                                        )
                                    }
                                    Button(
                                        onClick = {
                                            isPaying = true
                                            val amount = booking.finalCost ?: booking.estimatedCost ?: 0.0
                                            viewModel.recordPayment(booking.id, amount, "RZP_${UUID.randomUUID().toString().take(8).uppercase()}")
                                            isPaying = false
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = BrandGreen),
                                        shape = RoundedCornerShape(14.dp),
                                        modifier = Modifier.fillMaxWidth().height(48.dp),
                                        enabled = !isPaying,
                                    ) {
                                        Icon(Icons.Default.CreditCard, contentDescription = null, modifier = Modifier.size(18.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Text("Pay Now via Razorpay", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }

                // ── Warranty Card ─────────────────────────
                if (warranty != null) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Surface100),
                            shape = RoundedCornerShape(20.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF3B82F6)),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                modifier = Modifier.padding(18.dp).fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                Box(
                                    modifier = Modifier.size(44.dp).background(Color(0xFF3B82F6).copy(alpha = 0.15f), CircleShape),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(Icons.Default.Security, contentDescription = null, tint = Color(0xFF60A5FA), modifier = Modifier.size(24.dp))
                                }
                                Column {
                                    Text("${warranty.durationDays}-Day Digital Warranty Active", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 15.sp)
                                    Text("Valid through ${formatDate(warranty.expiresAt)}", color = TextSecondary, fontSize = 12.sp)
                                    warranty.terms?.let { Text(it, color = TextMuted, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp)) }
                                }
                            }
                        }
                    }
                }

                // ── Customer Review Card ───────────────────
                if (booking?.status == "completed") {
                    item {
                        if (review != null) {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Surface100),
                                shape = RoundedCornerShape(20.dp),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("Your Review", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 15.sp)
                                        Text("•", color = TextMuted)
                                        Text("${review.rating.toInt()} ★", color = Color(0xFFFBBF24), fontWeight = FontWeight.Bold)
                                    }
                                    review.comment?.let {
                                        Text(it, color = TextSecondary, fontSize = 13.sp)
                                    }
                                }
                            }
                        } else {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Surface100),
                                shape = RoundedCornerShape(20.dp),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text("Rate Your Repair Experience", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 16.sp)

                                    // Star selector
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.Center,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        (1..5).forEach { star ->
                                            IconButton(onClick = { reviewRating = star.toDouble() }) {
                                                Icon(
                                                    Icons.Default.Star,
                                                    contentDescription = "$star stars",
                                                    tint = if (star <= reviewRating) Color(0xFFFBBF24) else Surface200,
                                                    modifier = Modifier.size(28.dp)
                                                )
                                            }
                                        }
                                    }

                                    OutlinedTextField(
                                        value = reviewComment,
                                        onValueChange = { reviewComment = it },
                                        label = { Text("Write your feedback (optional)...") },
                                        modifier = Modifier.fillMaxWidth(),
                                        minLines = 2,
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = BrandGreen,
                                            unfocusedBorderColor = Surface200,
                                            focusedTextColor = TextPrimary,
                                            unfocusedTextColor = TextPrimary,
                                        ),
                                    )

                                    Button(
                                        onClick = {
                                            viewModel.submitReview(booking.id, reviewRating, reviewComment)
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = BrandGreen),
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier.fillMaxWidth().height(44.dp),
                                        enabled = !state.isSubmittingReview,
                                    ) {
                                        if (state.isSubmittingReview) {
                                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                        } else {
                                            Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(Modifier.width(6.dp))
                                            Text("Submit Review", fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // ── Job Details ───────────────────────────
                booking?.let { b ->
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Surface100),
                            shape  = RoundedCornerShape(20.dp),
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Text("Job Details", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 16.sp)
                                Spacer(Modifier.height(12.dp))
                                DetailRow("Service Type", b.serviceType.replace("_", " ").replaceFirstChar { it.uppercase() })
                                if (b.estimatedCost != null) {
                                    DetailRow("Estimate", "₹${String.format("%,.0f", b.estimatedCost)}")
                                }
                                if (b.scheduledAt != null) {
                                    DetailRow("Scheduled", formatDate(b.scheduledAt))
                                }
                                if (b.customerAddress != null) {
                                    DetailRow("Address", b.customerAddress)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TimelineItem(
    label: String,
    desc: String?,
    time: String?,
    isDone: Boolean,
    isCurrent: Boolean,
    isLast: Boolean,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(bottom = if (!isLast) 16.dp else 0.dp),
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            // Dot
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(28.dp)
                    .background(
                        color = when {
                            isCurrent -> BrandGreen
                            isDone    -> Surface200
                            else      -> Surface100
                        },
                        shape = CircleShape,
                    ),
            ) {
                if (isDone) {
                    Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                } else if (isCurrent) {
                    Icon(Icons.Default.Build, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                }
            }
            // Connector line
            if (!isLast) {
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .height(40.dp)
                        .background(if (isDone) Surface200 else Surface100),
                )
            }
        }

        Spacer(Modifier.width(16.dp))

        Column(modifier = Modifier.weight(1f)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    label,
                    fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                    color = if (isCurrent) TextPrimary else TextMuted,
                    fontSize = 14.sp,
                )
                time?.let {
                    Text(it, fontSize = 11.sp, color = TextMuted)
                }
            }
            if (desc != null) {
                Spacer(Modifier.height(4.dp))
                Text(desc, color = TextSecondary, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, color = TextMuted, fontSize = 13.sp)
        Text(value, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}

private fun statusColorFor(status: String) = when (status) {
    "booked"            -> Color(0xFF60A5FA)
    "assigned"          -> Color(0xFFC084FC)
    "diagnosis"         -> Color(0xFFFBBF24)
    "awaiting_approval" -> Color(0xFFFB923C)
    "in_repair"         -> Color(0xFF34D399)
    "quality_check"     -> Color(0xFF2DD4BF)
    "completed"         -> Color(0xFF4ADE80)
    "cancelled"         -> Color(0xFFF87171)
    else                -> Color(0xFF94A3B8)
}

private fun formatDate(iso: String): String {
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val out = SimpleDateFormat("d MMM, h:mm a", Locale.getDefault())
        val parsed = sdf.parse(iso.take(19))
        if (parsed != null) out.format(parsed) else iso
    } catch (e: Exception) {
        iso
    }
}
