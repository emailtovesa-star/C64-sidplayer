# C64 SID Player V3.4 — Android WebView/WASM fix

V3.4 keeps the real libsidplayfp/reSIDfp playback engine and fixes the Android
loading path.

Changes from V3.3:
- Uses AndroidX WebViewAssetLoader.
- Loads the app from https://appassets.androidplatform.net/assets/index.html
  instead of file:///android_asset/index.html.
- Keeps libsidplayfp.js and libsidplayfp.wasm inside the APK.
- Adds visible JS, Promise, and 12-second engine-initialization diagnostics.
- Broadens the Android document picker to */* because many providers do not
  label .sid files with a SID MIME type.
- Keeps optional user-supplied KERNAL/BASIC/CHARGEN ROM selectors.
- GitHub Actions checks that the V3.4 asset-loader code is really present.

No copyrighted SID music or Commodore ROM images are included.
