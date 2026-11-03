package com.ecofix.app.di

import android.content.Context
import androidx.room.Room
import com.ecofix.app.data.local.BookingDao
import com.ecofix.app.data.local.EcoFixDatabase
import com.ecofix.app.data.local.StatusLogDao
import com.ecofix.app.data.remote.SupabaseService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideSupabaseService(): SupabaseService = SupabaseService()

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): EcoFixDatabase =
        Room.databaseBuilder(context, EcoFixDatabase::class.java, "ecofix.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    fun provideBookingDao(db: EcoFixDatabase): BookingDao = db.bookingDao()

    @Provides
    fun provideStatusLogDao(db: EcoFixDatabase): StatusLogDao = db.statusLogDao()
}
