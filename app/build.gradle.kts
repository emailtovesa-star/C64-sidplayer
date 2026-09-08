plugins {
    id("com.android.application")
}

android {
    namespace = "com.example.c64sidplayersimple"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.c64sidplayersimple"
        minSdk = 24
        targetSdk = 35
        versionCode = 360
        versionName = "3.6"
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
