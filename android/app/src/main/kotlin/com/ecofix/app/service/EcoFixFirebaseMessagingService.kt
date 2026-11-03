package com.ecofix.app.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.ecofix.app.MainActivity
import com.ecofix.app.R
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Firebase Cloud Messaging service.
 *
 * Works in concert with the `notify-status-change` Supabase Edge Function,
 * which sends FCM pushes whenever a booking status changes.
 *
 * Notification payload (from Edge Function):
 *   { title, body, booking_id, type }
 */
@AndroidEntryPoint
class EcoFixFirebaseMessagingService : FirebaseMessagingService() {

    @Inject
    lateinit var supabaseService: com.ecofix.app.data.remote.SupabaseService

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun onMessageReceived(message: RemoteMessage) {
        val title     = message.notification?.title ?: message.data["title"] ?: "EcoFix"
        val body      = message.notification?.body  ?: message.data["body"]  ?: ""
        val bookingId = message.data["booking_id"]

        showNotification(title, body, bookingId)
    }

    /** Called when a new FCM token is generated — persist to Supabase for targeting. */
    override fun onNewToken(token: String) {
        serviceScope.launch {
            try {
                val userId = supabaseService.client.auth.currentUserOrNull()?.id ?: return@launch
                supabaseService.client.postgrest["users"]
                    .update({ set("fcm_token", token) }) {
                        filter { eq("id", userId) }
                    }
            } catch (_: Exception) { /* Non-fatal */ }
        }
    }

    private fun showNotification(title: String, body: String, bookingId: String?) {
        val channelId = "ecofix_repairs"
        val manager   = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create channel (required for Android 8+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Repair Updates",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply { description = "Live status updates for your repairs" }
            manager.createNotificationChannel(channel)
        }

        // Deep-link intent to tracking screen
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            bookingId?.let { putExtra("booking_id", it) }
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        manager.notify(System.currentTimeMillis().toInt(), notification)
    }
}
