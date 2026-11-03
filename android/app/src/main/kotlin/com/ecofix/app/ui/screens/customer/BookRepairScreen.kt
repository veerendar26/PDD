package com.ecofix.app.ui.screens.customer

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.ecofix.app.ui.viewmodel.BookRepairViewModel

// ── Design tokens ────────────────────────────────────────────
private val BrandGreen    = Color(0xFF10B981)
private val Surface0      = Color(0xFF0A0F1A)
private val Surface100    = Color(0xFF1E293B)
private val Surface200    = Color(0xFF334155)
private val TextPrimary   = Color(0xFFF1F5F9)
private val TextSecondary = Color(0xFF94A3B8)
private val TextMuted     = Color(0xFF64748B)

private val STEPS = listOf("Category", "Details", "Provider", "Schedule")

@Composable
fun BookRepairScreen(
    viewModel: BookRepairViewModel = hiltViewModel(),
    onBookingCreated: (String) -> Unit,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()

    // Photo picker
    val photoLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetMultipleContents()
    ) { uris: List<Uri> ->
        viewModel.addMediaUris(uris)
    }

    // Handle booking creation success
    LaunchedEffect(uiState.createdBookingId) {
        uiState.createdBookingId?.let { onBookingCreated(it) }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Surface0)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        Column(modifier = Modifier.fillMaxSize()) {

            // ── Top bar ─────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = {
                    if (uiState.step == 0) onBack() else viewModel.prevStep()
                }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = TextSecondary)
                }
                Text(
                    "Book a Repair",
                    fontSize = 20.sp, fontWeight = FontWeight.Black, color = TextPrimary,
                    modifier = Modifier.weight(1f).padding(start = 8.dp),
                )
            }

            // ── Step indicator ──────────────────────────────
            StepIndicator(currentStep = uiState.step, steps = STEPS)

            // ── Step content ────────────────────────────────
            AnimatedContent(
                targetState = uiState.step,
                transitionSpec = {
                    if (targetState > initialState) {
                        slideInHorizontally { it } + fadeIn() togetherWith slideOutHorizontally { -it } + fadeOut()
                    } else {
                        slideInHorizontally { -it } + fadeIn() togetherWith slideOutHorizontally { it } + fadeOut()
                    }
                },
                modifier = Modifier.weight(1f),
                label = "step_content",
            ) { step ->
                when (step) {
                    0 -> CategoryStepContent(viewModel = viewModel, uiState = uiState)
                    1 -> DetailsStepContent(
                        viewModel = viewModel, uiState = uiState,
                        onPickPhotos = { photoLauncher.launch("image/*") },
                        context = context,
                    )
                    2 -> ProviderStepContent(viewModel = viewModel, uiState = uiState)
                    3 -> ScheduleStepContent(viewModel = viewModel, uiState = uiState)
                }
            }

            // ── Bottom CTA ──────────────────────────────────
            Surface(color = Surface100, modifier = Modifier.fillMaxWidth()) {
                Button(
                    onClick = {
                        if (uiState.step == STEPS.lastIndex) {
                            viewModel.confirmBooking()
                        } else {
                            viewModel.nextStep()
                        }
                    },
                    colors  = ButtonDefaults.buttonColors(containerColor = BrandGreen),
                    shape   = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .height(52.dp),
                    enabled = !uiState.isLoading && uiState.canProceed,
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                    } else {
                        Text(
                            if (uiState.step == STEPS.lastIndex) "Confirm Booking" else "Next",
                            fontWeight = FontWeight.Bold, fontSize = 15.sp,
                        )
                        if (uiState.step < STEPS.lastIndex) {
                            Spacer(Modifier.width(6.dp))
                            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        }

        // Error snackbar
        uiState.error?.let { error ->
            Snackbar(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp),
                action = {
                    TextButton(onClick = { viewModel.clearError() }) {
                        Text("Dismiss", color = BrandGreen)
                    }
                },
                containerColor = Color(0xFF1E293B),
            ) {
                Text(error, color = TextPrimary)
            }
        }
    }
}

