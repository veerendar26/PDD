package com.ecofix.app.ui.screens.customer

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.ecofix.app.data.model.BookingDto
import com.ecofix.app.ui.viewmodel.BookingViewModel

private val BrandGreen   = Color(0xFF10B981)
private val Surface0     = Color(0xFF0A0F1A)
private val Surface100   = Color(0xFF1E293B)
private val Surface200   = Color(0xFF334155)
private val TextPrimary  = Color(0xFFF1F5F9)
private val TextSecondary = Color(0xFF94A3B8)
private val TextMuted    = Color(0xFF64748B)

@Composable
fun CustomerHistoryScreen(
    viewModel: BookingViewModel = hiltViewModel(),
    onOpenBooking: (String) -> Unit,
    onBack: () -> Unit,
) {
    val bookings by viewModel.myBookings.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadMyBookings()
    }

    val historyBookings = bookings.filter { it.status in listOf("completed", "cancelled") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Surface0)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        // Top Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = TextSecondary)
            }
            Text(
                "Repair History",
                fontSize = 20.sp,
                fontWeight = FontWeight.Black,
                color = TextPrimary,
                modifier = Modifier.padding(start = 8.dp)
            )
        }

        if (historyBookings.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize().padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.History, contentDescription = null, tint = TextMuted, modifier = Modifier.size(48.dp))
                    Text("No past repairs yet", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 16.sp)
                    Text("Completed and cancelled repairs will appear here.", color = TextMuted, fontSize = 13.sp)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(historyBookings, key = { it.id }) { booking ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onOpenBooking(booking.id) },
                        colors = CardDefaults.cardColors(containerColor = Surface100),
                        shape = RoundedCornerShape(16.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Surface200)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("#${booking.id.take(8).uppercase()}", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 15.sp)

                                val isDone = booking.status == "completed"
                                Surface(
                                    color = if (isDone) BrandGreen.copy(alpha = 0.15f) else Color(0xFFEF4444).copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        if (isDone) "COMPLETED" else "CANCELLED",
                                        color = if (isDone) BrandGreen else Color(0xFFEF4444),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                            }

                            Spacer(Modifier.height(6.dp))
                            Text(booking.serviceType.replace("_", " ").replaceFirstChar { it.uppercase() }, fontSize = 13.sp, color = TextSecondary)

                            booking.finalCost?.let { cost ->
                                Spacer(Modifier.height(6.dp))
                                Text("Final Settled: ₹${String.format("%,.0f", cost)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = BrandGreen)
                            }

                            booking.scheduledAt?.let {
                                Spacer(Modifier.height(4.dp))
                                Text(it.take(10), fontSize = 11.sp, color = TextMuted)
                            }
                        }
                    }
                }
            }
        }
    }
}
