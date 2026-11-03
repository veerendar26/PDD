package com.ecofix.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ecofix.app.ui.viewmodel.AuthViewModel

private val BrandGreen    = Color(0xFF10B981)
private val Surface0      = Color(0xFF0A0F1A)
private val Surface100    = Color(0xFF1E293B)
private val Surface200    = Color(0xFF334155)
private val TextPrimary   = Color(0xFFF1F5F9)
private val TextSecondary = Color(0xFF94A3B8)
private val TextMuted     = Color(0xFF64748B)

@Composable
fun LoginScreen(
    viewModel: AuthViewModel = hiltViewModel(),
    onLoginSuccess: (role: String, status: String) -> Unit,
    onNavigateToRegister: () -> Unit,
) {
    var email    by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPw   by remember { mutableStateOf(false) }
    var loading  by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(colors = listOf(Surface0, Color(0xFF0F172A))))
            .statusBarsPadding()
            .navigationBarsPadding(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Logo
            Surface(
                modifier  = Modifier.size(64.dp),
                shape     = RoundedCornerShape(16.dp),
                color     = BrandGreen,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Build, contentDescription = "EcoFix", tint = Color.White, modifier = Modifier.size(32.dp))
                }
            }

            Spacer(Modifier.height(20.dp))
            Text("EcoFix", fontSize = 28.sp, fontWeight = FontWeight.Black, color = TextPrimary)
            Text("Sign in to your account", fontSize = 14.sp, color = TextSecondary)
            Spacer(Modifier.height(32.dp))

            // Card
            Card(
                colors = CardDefaults.cardColors(containerColor = Surface100),
                shape  = RoundedCornerShape(24.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    EcoTextField(
                        value    = email,
                        onChange = { email = it; errorMsg = null },
                        label    = "Email",
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                    )

                    EcoTextField(
                        value    = password,
                        onChange = { password = it; errorMsg = null },
                        label    = "Password",
                        visualTransformation = if (showPw) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                        trailingIcon = {
                            IconButton(onClick = { showPw = !showPw }) {
                                Icon(
                                    if (showPw) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = "Toggle password",
                                    tint = TextMuted,
                                )
                            }
                        },
                    )

                    errorMsg?.let {
                        Text(it, color = Color(0xFFF87171), fontSize = 13.sp)
                    }

                    Button(
                        onClick = {
                            loading = true
                            viewModel.signIn(
                                email    = email.trim(),
                                password = password,
                                onSuccess = { role, status ->
                                    loading = false
                                    onLoginSuccess(role, status)
                                },
                                onError = { msg ->
                                    loading = false
                                    errorMsg = msg
                                },
                            )
                        },
                        enabled  = email.isNotBlank() && password.isNotBlank() && !loading,
                        colors   = ButtonDefaults.buttonColors(containerColor = BrandGreen),
                        shape    = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                    ) {
                        if (loading) {
                            CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                        } else {
                            Text("Sign In", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            TextButton(onClick = onNavigateToRegister) {
                Text("Don't have an account? ", color = TextMuted, fontSize = 14.sp)
                Text("Sign up", color = BrandGreen, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }
        }
    }
}

@Composable
fun EcoTextField(
    value: String,
    onChange: (String) -> Unit,
    label: String,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    trailingIcon: @Composable (() -> Unit)? = null,
) {
    OutlinedTextField(
        value  = value,
        onValueChange = onChange,
        label  = { Text(label) },
        singleLine = true,
        visualTransformation = visualTransformation,
        keyboardOptions = keyboardOptions,
        trailingIcon = trailingIcon,
        modifier = Modifier.fillMaxWidth(),
        colors   = OutlinedTextFieldDefaults.colors(
            focusedBorderColor    = Color(0xFF10B981),
            unfocusedBorderColor  = Color(0xFF334155),
            focusedLabelColor     = Color(0xFF10B981),
            unfocusedLabelColor   = Color(0xFF64748B),
            focusedTextColor      = Color(0xFFF1F5F9),
            unfocusedTextColor    = Color(0xFFF1F5F9),
            cursorColor           = Color(0xFF10B981),
        ),
        shape = RoundedCornerShape(12.dp),
    )
}
