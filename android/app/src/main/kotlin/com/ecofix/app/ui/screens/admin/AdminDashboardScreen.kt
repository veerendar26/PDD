package com.ecofix.app.ui.screens.admin

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
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ecofix.app.data.model.*
import com.ecofix.app.data.remote.AdminRepository
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
private val CoralRed     = Color(0xFFEF4444)
private val WarningAmber = Color(0xFFF59E0B)
private val AccentBlue   = Color(0xFF3B82F6)
private val AccentPurple = Color(0xFFA855F7)

@Composable
fun AdminDashboardScreen(
    adminRepository: AdminRepository = AdminRepository(SupabaseService()),
    authViewModel: AuthViewModel = hiltViewModel(),
    onLogout: () -> Unit = {},
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Overview", "Approvals", "Bookings", "Users")
    val scope = rememberCoroutineScope()

    var isCheckingAccess by remember { mutableStateOf(true) }
    var isAuthorized by remember { mutableStateOf(false) }

    var metrics by remember { mutableStateOf(AdminMetricsDto()) }
    var pendingProviders by remember { mutableStateOf<List<ProviderProfileDto>>(emptyList()) }
    var allBookings by remember { mutableStateOf<List<BookingDto>>(emptyList()) }
    var allUsers by remember { mutableStateOf<List<UserDto>>(emptyList()) }
    var bookingFilter by remember { mutableStateOf("all") }
    var userSearchQuery by remember { mutableStateOf("") }
    var isLoadingData by remember { mutableStateOf(false) }

    fun refreshAll() {
        scope.launch {
            isLoadingData = true
            try {
                metrics = adminRepository.getMetrics()
                pendingProviders = adminRepository.getPendingApplications()
                allBookings = adminRepository.getAllBookings(if (bookingFilter == "all") null else bookingFilter)
                allUsers = adminRepository.getAllUsers()
            } catch (e: Exception) {
                // handle error
            } finally {
                isLoadingData = false
            }
        }
    }

    // Verify admin access strictly from trusted backend
    LaunchedEffect(Unit) {
        try {
            val user = authViewModel.getCurrentUser()
            if (user != null) {
                val dbRole = authViewModel.getDatabaseRole(user.id)
                if (dbRole == "admin") {
                    isAuthorized = true
                    refreshAll()
                } else {
                    isAuthorized = false
                }
            } else {
                isAuthorized = false
            }
        } catch (_: Exception) {
            isAuthorized = false
        } finally {
            isCheckingAccess = false
        }
    }

    if (isCheckingAccess) {
        Box(modifier = Modifier.fillMaxSize().background(Surface0), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = BrandGreen)
        }
        return
    }

    if (!isAuthorized) {
        // Access Denied Barrier
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
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .background(CoralRed.copy(alpha = 0.15f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Security, contentDescription = null, tint = CoralRed, modifier = Modifier.size(32.dp))
                    }
                    Text("Access Denied", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text(
                        "You must have administrative privileges to access the EcoFix Command & Governance Center.",
                        fontSize = 14.sp,
                        color = TextSecondary,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                    Button(
                        onClick = {
                            authViewModel.signOut()
                            onLogout()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = CoralRed),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Sign Out to Login", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        return
    }

    // Authorized Admin Experience
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Surface0)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        // ── Top Bar ─────────────────────────────────────────────
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(BrandGreen.copy(alpha = 0.15f), RoundedCornerShape(8.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Shield, contentDescription = null, tint = BrandGreen, modifier = Modifier.size(20.dp))
                }
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("EcoFix", fontSize = 17.sp, fontWeight = FontWeight.Black, color = TextPrimary)
                        Surface(color = BrandGreen.copy(alpha = 0.2f), shape = RoundedCornerShape(4.dp)) {
                            Text(
                                "ADMIN",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = BrandGreen,
                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                            )
                        }
                    }
                    Text("Command & Governance", fontSize = 11.sp, color = TextMuted)
                }
            }

            IconButton(
                onClick = {
                    authViewModel.signOut()
                    onLogout()
                },
                modifier = Modifier
                    .background(CoralRed.copy(alpha = 0.12f), RoundedCornerShape(10.dp))
                    .size(36.dp)
            ) {
                Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = "Logout", tint = CoralRed, modifier = Modifier.size(18.dp))
            }
        }

        // ── Tab Navigation ──────────────────────────────────────
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = Surface0,
            contentColor = BrandGreen,
            indicator = { tabPositions ->
                TabRowDefaults.SecondaryIndicator(
                    modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                    color = BrandGreen
                )
            }
        ) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = {
                        selectedTab = index
                        if (index == 2) {
                            scope.launch {
                                allBookings = adminRepository.getAllBookings(if (bookingFilter == "all") null else bookingFilter)
                            }
                        }
                    },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                title,
                                fontSize = 13.sp,
                                fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Medium,
                                color = if (selectedTab == index) BrandGreen else TextSecondary
                            )
                            if (title == "Approvals" && pendingProviders.isNotEmpty()) {
                                Surface(
                                    color = WarningAmber,
                                    shape = CircleShape,
                                    modifier = Modifier.size(16.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(
                                            "${pendingProviders.size}",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.Black
                                        )
                                    }
                                }
                            }
                        }
                    }
                )
            }
        }

        // ── Tab Content ─────────────────────────────────────────
        Box(modifier = Modifier.fillMaxSize().weight(1f)) {
            when (selectedTab) {
                0 -> AdminOverviewContent(metrics = metrics, onReviewApprovals = { selectedTab = 1 })
                1 -> AdminApprovalsContent(
                    pending = pendingProviders,
                    onApprove = { id ->
                        scope.launch {
                            adminRepository.approveProvider(id)
                            refreshAll()
                        }
                    },
                    onReject = { id ->
                        scope.launch {
                            adminRepository.rejectProvider(id)
                            refreshAll()
                        }
                    }
                )
                2 -> AdminBookingsContent(
                    bookings = allBookings,
                    currentFilter = bookingFilter,
                    onFilterChange = { f ->
                        bookingFilter = f
                        scope.launch {
                            allBookings = adminRepository.getAllBookings(if (f == "all") null else f)
                        }
                    }
                )
                3 -> AdminUsersContent(
                    users = allUsers,
                    searchQuery = userSearchQuery,
                    onSearchChange = { userSearchQuery = it }
                )
            }
        }
    }
}

