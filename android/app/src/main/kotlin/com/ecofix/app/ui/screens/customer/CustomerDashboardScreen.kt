package com.ecofix.app.ui.screens.customer

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ecofix.app.data.model.BookingDto
import com.ecofix.app.ui.viewmodel.BookingViewModel

// EcoFix brand colours
private val BrandGreen = Color(0xFF10B981)
private val Surface0   = Color(0xFF0A0F1A)
private val Surface100 = Color(0xFF1E293B)
private val Surface200 = Color(0xFF334155)
private val TextPrimary   = Color(0xFFF1F5F9)
private val TextSecondary = Color(0xFF94A3B8)
private val TextMuted     = Color(0xFF64748B)

@Composable
fun CustomerDashboardScreen(
    viewModel: BookingViewModel = hiltViewModel(),
    onBookRepair: () -> Unit,
    onOpenBooking: (String) -> Unit,
    onOpenProfile: () -> Unit = {},
    onOpenHistory: () -> Unit = {},
) {
    val bookings by viewModel.myBookings.collectAsState()
    val notifications by viewModel.notifications.collectAsState()
    var showNotificationsDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadMyBookings()
        viewModel.loadNotifications()
    }

    val activeBookings = bookings.filter { it.status !in listOf("completed", "cancelled") }
    val unreadCount = notifications.count { !it.read }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Surface0)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text("My Repairs", fontSize = 26.sp, fontWeight = FontWeight.Black, color = TextPrimary)
                        Text(
                            "${activeBookings.size} active",
                            fontSize = 14.sp, color = TextSecondary,
                        )
                    }
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        BadgedBox(
                            badge = {
                                if (unreadCount > 0) {
                                    Badge(containerColor = BrandGreen) {
                                        Text("$unreadCount", color = Color.White, fontSize = 10.sp)
                                    }
                                }
                            }
                        ) {
                            IconButton(
                                onClick = { showNotificationsDialog = true },
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Surface100)
                            ) {
                                Icon(Icons.Default.Notifications, contentDescription = "Notifications", tint = TextPrimary)
                            }
                        }
                        IconButton(
                            onClick = onOpenHistory,
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Surface100)
                        ) {
                            Icon(Icons.Default.History, contentDescription = "Repair History", tint = TextPrimary)
                        }
                        IconButton(
                            onClick = onOpenProfile,
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Surface100)
                        ) {
                            Icon(Icons.Default.Person, contentDescription = "My Profile", tint = TextPrimary)
                        }
                        FloatingActionButton(
                            onClick = onBookRepair,
                            containerColor = BrandGreen,
                            contentColor   = Color.White,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.size(48.dp),
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Book Repair")
                        }
                    }
                }
            }

            // Stats row
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    StatCard(
                        label = "Active",
                        value = activeBookings.size.toString(),
                        color = BrandGreen,
                        modifier = Modifier.weight(1f),
                    )
                    StatCard(
                        label = "Completed",
                        value = bookings.count { it.status == "completed" }.toString(),
                        color = Color(0xFF60A5FA),
                        modifier = Modifier.weight(1f),
                    )
                    StatCard(
                        label = "Total",
                        value = bookings.size.toString(),
                        color = Color(0xFFA78BFA),
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            // Section header
            if (activeBookings.isNotEmpty()) {
                item {
                    Text(
                        "Active Repairs",
                        fontSize = 13.sp, fontWeight = FontWeight.Bold,
                        color = TextMuted,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
            }

            // Active booking cards
            items(activeBookings, key = { it.id }) { booking ->
                BookingCard(booking = booking, onClick = { onOpenBooking(booking.id) })
            }

            // Completed section
            val completed = bookings.filter { it.status == "completed" }
            if (completed.isNotEmpty()) {
                item {
                    Text(
                        "Completed",
                        fontSize = 13.sp, fontWeight = FontWeight.Bold,
                        color = TextMuted,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
                items(completed, key = { it.id }) { booking ->
                    BookingCard(booking = booking, onClick = { onOpenBooking(booking.id) })
                }
            }

            // Empty state
            if (bookings.isEmpty()) {
                item {
                    EmptyState(onBookRepair = onBookRepair)
                }
            }
        }

        if (showNotificationsDialog) {
            AlertDialog(
                onDismissRequest = { showNotificationsDialog = false },
                containerColor = Surface100,
                title = {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Notifications", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 18.sp)
                        Text("${notifications.size} total", color = TextSecondary, fontSize = 12.sp)
                    }
                },
                text = {
                    if (notifications.isEmpty()) {
                        Text("No notifications right now.", color = TextSecondary, fontSize = 14.sp)
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.heightIn(max = 350.dp)) {
                            items(notifications, key = { it.id }) { note ->
                                Surface(
                                    color = if (!note.read) Surface200 else Surface0,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth().clickable {
                                        viewModel.markNotificationRead(note.id)
                                    }
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(note.title, fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                                            if (!note.read) {
                                                Box(modifier = Modifier.size(8.dp).background(BrandGreen, CircleShape))
                                            }
                                        }
                                        Spacer(Modifier.height(4.dp))
                                        Text(note.body, color = TextSecondary, fontSize = 12.sp)
                                    }
                                }
                            }
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = { showNotificationsDialog = false }) {
                        Text("Close", color = BrandGreen, fontWeight = FontWeight.Bold)
                    }
                }
            )
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors   = CardDefaults.cardColors(containerColor = Surface100),
        shape    = RoundedCornerShape(16.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(value, fontSize = 24.sp, fontWeight = FontWeight.Black, color = color)
            Text(label, fontSize = 12.sp, color = TextSecondary)
        }
    }
}

@Composable
private fun BookingCard(booking: BookingDto, onClick: () -> Unit) {
    val statusColor = when (booking.status) {
        "booked"            -> Color(0xFF60A5FA)
        "assigned"          -> Color(0xFFC084FC)
        "diagnosis"         -> Color(0xFFFBBF24)
        "awaiting_approval" -> Color(0xFFFB923C)
        "in_repair"         -> BrandGreen
        "quality_check"     -> Color(0xFF2DD4BF)
        "completed"         -> Color(0xFF4ADE80)
        "cancelled"         -> Color(0xFFF87171)
        else                -> TextMuted
    }

    val steps = listOf("booked", "assigned", "diagnosis", "awaiting_approval", "in_repair", "quality_check", "completed")
    val progress = ((steps.indexOf(booking.status) + 1).coerceAtLeast(0).toFloat() / steps.size)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Surface100),
        shape  = RoundedCornerShape(16.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Build, contentDescription = null, tint = BrandGreen, modifier = Modifier.size(18.dp))
                    Text(
                        text = booking.serviceType.replace("_", " ").replaceFirstChar { it.uppercase() },
                        fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 15.sp,
                    )
                }
                Surface(
                    color = statusColor.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(20.dp),
                ) {
                    Text(
                        text = booking.status.replace("_", " ").replaceFirstChar { it.uppercase() },
                        color = statusColor, fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    )
                }
            }

            Spacer(Modifier.height(8.dp))

            Text(
                text = "#${booking.id.take(8).uppercase()}",
                fontSize = 12.sp, color = TextMuted,
            )

            if (booking.estimatedCost != null) {
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "Est. ₹${String.format("%,.0f", booking.estimatedCost)}",
                    fontSize = 13.sp, color = BrandGreen, fontWeight = FontWeight.Bold,
                )
            }

            // Progress bar
            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(
                progress    = { progress },
                modifier    = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                color       = BrandGreen,
                trackColor  = Surface200,
            )
            Spacer(Modifier.height(4.dp))
            Text("${(progress * 100).toInt()}% complete", fontSize = 11.sp, color = TextMuted)
        }
    }
}

@Composable
private fun EmptyState(onBookRepair: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            Icons.Default.Build, contentDescription = null,
            tint = TextMuted, modifier = Modifier.size(56.dp),
        )
        Spacer(Modifier.height(16.dp))
        Text("No repairs yet", fontWeight = FontWeight.Bold, color = TextSecondary, fontSize = 18.sp)
        Spacer(Modifier.height(8.dp))
        Text("Book your first repair and track it in real time.", color = TextMuted, fontSize = 14.sp)
        Spacer(Modifier.height(24.dp))
        Button(
            onClick = onBookRepair,
            colors  = ButtonDefaults.buttonColors(containerColor = BrandGreen),
            shape   = RoundedCornerShape(12.dp),
        ) {
            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text("Book a Repair", fontWeight = FontWeight.Bold)
        }
    }
}
