# C64 SID Player V3.1 - simplified APK build

This version deliberately removes the Android NDK and native libsidplayfp build.
It is a standard Android Java/WebView project, which makes the APK dramatically
easier to compile.

## Build locally

Open the project in Android Studio and choose:

Build -> Build APK(s)

The debug APK will be at:

app/build/outputs/apk/debug/app-debug.apk

## Build automatically on GitHub

The repository includes:

.github/workflows/build-apk.yml

Push the project to GitHub. GitHub Actions will compile the app and upload an
artifact named:

C64-SID-Player-V3.1-APK

Inside it is:

C64-SID-Player-V3.1.apk

That debug APK is signed by the Android debug build process and can be installed
directly on an Android phone after allowing installation from the browser/files
app used to open it.

## Important playback note

This simplified APK uses jsSID scripts from jsDelivr at runtime. Therefore it
needs internet access to initialize the playback engine. This tradeoff removes
the difficult Android NDK/libsidplayfp compile step.

No SID music is included.
