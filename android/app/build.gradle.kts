plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    alias(libs.plugins.google.services)
}

android {
    namespace   = "com.ecofix.app"
    compileSdk  = 35

    defaultConfig {
        applicationId  = "com.ecofix.app"
        minSdk         = 26
        targetSdk      = 35
        versionCode    = 1
        versionName    = "1.0.0"

        // Inject secrets from local.properties at build time
        val localProps = com.android.build.gradle.internal.cxx.configure.gradleLocalProperties(rootDir, providers)
        buildConfigField("String", "SUPABASE_URL",      "\"${localProps["supabase.url"] ?: ""}\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"${localProps["supabase.anonKey"] ?: ""}\"")
        buildConfigField("String", "RAZORPAY_KEY_ID",   "\"${localProps["razorpay.keyId"] ?: ""}\"")

        resValue("string", "google_maps_key", localProps["mapsApiKey"] as? String ?: "")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions { jvmTarget = "17" }

    buildFeatures {
        compose     = true
        buildConfig = true
    }
}

hilt {
    enableAggregatingTask = false
}

dependencies {
    // Core
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime)
    implementation(libs.androidx.lifecycle.viewmodel)
    implementation(libs.androidx.activity.compose)
    implementation(libs.navigation.compose)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)

    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons)
    debugImplementation(libs.compose.ui.tooling)

    // Supabase
    implementation(platform(libs.supabase.bom))
    implementation(libs.supabase.postgrest)
    implementation(libs.supabase.auth)
    implementation(libs.supabase.realtime)
    implementation(libs.supabase.storage)
    implementation(libs.supabase.functions)
    implementation(libs.supabase.compose.auth)
    implementation(libs.supabase.compose.auth.ui)
    implementation(libs.ktor.client.android)
    implementation(libs.ktor.client.core)

    // Room
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    // Hilt DI
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)
    implementation(libs.hilt.work)

    // WorkManager
    implementation(libs.work.runtime.ktx)

    // Image loading
    implementation(libs.coil.compose)

    // Firebase
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)
    implementation(libs.firebase.analytics)

    // Maps
    implementation(libs.maps.compose)

    // Payments
    implementation(libs.razorpay.checkout)
}