// ── Step 1: Category ──────────────────────────────────────────

@Composable
private fun CategoryStepContent(viewModel: BookRepairViewModel, uiState: com.ecofix.app.ui.viewmodel.BookRepairUiState) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Text("What needs repairing?", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Spacer(Modifier.height(16.dp))

        if (uiState.isCategoriesLoading) {
            Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = BrandGreen)
            }
        } else {
            val categories = uiState.categories
            val gridRows = categories.chunked(2)
            gridRows.forEach { row ->
                Row(modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    row.forEach { cat ->
                        val selected = uiState.selectedCategory?.id == cat.id
                        Card(
                            modifier = Modifier
                                .weight(1f)
                                .clickable { viewModel.selectCategory(cat) }
                                .border(
                                    width = 2.dp,
                                    color = if (selected) BrandGreen else Surface200,
                                    shape = RoundedCornerShape(16.dp),
                                ),
                            colors = CardDefaults.cardColors(
                                containerColor = if (selected) Color(0xFF022C22) else Surface100,
                            ),
                            shape = RoundedCornerShape(16.dp),
                        ) {
                            Column(
                                modifier = Modifier.padding(20.dp).fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Text(categoryEmoji(cat.name), fontSize = 28.sp)
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    cat.name,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp,
                                    color = if (selected) BrandGreen else TextPrimary,
                                )
                            }
                        }
                    }
                    // fill empty slot if odd number
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

// ── Step 2: Product Details ───────────────────────────────────

@Composable
private fun DetailsStepContent(
    viewModel: BookRepairViewModel,
    uiState: com.ecofix.app.ui.viewmodel.BookRepairUiState,
    onPickPhotos: () -> Unit,
    context: Context,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Describe the Problem", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)

        EcoOutlinedField(value = uiState.brand, onChange = viewModel::setBrand, label = "Brand (optional)", imeAction = ImeAction.Next)
        EcoOutlinedField(value = uiState.model, onChange = viewModel::setModel, label = "Model (optional)", imeAction = ImeAction.Next)

        OutlinedTextField(
            value = uiState.issueDescription,
            onValueChange = viewModel::setIssueDescription,
            label = { Text("Describe the issue *") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 4,
            colors = ecoFieldColors(),
            shape = RoundedCornerShape(12.dp),
        )

        // Photo picker
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onPickPhotos),
            colors = CardDefaults.cardColors(containerColor = Surface100),
            border = CardDefaults.outlinedCardBorder(),
            shape  = RoundedCornerShape(16.dp),
        ) {
            Column(
                modifier = Modifier.padding(20.dp).fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(Icons.Default.AddPhotoAlternate, contentDescription = null, tint = TextMuted, modifier = Modifier.size(36.dp))
                Spacer(Modifier.height(8.dp))
                Text("Tap to add photos", color = TextSecondary, fontSize = 14.sp)
            }
        }

        // Photo thumbnails
        if (uiState.mediaUris.isNotEmpty()) {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                items(uiState.mediaUris) { uri ->
                    Box {
                        AsyncImage(
                            model = uri,
                            contentDescription = "Damage photo",
                            modifier = Modifier
                                .size(80.dp)
                                .clip(RoundedCornerShape(12.dp)),
                            contentScale = ContentScale.Crop,
                        )
                        IconButton(
                            onClick = { viewModel.removeMedia(uri) },
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .size(22.dp)
                                .background(Color(0xFFF87171), CircleShape),
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Remove", tint = Color.White, modifier = Modifier.size(12.dp))
                        }
                    }
                }
            }
        }

        // AI Diagnosis (if photos selected)
        if (uiState.mediaUris.isNotEmpty()) {
            OutlinedButton(
                onClick = { viewModel.runAiDiagnosis() },
                enabled = !uiState.isDiagnosisLoading,
                colors  = ButtonDefaults.outlinedButtonColors(contentColor = BrandGreen),
                shape   = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (uiState.isDiagnosisLoading) {
                    CircularProgressIndicator(color = BrandGreen, strokeWidth = 2.dp, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Analysing…")
                } else {
                    Icon(Icons.Default.Psychology, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("AI Diagnosis (beta)")
                }
            }
        }

        // AI diagnosis result
        uiState.aiDiagnosis?.let { diagnosis ->
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF042018)),
                border = BorderStroke(1.dp, BrandGreen.copy(alpha = 0.5f)),
                shape  = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("🤖 AI Diagnosis", fontWeight = FontWeight.Bold, color = BrandGreen, fontSize = 14.sp)
                            Spacer(Modifier.width(8.dp))
                            Surface(
                                color = BrandGreen.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(6.dp),
                            ) {
                                Text(
                                    "ANALYSIS READY",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = BrandGreen,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                )
                            }
                        }
                        diagnosis.severity?.let { sev ->
                            Text(
                                "Severity: $sev",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = when (sev.lowercase()) {
                                    "critical", "high" -> Color(0xFFF87171)
                                    "moderate" -> Color(0xFFFBBF24)
                                    else -> BrandGreen
                                },
                            )
                        }
                    }

                    Spacer(Modifier.height(12.dp))

                    diagnosis.issueLabels.forEachIndexed { i, label ->
                        val score = diagnosis.confidenceScores.getOrElse(i) { 0.0 }
                        Column(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(label, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                                Text(
                                    "${(score * 100).toInt()}% match",
                                    color = BrandGreen, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                                )
                            }
                            Spacer(Modifier.height(4.dp))
                            LinearProgressIndicator(
                                progress = { score.toFloat() },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(4.dp)
                                    .clip(RoundedCornerShape(2.dp)),
                                color = BrandGreen,
                                trackColor = Color(0xFF1E293B),
                            )
                        }
                    }

                    if (diagnosis.estimatedCostRange != null || diagnosis.recommendedAction != null) {
                        Spacer(Modifier.height(10.dp))
                        HorizontalDivider(color = Color(0xFF134E48), thickness = 1.dp)
                        Spacer(Modifier.height(8.dp))
                        diagnosis.estimatedCostRange?.let { range ->
                            Text("Estimated Cost: $range", fontSize = 12.sp, color = TextSecondary, fontWeight = FontWeight.Medium)
                        }
                        diagnosis.recommendedAction?.let { act ->
                            Spacer(Modifier.height(2.dp))
                            Text("Recommended Action: $act", fontSize = 12.sp, color = TextMuted)
                        }
                    }
                }
            }
        }
    }
}

