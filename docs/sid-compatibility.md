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


## V4.0.25

- Namnam Special: the verified 3023-byte original receives the same X=0 init
  wrapper. Tested in the bundled WASM engine.
- Street Cred Boxing: the verified 4201-byte original receives three trailing
  zero bytes in the playback copy. Both subtunes produce sustained audio in
  the bundled engine; a one-byte extension does not fix it. The original music
  code and init address are unchanged. This is a targeted compatibility repair
  for the supplied rip, not a claim that every revision needs padding.
- Default subtune selection now uses the file header consistently in native and
  metadata playback. Street Cred Boxing defaults to subtune 2.
- BASIC RSID files prompt for missing BASIC/KERNAL ROMs instead of appearing to
  play silently. The C64 ROMs panel imports 8192-byte images, stores them locally,
  and supplies them to native libsidplayfp and the metadata worker. ROMs can be
  removed. Size validation cannot establish whether a ROM contains valid code.
- Chess Offenbach BASIC is such an RSID. No ROMs are bundled. Playback of this
  tune with user-supplied ROMs still requires on-device validation.

Tests verified the two new playback patches against independent test copies,
retained both older fixes, confirmed both Street Cred Boxing subtunes render
music, and exercised missing-ROM blocking, default-subtune selection, invalid
ROM sizes, preservation of original metadata bytes, and native-load failure.

## V4.0.30

- Dragon Sword: the exact verified 4453-byte original stores the incoming CPU
  X register at the start of its init routine. It receives the same playback-only
  `LDX #$00; JMP original_init` wrapper as the earlier affected Bjerregaard tunes.
- Drop Block: the PAUSED overlay is now plain text on the game screen, without
  the message panel border, background, or shadow frame.

## V4.0.31

- Removing ROMs when none are loaded is a no-op.
- Adding or removing ROMs no longer pauses, unloads, or reloads a current
  non-BASIC tune. Native ROM storage changes are deferred until the next safe
  SID unload/load so libsidplayfp never retains invalid ROM pointers.
- A current BASIC-dependent tune is still reloaded because its ROM environment
  genuinely changed; playback resumes automatically when the new ROM set is valid.

## V4.0.32

- Playlist search now always checks the original SID filename independently of
  its internal title and author fields. For example, searching `BASIC` finds
  `American_Flag_BASIC.sid` even when its PSID/RSID title omits that suffix.

## V4.0.33

- BASIC RSID song timing begins at the first audible SID output instead of at
  the start of the BASIC interpreter. This keeps long BASIC setup routines from
  consuming the HVSC song length and stopping a tune before its first note.

## V4.0.34

- BASIC initialization remains at `0:00` until music is confirmed. The detector
  waits for the C64 startup click to end and for a quiet initialization period
  before accepting later SID output as the first note.

## V4.0.35

- Mexican Hat Dance is a self-looping BASIC program whose HVSC duration does
  not include its roughly eleven-second interpreter setup. The external end
  timer is disabled for this exact tune so its own BASIC loop controls playback.