// ── 1. Overview Tab ──────────────────────────────────────────

@Composable
private fun AdminOverviewContent(
    metrics: AdminMetricsDto,
    onReviewApprovals: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text("Platform Overview", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text("Live status metrics & technician approval queues", fontSize = 12.sp, color = TextMuted)
        }

        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                AdminMetricCard(
                    title = "Pending Approvals",
                    value = "${metrics.pendingVerifications}",
                    subtitle = "Technicians awaiting review",
                    accentColor = WarningAmber,
                    modifier = Modifier.weight(1f)
                )
                AdminMetricCard(
                    title = "Active Repairs",
                    value = "${metrics.activeRepairs}",
                    subtitle = "In diagnosis or repair",
                    accentColor = BrandGreen,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                AdminMetricCard(
                    title = "Settled GMV",
                    value = "₹${String.format("%,.0f", metrics.settledGmv)}",
                    subtitle = "Platform volume",
                    accentColor = AccentBlue,
                    modifier = Modifier.weight(1f)
                )
                AdminMetricCard(
                    title = "Total Users",
                    value = "${metrics.totalUsers}",
                    subtitle = "Customers & Technicians",
                    accentColor = AccentPurple,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        if (metrics.pendingVerifications > 0) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = WarningAmber.copy(alpha = 0.12f)),
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, WarningAmber.copy(alpha = 0.3f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Pending Approvals Queue",
                                fontWeight = FontWeight.Bold,
                                color = WarningAmber,
                                fontSize = 14.sp
                            )
                            Text(
                                "${metrics.pendingVerifications} technician applicant(s) waiting for trade & identity review",
                                fontSize = 12.sp,
                                color = TextSecondary
                            )
                        }
                        Button(
                            onClick = onReviewApprovals,
                            colors = ButtonDefaults.buttonColors(containerColor = WarningAmber),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("Review", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminMetricCard(
    title: String,
    value: String,
    subtitle: String,
    accentColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Surface100),
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Surface200),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(title, fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(4.dp))
            Text(value, fontSize = 20.sp, fontWeight = FontWeight.Black, color = accentColor)
            Spacer(Modifier.height(2.dp))
            Text(subtitle, fontSize = 10.sp, color = TextSecondary)
        }
    }
}