// ── Step 3: Provider Selection ────────────────────────────────

@Composable
private fun ProviderStepContent(viewModel: BookRepairViewModel, uiState: com.ecofix.app.ui.viewmodel.BookRepairUiState) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
    ) {
        Text("Choose a Provider", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Spacer(Modifier.height(16.dp))

        if (uiState.isProvidersLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = BrandGreen)
            }
        } else if (uiState.providers.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.LocationOff, contentDescription = null, tint = TextMuted, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(12.dp))
                    Text("No providers found nearby", color = TextSecondary)
                }
            }
        } else {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                uiState.providers.forEach { provider ->
                    val selected = uiState.selectedProvider?.id == provider.id
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { viewModel.selectProvider(provider) }
                            .border(2.dp, if (selected) BrandGreen else Surface200, RoundedCornerShape(16.dp)),
                        colors = CardDefaults.cardColors(
                            containerColor = if (selected) Color(0xFF022C22) else Surface100,
                        ),
                        shape = RoundedCornerShape(16.dp),
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(provider.businessName, fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 15.sp)
                                Spacer(Modifier.height(4.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text("★ ${provider.ratingAvg}", color = Color(0xFFFBBF24), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                    Text("${provider.distanceKm} km", color = TextMuted, fontSize = 13.sp)
                                    if (provider.doorstepAvailable) {
                                        Text("🏠 Doorstep", color = Color(0xFF60A5FA), fontSize = 12.sp)
                                    }
                                }
                            }
                            if (selected) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = BrandGreen, modifier = Modifier.size(24.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Step 4: Schedule ──────────────────────────────────────────

@Composable
private fun ScheduleStepContent(viewModel: BookRepairViewModel, uiState: com.ecofix.app.ui.viewmodel.BookRepairUiState) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Schedule Your Repair", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)

        // Service type selector
        Text("Service Type", color = TextMuted, fontSize = 13.sp)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            listOf(
                Triple("in_store",  "In Store",  "🏪"),
                Triple("pickup",    "Pickup",    "🚚"),
                Triple("doorstep",  "Doorstep",  "🏠"),
            ).forEach { (type, label, emoji) ->
                val selected = uiState.serviceType == type
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { viewModel.setServiceType(type) }
                        .border(2.dp, if (selected) BrandGreen else Surface200, RoundedCornerShape(12.dp)),
                    colors = CardDefaults.cardColors(
                        containerColor = if (selected) Color(0xFF022C22) else Surface100,
                    ),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp).fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(emoji, fontSize = 22.sp)
                        Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = if (selected) BrandGreen else TextPrimary)
                    }
                }
            }
        }

        if (uiState.serviceType != "in_store") {
            EcoOutlinedField(
                value    = uiState.customerAddress,
                onChange = viewModel::setCustomerAddress,
                label    = "Your full address",
            )
        }

        // Booking summary
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF022C22)),
            shape  = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Booking Summary", fontWeight = FontWeight.Bold, color = BrandGreen, fontSize = 15.sp)
                SummaryRow("Category",  uiState.selectedCategory?.name ?: "—")
                SummaryRow("Provider",  uiState.selectedProvider?.businessName ?: "—")
                SummaryRow("Service",   uiState.serviceType.replace("_", " ").replaceFirstChar { it.uppercase() })
            }
        }
    }
}

