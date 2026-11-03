package com.ecofix.app.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

// ── Entities ─────────────────────────────────────────────────

@Entity(tableName = "bookings_cache")
data class BookingEntity(
    @PrimaryKey val id: String,
    val productId: String,
    val customerId: String,
    val providerId: String?,
    val status: String,
    val estimatedCost: Double?,
    val finalCost: Double?,
    val scheduledAt: String?,
    val serviceType: String,
    val customerAddress: String?,
    val notes: String?,
    val createdAt: String,
    val updatedAt: String,
    // Denormalised for display
    val categoryName: String?,
    val issueDescription: String?,
    val providerName: String?,
)

@Entity(tableName = "status_log_cache")
data class StatusLogEntity(
    @PrimaryKey val id: String,
    val bookingId: String,
    val status: String,
    val note: String?,
    val changedBy: String,
    val changedAt: String,
)

// ── DAOs ─────────────────────────────────────────────────────

@Dao
interface BookingDao {
    @Query("SELECT * FROM bookings_cache ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<BookingEntity>>

    @Query("SELECT * FROM bookings_cache WHERE id = :id")
    fun observeById(id: String): Flow<BookingEntity?>

    @Query("SELECT * FROM bookings_cache WHERE status NOT IN ('completed','cancelled') ORDER BY createdAt DESC")
    fun observeActive(): Flow<List<BookingEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(bookings: List<BookingEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(booking: BookingEntity)

    @Query("DELETE FROM bookings_cache WHERE id = :id")
    suspend fun delete(id: String)
}

@Dao
interface StatusLogDao {
    @Query("SELECT * FROM status_log_cache WHERE bookingId = :bookingId ORDER BY changedAt ASC")
    fun observeByBooking(bookingId: String): Flow<List<StatusLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(entries: List<StatusLogEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entry: StatusLogEntity)
}

// ── Database ──────────────────────────────────────────────────

@Database(
    entities = [BookingEntity::class, StatusLogEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class EcoFixDatabase : RoomDatabase() {
    abstract fun bookingDao(): BookingDao
    abstract fun statusLogDao(): StatusLogDao
}
