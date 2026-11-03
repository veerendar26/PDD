package com.ecofix.app.ui.screens.customer

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ecofix.app.ui.viewmodel.AuthViewModel
import com.ecofix.app.ui.viewmodel.AuthState
import com.ecofix.app.ui.viewmodel.BookingViewModel

// Colors matching the UI design
private val BrandGreen   = Color(0xFF10B981)
private val Surface0     = Color(0xFF0F172A)
private val SurfaceCard  = Color(0xFF1E293B)
private val SurfaceInput = Color(0xFF172033)
private val BorderColor  = Color(0xFF334155)
private val TextPrimary  = Color(0xFFF1F5F9)
private val TextSecondary = Color(0xFF94A3B8)
private val TextMuted    = Color(0xFF64748B)
private val CoralRed     = Color(0xFFEF4444)

@Composable
fun ProfileScreen(
    authViewModel: AuthViewModel = hiltViewModel(),
    bookingViewModel: BookingViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit = {},
    onLogoutSuccess: () -> Unit = {},
) {
    val authState by authViewModel.authState.collectAsState()
    val bookings by bookingViewModel.myBookings.collectAsState()

    LaunchedEffect(Unit) {
        bookingViewModel.loadMyBookings()
    }

    var fullName by remember { mutableStateOf("") }
    var phoneNumber by remember { mutableStateOf("") }
    var emailAddress by remember { mutableStateOf("") }

    var streetAddress by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var pinCode by remember { mutableStateOf("") }

    var showPasswordDialog by remember { mutableStateOf("") }
    var showNotificationDialog by remember { mutableStateOf(false) }

    LaunchedEffect(authState) {
        if (authState is AuthState.Authenticated) {
            val user = (authState as AuthState.Authenticated).user
            emailAddress = user.email ?: ""
            fullName = user.userMetadata?.get("name")?.toString()?.trim('"') ?: emailAddress.substringBefore("@")
            phoneNumber = user.userMetadata?.get("phone")?.toString()?.trim('"') ?: ""
            streetAddress = user.userMetadata?.get("street_address")?.toString()?.trim('"') ?: ""
            city = user.userMetadata?.get("city")?.toString()?.trim('"') ?: ""
            pinCode = user.userMetadata?.get("pin_code")?.toString()?.trim('"') ?: ""
        }
    }

    val totalCount = bookings.size
    val completedCount = bookings.count { it.status == "completed" }
    val pendingCount = bookings.count { it.status !in listOf("completed", "cancelled") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Surface0)
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .wrapContentHeight(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceCard),
            border = androidx.compose.foundation.BorderStroke(1.dp, BorderColor)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // ── Header Row ──
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(50.dp)
                                .clip(CircleShape)
                                .background(BrandGreen),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = "Profile Avatar",
                                tint = Color.White,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                        Column {
                            Text(
                                text = "My Profile",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "Manage your personal information and account",
                                fontSize = 12.sp,
                                color = TextSecondary
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(BrandGreen)
                            .clickable { /* Trigger Edit */ },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = "Edit Profile",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                HorizontalDivider(color = BorderColor, thickness = 1.dp)

                // ── 1. Personal Information ──
                Text(
                    text = "Personal Information",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(modifier = Modifier.weight(1f)) {
                        ProfileInputField(
                            label = "Full Name",
                            value = fullName,
                            onValueChange = { fullName = it },
                            placeholder = "Your name"
                        )
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        ProfileInputField(
                            label = "Phone Number",
                            value = phoneNumber,
                            onValueChange = { phoneNumber = it },
                            placeholder = "Your phone"
                        )
                    }
                }

                ProfileInputField(
                    label = "Email Address",
                    value = emailAddress,
                    onValueChange = {},
                    placeholder = "your@email.com",
                    readOnly = true
                )

                // ── 2. Address Information ──
                Text(
                    text = "Address Information",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceInput),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BorderColor)
                ) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        ProfileFieldInner(
                            label = "Street Address",
                            value = streetAddress,
                            onValueChange = { streetAddress = it },
                            placeholder = "Your street address"
                        )
                        HorizontalDivider(color = BorderColor, thickness = 1.dp)
                        Row(modifier = Modifier.fillMaxWidth()) {
                            Box(modifier = Modifier.weight(1f)) {
                                ProfileFieldInner(
                                    label = "City",
                                    value = city,
                                    onValueChange = { city = it },
                                    placeholder = "Your city"
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .width(1.dp)
                                    .height(60.dp)
                                    .background(BorderColor)
                            )
                            Box(modifier = Modifier.weight(1f)) {
                                ProfileFieldInner(
                                    label = "PIN Code",
                                    value = pinCode,
                                    onValueChange = { pinCode = it },
                                    placeholder = "Your PIN code"
                                )
                            }
                        }
                    }
                }

                // ── 3. Repair Overview ──
                Text(
                    text = "Repair Overview",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OverviewStatCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.Build,
                        iconTint = Color(0xFF2DD4BF),
                        count = totalCount.toString(),
                        label = "Total Repairs"
                    )
                    OverviewStatCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.CheckCircle,
                        iconTint = Color(0xFF34D399),
                        count = completedCount.toString(),
                        label = "Completed"
                    )
                    OverviewStatCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.DateRange,
                        iconTint = Color(0xFFFBBF24),
                        count = pendingCount.toString(),
                        label = "Pending"
                    )
                }

                // ── 4. Account Settings ──
                Text(
                    text = "Account Settings",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceInput),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BorderColor)
                ) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        SettingRow(
                            icon = Icons.Outlined.Lock,
                            title = "Change Password",
                            subtitle = "Update your login credentials",
                            onClick = { showPasswordDialog = "open" }
                        )
                        HorizontalDivider(color = BorderColor, thickness = 1.dp)
                        SettingRow(
                            icon = Icons.Outlined.Notifications,
                            title = "Notifications",
                            subtitle = "Repair updates and reminders",
                            onClick = { showNotificationDialog = true }
                        )
                        HorizontalDivider(color = BorderColor, thickness = 1.dp)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    authViewModel.signOut()
                                    onLogoutSuccess()
                                }
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ExitToApp,
                                contentDescription = "Logout",
                                tint = CoralRed,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "Logout",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = CoralRed
                            )
                        }
                    }
                }

                // ── 5. Bottom Actions ──
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = { onNavigateBack() },
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = BrandGreen)
                    ) {
                        Text(
                            text = "Save Changes",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }

                    OutlinedButton(
                        onClick = { onNavigateBack() },
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, BorderColor),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary)
                    ) {
                        Text(
                            text = "Cancel",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileInputField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    readOnly: Boolean = false,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceInput),
        border = androidx.compose.foundation.BorderStroke(1.dp, BorderColor)
    ) {
        ProfileFieldInner(
            label = label,
            value = value,
            onValueChange = onValueChange,
            placeholder = placeholder,
            readOnly = readOnly
        )
    }
}

