package com.ecofix.app.ui.screens.splash

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ecofix.app.ui.viewmodel.AuthViewModel
import com.ecofix.app.ui.viewmodel.AuthState

@Composable
fun SplashScreen(
    viewModel: AuthViewModel = hiltViewModel(),
    onNavigateToLogin: () -> Unit,
    onNavigateToCustomer: () -> Unit,
    onNavigateToProvider: () -> Unit,
    onNavigateToProviderPending: () -> Unit,
    onNavigateToAdmin: () -> Unit,
) {
    val authState by viewModel.authState.collectAsState()

    // Pulsing logo animation
    val scale by rememberInfiniteTransition(label = "pulse").animateFloat(
        initialValue = 1f,
        targetValue  = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(900, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "scale",
    )

    LaunchedEffect(authState) {
        when (val state = authState) {
            is AuthState.Authenticated -> {
                when (state.role) {
                    "admin" -> onNavigateToAdmin()
                    "technician" -> {
                        if (state.verificationStatus == "approved") onNavigateToProvider()
                        else onNavigateToProviderPending()
                    }
                    else -> onNavigateToCustomer()
                }
            }
            is AuthState.Unauthenticated -> onNavigateToLogin()
            else -> Unit // Loading — stay on splash
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFF0A0F1A), Color(0xFF0F172A)),
                )
            ),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            // Logo
            Surface(
                modifier = Modifier.size(80.dp).scale(scale),
                shape = MaterialTheme.shapes.large,
                color = Color(0xFF10B981),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.Build,
                        contentDescription = "EcoFix",
                        tint = Color.White,
                        modifier = Modifier.size(40.dp),
                    )
                }
            }

            Spacer(Modifier.height(20.dp))

            Text(
                text = "EcoFix",
                fontSize = 32.sp,
                fontWeight = FontWeight.Black,
                color = Color(0xFFF1F5F9),
            )

            Text(
                text = "Repair. Reuse. Revalue.",
                fontSize = 14.sp,
                color = Color(0xFF10B981),
                fontWeight = FontWeight.Medium,
            )

            Spacer(Modifier.height(40.dp))

            CircularProgressIndicator(
                color = Color(0xFF10B981),
                strokeWidth = 2.dp,
                modifier = Modifier.size(24.dp),
            )
        }
    }
}