// ── Shared helpers ────────────────────────────────────────────

@Composable
private fun StepIndicator(currentStep: Int, steps: List<String>) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        steps.forEachIndexed { i, label ->
            val done    = i < currentStep
            val current = i == currentStep
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(28.dp)
                    .background(
                        when { done -> BrandGreen; current -> Color(0xFF022C22); else -> Surface100 },
                        CircleShape,
                    )
                    .border(2.dp, if (current || done) BrandGreen else Surface200, CircleShape),
            ) {
                if (done) Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                else Text("${i + 1}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (current) BrandGreen else TextMuted)
            }
            if (i < steps.lastIndex) {
                Box(modifier = Modifier.weight(1f).height(2.dp).background(if (done) BrandGreen else Surface200))
            }
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = TextMuted, fontSize = 13.sp)
        Text(value, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun EcoOutlinedField(
    value: String, onChange: (String) -> Unit,
    label: String, imeAction: ImeAction = ImeAction.Default,
) {
    OutlinedTextField(
        value = value, onValueChange = onChange,
        label = { Text(label) },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        keyboardOptions = KeyboardOptions(imeAction = imeAction),
        colors = ecoFieldColors(),
        shape  = RoundedCornerShape(12.dp),
    )
}

@Composable
private fun ecoFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor   = Color(0xFF10B981),
    unfocusedBorderColor = Color(0xFF334155),
    focusedLabelColor    = Color(0xFF10B981),
    unfocusedLabelColor  = Color(0xFF64748B),
    focusedTextColor     = Color(0xFFF1F5F9),
    unfocusedTextColor   = Color(0xFFF1F5F9),
    cursorColor          = Color(0xFF10B981),
)

private fun categoryEmoji(name: String) = when {
    name.contains("Electronics", true) -> "📱"
    name.contains("Appliance",   true) -> "📺"
    name.contains("Furniture",   true) -> "🛋️"
    name.contains("Fashion",     true) -> "👗"
    name.contains("Automotive",  true) -> "🚗"
    name.contains("Electrical",  true) -> "⚡"
    name.contains("Accessories", true) -> "⌚"
    else                               -> "🔧"
}
