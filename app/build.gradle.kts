plugins { id("com.android.application") }
android {
    namespace = "com.example.c64sidplayersimple"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.example.c64sidplayersimple"
        minSdk = 23
        targetSdk = 35
        versionCode = 397
        versionName = "3.9.7"
    }
}
dependencies { implementation("androidx.webkit:webkit:1.12.1") }
