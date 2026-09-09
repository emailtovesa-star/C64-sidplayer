plugins { id("com.android.application") }
android {
    namespace = "com.example.c64sidplayersimple"
    compileSdk = 35
    defaultConfig {
        ndk { abiFilters += listOf("arm64-v8a") }
        applicationId = "com.example.c64sidplayersimple"
        minSdk = 23
        targetSdk = 35
        versionCode = 404
        versionName = "4.0.4"
    }
    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "3.22.1"
        }
    }
}
dependencies { implementation("androidx.webkit:webkit:1.12.1") }