// ── 2. Approvals Tab ─────────────────────────────────────────

@Composable
private fun AdminApprovalsContent(
    pending: List<ProviderProfileDto>,
    onApprove: (String) -> Unit,
    onReject: (String) -> Unit,
) {
    if (pending.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = BrandGreen, modifier = Modifier.size(48.dp))
                Text("All Clear!", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 16.sp)
                Text("No pending technician verification requests right now.", color = TextMuted, fontSize = 13.sp)
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Pending Technicians (${pending.size})", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 16.sp)
        }

        items(pending, key = { it.id }) { provider ->
            Card(
                colors = CardDefaults.cardColors(containerColor = Surface100),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Surface200),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(provider.businessName, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TextPrimary)
                        Surface(color = WarningAmber.copy(alpha = 0.2f), shape = RoundedCornerShape(6.dp)) {
                            Text("Pending Review", color = WarningAmber, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                        }
                    }

                    if (!provider.address.isNullOrBlank()) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = TextMuted, modifier = Modifier.size(14.dp))
                            Text(provider.address, fontSize = 12.sp, color = TextSecondary)
                        }
                    }

                    if (provider.categories.isNotEmpty()) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            provider.categories.take(3).forEach { cat ->
                                Surface(color = Surface200, shape = RoundedCornerShape(4.dp)) {
                                    Text(cat, fontSize = 10.sp, color = TextSecondary, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                }
                            }
                        }
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { onApprove(provider.id) },
                            colors = ButtonDefaults.buttonColors(containerColor = BrandGreen),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f).height(40.dp)
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Approve", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }

                        OutlinedButton(
                            onClick = { onReject(provider.id) },
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = CoralRed),
                            border = androidx.compose.foundation.BorderStroke(1.dp, CoralRed.copy(alpha = 0.5f)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f).height(40.dp)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Reject", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }
        }
    }
}

// ── 3. Bookings Tab ──────────────────────────────────────────

@Composable
private fun AdminBookingsContent(
    bookings: List<BookingDto>,
    currentFilter: String,
    onFilterChange: (String) -> Unit,
) {
    val filters = listOf("all", "booked", "assigned", "in_repair", "completed")

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            filters.forEach { f ->
                val isSelected = currentFilter == f
                Surface(
                    color = if (isSelected) BrandGreen else Surface100,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.clickable { onFilterChange(f) }
                ) {
                    Text(
                        f.replace("_", " ").replaceFirstChar { it.uppercase() },
                        fontSize = 11.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        color = if (isSelected) Color.Black else TextSecondary,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                    )
                }
            }
        }

        if (bookings.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No bookings match this filter.", color = TextMuted, fontSize = 14.sp)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(bookings, key = { it.id }) { booking ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Surface100),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("#${booking.id.take(8).uppercase()}", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                                Surface(
                                    color = BrandGreen.copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        booking.status.replace("_", " ").uppercase(),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = BrandGreen,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            Spacer(Modifier.height(4.dp))
                            Text(booking.serviceType.replace("_", " ").replaceFirstChar { it.uppercase() }, fontSize = 12.sp, color = TextSecondary)
                            booking.customerAddress?.let {
                                Text(it, fontSize = 11.sp, color = TextMuted, maxLines = 1)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── 4. Users Directory Tab ───────────────────────────────────

@Composable
private fun AdminUsersContent(
    users: List<UserDto>,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
) {
    val filtered = users.filter {
        if (searchQuery.isBlank()) true
        else it.name.contains(searchQuery, ignoreCase = true) || it.email.contains(searchQuery, ignoreCase = true)
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchChange,
            placeholder = { Text("Search by name or email...", fontSize = 13.sp, color = TextMuted) },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextMuted) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = BrandGreen,
                unfocusedBorderColor = Surface200,
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary
            )
        )

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(filtered, key = { it.id }) { user ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = Surface100),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp).fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(user.name, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextPrimary)
                            Text(user.email, fontSize = 12.sp, color = TextSecondary)
                            user.phone?.let { Text(it, fontSize = 11.sp, color = TextMuted) }
                        }

                        val roleColor = when (user.role) {
                            "admin" -> AccentPurple
                            "technician" -> AccentBlue
                            else -> BrandGreen
                        }

                        Surface(
                            color = roleColor.copy(alpha = 0.15f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                user.role.uppercase(),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = roleColor,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
