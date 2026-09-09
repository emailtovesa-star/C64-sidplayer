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
        versionCode = 395
        versionName = "3.9.5"
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
