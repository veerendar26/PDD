package com.ecofix.app

import android.app.Application
import androidx.work.Configuration
import androidx.work.WorkManager
import com.ecofix.app.data.sync.SyncWorker
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class EcoFixApplication : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: androidx.hilt.work.HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun onCreate() {
        super.onCreate()
        // Schedule periodic offline sync when connected
        SyncWorker.schedulePeriodicSync(this)
    }
}