@Composable
private fun ProfileFieldInner(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    readOnly: Boolean = false,
) {
    Column(modifier = Modifier.padding(10.dp, 8.dp)) {
        Text(
            text = label,
            fontSize = 11.sp,
            color = TextMuted,
            fontWeight = FontWeight.Medium
        )
        Spacer(modifier = Modifier.height(2.dp))
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            readOnly = readOnly,
            textStyle = TextStyle(
                color = if (readOnly) TextSecondary else TextPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium
            ),
            cursorBrush = SolidColor(BrandGreen),
            decorationBox = { innerTextField ->
                if (value.isEmpty()) {
                    Text(
                        text = placeholder,
                        color = TextMuted,
                        fontSize = 14.sp
                    )
                }
                innerTextField()
            },
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun OverviewStatCard(
    modifier: Modifier = Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconTint: Color,
    count: String,
    label: String,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceInput),
        border = androidx.compose.foundation.BorderStroke(1.dp, BorderColor)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp, horizontal = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = iconTint,
                modifier = Modifier.size(20.dp)
            )
            Text(
                text = count,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Text(
                text = label,
                fontSize = 11.sp,
                color = TextMuted
            )
        }
    }
}

@Composable
private fun SettingRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = TextMuted,
                modifier = Modifier.size(20.dp)
            )
            Column {
                Text(
                    text = title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary
                )
                Text(
                    text = subtitle,
                    fontSize = 12.sp,
                    color = TextSecondary
                )
            }
        }
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = "Navigate",
            tint = TextMuted,
            modifier = Modifier.size(18.dp)
        )
    }
}
