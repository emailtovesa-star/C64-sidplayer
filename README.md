# C64 SID Player V3.3 — High Compatibility

This version actually replaces the old jsSID/TinySID playback code with
libsidplayfp WebAssembly using the reSIDfp artifact.

Key changes:
- libsidplayfp/reSIDfp PCM renderer is connected to Web Audio.
- On-screen engine indicator proves which engine is active.
- Digi boost is requested.
- Optional user-supplied C64 KERNAL (8192 bytes), BASIC (8192 bytes), and
  CHARGEN (4096 bytes) ROM selectors are included for ROM-dependent tunes.
- GitHub Actions refuses the build if the old jsSID URL is still in index.html.
- The reSIDfp JS/WASM runtime is downloaded and packaged into the APK at build time.

No SID music or copyrighted C64 ROM images are included.

GPL note: libsidplayfp-wasm/libsidplayfp/reSIDfp are GPL-family software.
Keep the corresponding license/source notices when distributing binaries.
