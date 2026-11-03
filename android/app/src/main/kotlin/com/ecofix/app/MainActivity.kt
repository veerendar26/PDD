package com.ecofix.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.core.view.WindowCompat
import com.ecofix.app.ui.navigation.EcoFixNavGraph
import com.ecofix.app.ui.theme.EcoFixTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        WindowCompat.setDecorFitsSystemWindows(window, false)

        // Make status bar dark (to match dark theme)
        window.statusBarColor = Color(0xFF0A0F1A).toArgb()

        setContent {
            EcoFixTheme {
                EcoFixNavGraph()
            }
        }
    }
}
