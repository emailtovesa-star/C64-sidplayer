# V4.0.24: Bjerregaard initialization compatibility

The verified original files `DMC_Demo_IV_tune_2.sid` and
`Fourth_Dimension.sid` could load successfully but produce silence. Both use
the CPU X register during initialization, and negative X disables playback.
An appended `LDX #$00; JMP original_init` wrapper restored audio in the bundled
WASM engine and in build 286's native Android engine (confirmed on device).

Android now applies that same five-byte wrapper only to playback copies of
the two complete files identified by SHA-256 in `SidCompatibility.java`.
Names do not affect recognition. Other revisions, unknown tunes, and files
already patched pass through unchanged. This is a targeted compatibility
fix, not a global change to the C64 initialization environment.

The queue, WebView, and metadata worker still receive the original bytes, so
HVSC song-length lookup retains its original fingerprint. Native restart and
loop operations retain the patched playback data. WASM/browser audio playback
is unchanged; this release fixes the Android native playback path.

No music files or ROMs are included in the repository.

Run standalone checks with JDK 17:

```sh
mkdir -p /tmp/sid-compat-tests
javac -d /tmp/sid-compat-tests app/src/main/java/com/example/c64sidplayersimple/SidCompatibility.java tests/SidCompatibilityTest.java
java -cp /tmp/sid-compat-tests SidCompatibilityTest
```

To test actual files, append pairs of paths to an original SID and its
independently verified patched copy. The test checks byte-for-byte equivalence,
preservation of the original, repeat application, and rejection of altered
revisions. These fixture pairs were checked locally before this change.
