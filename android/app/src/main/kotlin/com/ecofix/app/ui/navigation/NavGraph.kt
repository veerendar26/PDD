package com.ecofix.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.ecofix.app.ui.screens.admin.AdminDashboardScreen
import com.ecofix.app.ui.screens.auth.LoginScreen
import com.ecofix.app.ui.screens.auth.RegisterScreen
import com.ecofix.app.ui.screens.customer.BookRepairScreen
import com.ecofix.app.ui.screens.customer.CustomerDashboardScreen
import com.ecofix.app.ui.screens.customer.CustomerHistoryScreen
import com.ecofix.app.ui.screens.customer.ProfileScreen
import com.ecofix.app.ui.screens.customer.TrackingScreen
import com.ecofix.app.ui.screens.provider.ProviderDashboardScreen
import com.ecofix.app.ui.screens.provider.ProviderJobDetailScreen
import com.ecofix.app.ui.screens.provider.ProviderPendingScreen
import com.ecofix.app.ui.screens.splash.SplashScreen

sealed class Screen(val route: String) {
    object Splash               : Screen("splash")
    object Login                : Screen("login")
    object Register             : Screen("register")
    object CustomerDashboard    : Screen("customer/dashboard")
    object CustomerHistory      : Screen("customer/history")
    object BookRepair           : Screen("customer/book")
    object Profile              : Screen("customer/profile")
    object Tracking             : Screen("customer/bookings/{bookingId}") {
        fun createRoute(bookingId: String) = "customer/bookings/$bookingId"
    }
    object ProviderDashboard    : Screen("provider/dashboard")
    object ProviderVerificationStatus : Screen("provider/pending")
    object ProviderJobDetail    : Screen("provider/bookings/{bookingId}") {
        fun createRoute(bookingId: String) = "provider/bookings/$bookingId"
    }
    object AdminDashboard       : Screen("admin/dashboard")
}

@Composable
fun EcoFixNavGraph(
    navController: NavHostController = rememberNavController(),
    startDestination: String = Screen.Splash.route,
) {
    NavHost(navController = navController, startDestination = startDestination) {

        composable(Screen.Splash.route) {
            SplashScreen(
                onNavigateToLogin           = { navController.navigate(Screen.Login.route) { popUpTo(Screen.Splash.route) { inclusive = true } } },
                onNavigateToCustomer        = { navController.navigate(Screen.CustomerDashboard.route) { popUpTo(Screen.Splash.route) { inclusive = true } } },
                onNavigateToProvider        = { navController.navigate(Screen.ProviderDashboard.route) { popUpTo(Screen.Splash.route) { inclusive = true } } },
                onNavigateToProviderPending = { navController.navigate(Screen.ProviderVerificationStatus.route) { popUpTo(Screen.Splash.route) { inclusive = true } } },
                onNavigateToAdmin           = { navController.navigate(Screen.AdminDashboard.route) { popUpTo(Screen.Splash.route) { inclusive = true } } },
            )
        }

        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = { role, status ->
                    val dest = when (role) {
                        "admin" -> Screen.AdminDashboard.route
                        "technician" -> {
                            if (status == "approved") Screen.ProviderDashboard.route
                            else Screen.ProviderVerificationStatus.route
                        }
                        else -> Screen.CustomerDashboard.route
                    }
                    navController.navigate(dest) { popUpTo(Screen.Login.route) { inclusive = true } }
                },
                onNavigateToRegister = { navController.navigate(Screen.Register.route) },
            )
        }

        composable(Screen.Register.route) {
            RegisterScreen(
                onRegisterSuccess = { role, status ->
                    val dest = when (role) {
                        "admin" -> Screen.AdminDashboard.route
                        "technician" -> {
                            if (status == "approved") Screen.ProviderDashboard.route
                            else Screen.ProviderVerificationStatus.route
                        }
                        else -> Screen.CustomerDashboard.route
                    }
                    navController.navigate(dest) { popUpTo(Screen.Register.route) { inclusive = true } }
                },
                onNavigateToLogin = { navController.navigate(Screen.Login.route) },
            )
        }

        composable(Screen.CustomerDashboard.route) {
            CustomerDashboardScreen(
                onBookRepair    = { navController.navigate(Screen.BookRepair.route) },
                onOpenBooking   = { id -> navController.navigate(Screen.Tracking.createRoute(id)) },
                onOpenProfile   = { navController.navigate(Screen.Profile.route) },
                onOpenHistory   = { navController.navigate(Screen.CustomerHistory.route) },
            )
        }

        composable(Screen.CustomerHistory.route) {
            CustomerHistoryScreen(
                onOpenBooking = { id -> navController.navigate(Screen.Tracking.createRoute(id)) },
                onBack        = { navController.popBackStack() },
            )
        }

        composable(Screen.BookRepair.route) {
            BookRepairScreen(
                onBookingCreated = { id -> navController.navigate(Screen.Tracking.createRoute(id)) { popUpTo(Screen.BookRepair.route) { inclusive = true } } },
                onBack           = { navController.popBackStack() },
            )
        }

        composable(Screen.Profile.route) {
            ProfileScreen(
                onNavigateBack  = { navController.popBackStack() },
                onLogoutSuccess = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }

        composable(
            route = Screen.Tracking.route,
            arguments = listOf(navArgument("bookingId") { type = NavType.StringType }),
        ) { backStackEntry ->
            TrackingScreen(
                bookingId = backStackEntry.arguments?.getString("bookingId") ?: "",
                onBack    = { navController.popBackStack() },
            )
        }

        composable(Screen.ProviderDashboard.route) {
            ProviderDashboardScreen(
                onOpenJob = { id -> navController.navigate(Screen.ProviderJobDetail.createRoute(id)) },
                onLogout  = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }

        composable(Screen.ProviderVerificationStatus.route) {
            ProviderPendingScreen(
                onApproved = {
                    navController.navigate(Screen.ProviderDashboard.route) {
                        popUpTo(Screen.ProviderVerificationStatus.route) { inclusive = true }
                    }
                },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }

        composable(
            route = Screen.ProviderJobDetail.route,
            arguments = listOf(navArgument("bookingId") { type = NavType.StringType }),
        ) { backStackEntry ->
            ProviderJobDetailScreen(
                bookingId = backStackEntry.arguments?.getString("bookingId") ?: "",
                onBack    = { navController.popBackStack() },
            )
        }

        composable(Screen.AdminDashboard.route) {
            AdminDashboardScreen(
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }
    }
}
