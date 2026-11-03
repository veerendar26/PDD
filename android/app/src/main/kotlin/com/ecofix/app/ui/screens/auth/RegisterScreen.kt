package com.ecofix.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ecofix.app.ui.viewmodel.AuthViewModel

private val BrandGreen    = Color(0xFF10B981)
private val Surface0      = Color(0xFF0A0F1A)
private val Surface100    = Color(0xFF1E293B)
private val TextPrimary   = Color(0xFFF1F5F9)
private val TextSecondary = Color(0xFF94A3B8)
private val TextMuted     = Color(0xFF64748B)

@Composable
fun RegisterScreen(
    viewModel: AuthViewModel = hiltViewModel(),
    onRegisterSuccess: (role: String, status: String) -> Unit,
    onNavigateToLogin: () -> Unit,
) {
    var name      by remember { mutableStateOf("") }
    var email     by remember { mutableStateOf("") }
    var phone     by remember { mutableStateOf("") }
    var password  by remember { mutableStateOf("") }
    var confirmPw by remember { mutableStateOf("") }
    var showPw    by remember { mutableStateOf(false) }
    var role      by remember { mutableStateOf("customer") } // "customer" or "technician"
    var loading   by remember { mutableStateOf(false) }
    var errorMsg  by remember { mutableStateOf<String?>(null) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(colors = listOf(Surface0, Color(0xFF0F172A))))
            .statusBarsPadding()
            .navigationBarsPadding(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 40.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Logo
            Surface(modifier = Modifier.size(56.dp), shape = RoundedCornerShape(14.dp), color = BrandGreen) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Build, contentDescription = "EcoFix", tint = Color.White, modifier = Modifier.size(28.dp))
                }
            }

            Spacer(Modifier.height(16.dp))
            Text("Create Account", fontSize = 26.sp, fontWeight = FontWeight.Black, color = TextPrimary)
            Text("Join EcoFix — repair smarter.", fontSize = 14.sp, color = TextSecondary)
            Spacer(Modifier.height(28.dp))

            // Role selector
            Card(colors = CardDefaults.cardColors(containerColor = Surface100), shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.padding(8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("customer" to "🙋 Customer", "technician" to "🔧 Technician").forEach { (r, label) ->
                        Button(
                            onClick = { role = r },
                            colors  = ButtonDefaults.buttonColors(
                                containerColor = if (role == r) BrandGreen else Color.Transparent,
                                contentColor   = if (role == r) Color.White else TextMuted,
                            ),
                            shape    = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f),
                            elevation = ButtonDefaults.buttonElevation(0.dp),
                        ) {
                            Text(label, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            Card(colors = CardDefaults.cardColors(containerColor = Surface100), shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    EcoTextField(value = name,  onChange = { name  = it; errorMsg = null }, label = "Full Name",  keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next))
                    EcoTextField(value = email, onChange = { email = it; errorMsg = null }, label = "Email",      keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next))
                    EcoTextField(value = phone, onChange = { phone = it; errorMsg = null }, label = "Phone",      keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next))

                    EcoTextField(
                        value = password, onChange = { password = it; errorMsg = null },
                        label = "Password",
                        visualTransformation = if (showPw) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Next),
                        trailingIcon = {
                            IconButton(onClick = { showPw = !showPw }) {
                                Icon(if (showPw) Icons.Default.VisibilityOff else Icons.Default.Visibility, contentDescription = null, tint = TextMuted)
                            }
                        },
                    )

                    EcoTextField(
                        value = confirmPw, onChange = { confirmPw = it; errorMsg = null },
                        label = "Confirm Password",
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                    )

                    errorMsg?.let {
                        Text(it, color = Color(0xFFF87171), fontSize = 13.sp)
                    }

                    Button(
                        onClick = {
                            when {
                                name.isBlank()            -> { errorMsg = "Name is required"; return@Button }
                                !email.contains("@")      -> { errorMsg = "Enter a valid email"; return@Button }
                                password.length < 8       -> { errorMsg = "Password must be ≥ 8 characters"; return@Button }
                                password != confirmPw     -> { errorMsg = "Passwords don't match"; return@Button }
                            }
                            loading = true
                            viewModel.signUp(
                                name      = name.trim(),
                                email     = email.trim(),
                                password  = password,
                                phone     = phone.trim(),
                                role      = role,
                                onSuccess = { r, s -> loading = false; onRegisterSuccess(r, s) },
                                onError   = { msg -> loading = false; errorMsg = msg },
                            )
                        },
                        enabled  = !loading,
                        colors   = ButtonDefaults.buttonColors(containerColor = BrandGreen),
                        shape    = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                    ) {
                        if (loading) {
                            CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                        } else {
                            Text("Create Account", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))
            TextButton(onClick = onNavigateToLogin) {
                Text("Already have an account? ", color = TextMuted, fontSize = 14.sp)
                Text("Sign in", color = BrandGreen, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }
        }
    }
}
