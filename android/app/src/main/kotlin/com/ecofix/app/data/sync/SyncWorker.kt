package com.ecofix.app.data.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.ecofix.app.data.local.BookingDao
import com.ecofix.app.data.remote.BookingRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.util.concurrent.TimeUnit

/**
 * WorkManager job that syncs local Room cache with Supabase.
 *
 * Runs on connectivity restore (enqueued with NetworkType.CONNECTED constraint).
 * Uses booking.updatedAt timestamp for last-write-wins conflict resolution.
 *
 * This is the Android-side implementation of the offline support described
 * in the sync architecture (README Section 6 item 4).
 */
@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val bookingRepository: BookingRepository,
    private val bookingDao: BookingDao,
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            // 1. Pull latest bookings from Supabase
            val remoteBookings = bookingRepository.getMyBookings()

            // 2. Upsert into local Room DB
            bookingDao.upsertAll(
                remoteBookings.map { dto ->
                    com.ecofix.app.data.local.BookingEntity(
                        id               = dto.id,
                        productId        = dto.productId,
                        customerId       = dto.customerId,
                        providerId       = dto.providerId,
                        status           = dto.status,
                        estimatedCost    = dto.estimatedCost,
                        finalCost        = dto.finalCost,
                        scheduledAt      = dto.scheduledAt,
                        serviceType      = dto.serviceType,
                        customerAddress  = dto.customerAddress,
                        notes            = dto.notes,
                        createdAt        = dto.createdAt,
                        updatedAt        = dto.updatedAt,
                        // Denormalised fields — null for now (enriched by separate queries)
                        categoryName     = null,
                        issueDescription = null,
                        providerName     = null,
                    )
                }
            )

            Result.success()
        } catch (e: Exception) {
            // Retry up to 3 times with exponential backoff
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }

    companion object {
        const val WORK_NAME = "ecofix_sync"

        fun enqueue(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context)
                .enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.REPLACE, request)
        }

        /** Periodic sync — runs every 15 minutes when connected */
        fun schedulePeriodicSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val periodic = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    "${WORK_NAME}_periodic",
                    ExistingPeriodicWorkPolicy.KEEP,
                    periodic,
                )
        }
    }
}
