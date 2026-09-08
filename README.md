# C64 SID Player V3.2 High Compatibility

Android WebView shell using libsidplayfp-wasm with the reSIDfp engine. V3.2 replaces the limited jsSID/TinySID playback used by V3.1.

Goals: cycle-based C64 execution, accurate 6581/8580 emulation, digi/sample playback, better CIA/IRQ compatibility, offline playback after installation, and subtunes.

The build workflow downloads the current libsidplayfp-wasm distribution into the APK before Gradle builds it. The resulting APK therefore does not need the network to initialize the SID engine.

RSID and other ROM-dependent tunes can still require legally obtained C64 KERNAL/BASIC/CHARGEN ROM images. ROM images are not included.

libsidplayfp-wasm and its upstream components are GPL-2.0-or-later; the workflow packages its license/notices alongside the engine.
