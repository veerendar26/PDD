package com.ecofix.app.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.shape.RoundedCornerShape

private val BrandGreen      = Color(0xFF10B981)
private val BrandGreenDark  = Color(0xFF059669)
private val Surface0        = Color(0xFF0A0F1A)
private val Surface100      = Color(0xFF1E293B)
private val Surface200      = Color(0xFF334155)
private val TextPrimary     = Color(0xFFF1F5F9)
private val TextSecondary   = Color(0xFF94A3B8)

private val EcoFixColorScheme = darkColorScheme(
    primary          = BrandGreen,
    onPrimary        = Color.White,
    primaryContainer = Color(0xFF064E3B),
    secondary        = Color(0xFF6366F1),
    onSecondary      = Color.White,
    background       = Surface0,
    onBackground     = TextPrimary,
    surface          = Surface100,
    onSurface        = TextPrimary,
    surfaceVariant   = Surface200,
    onSurfaceVariant = TextSecondary,
    error            = Color(0xFFF87171),
    onError          = Color.White,
    outline          = Surface200,
)

@Composable
fun EcoFixTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = EcoFixColorScheme,
        typography  = EcoFixTypography,
        shapes      = EcoFixShapes,
        content     = content,
    )
}

private val EcoFixTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Black,
        fontSize   = 30.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize   = 20.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontSize   = 14.sp,
        color      = TextSecondary,
    ),
)

private val EcoFixShapes = Shapes(
    small  = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large  = RoundedCornerShape(20.dp),
)
