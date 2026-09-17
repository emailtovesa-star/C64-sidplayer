const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/src/main/assets/index.html", "utf8");
const service = fs.readFileSync(
  "app/src/main/java/com/example/c64sidplayersimple/PlaybackService.java",
  "utf8"
);
const bridge = fs.readFileSync(
  "app/src/main/java/com/example/c64sidplayersimple/MainActivity.java",
  "utf8"
);
const tv = fs.readFileSync("app/src/main/assets/tv-power.js", "utf8");
const blockDrop = fs.readFileSync("app/src/main/assets/oldtv-tetris.js", "utf8");

const stopBody = html.match(/function stop\(\)\{([\s\S]*?)\n\}/)?.[1] || "";
const changeRomsBody = html.match(/async function changeRoms\(kind,file\)\{([\s\S]*?)\n\}/)?.[1] || "";
const nativeSetRomsBody = bridge.match(/nativeSetRoms\(String kernal, String basic\) \{([\s\S]*?)\n        \}/)?.[1] || "";
assert.match(stopBody, /nativeUnloadSid/, "STOP must unload without destroying the service");
assert.doesNotMatch(
  stopBody,
  /nativeAndroid\)android\("stopPlaybackService"\)/,
  "native STOP must not race service destruction against the next PLAY"
);
assert.match(html, /attempt<16&&loadGeneration===pcmGeneration/,
  "native load must tolerate asynchronous foreground-service startup");
assert.match(html, /if\(loadGeneration!==pcmGeneration\)return/,
  "stale load requests must be cancelled");
assert.match(service, /synchronized\(lock\)\{[\s\S]*?pcm=NativeSid\.nativeRender\(2048\)/,
  "render must hold the same lock used by unload and reload");

for (const [name, source] of [["service", service], ["bridge", bridge], ["TV", tv]]) {
  assert.doesNotMatch(source, /visualizer|equalizer/i, `${name} must not contain equalizer code`);
}
assert.match(tv, /width:100%/, "striped TV app icon must be 50 percent larger than two-thirds size");
assert.match(tv, /height:100%/, "striped TV app icon must fill the picture height");
assert.match(tv, /classList\.add\("gifPlaying","stripesPlaying"\)/,
  "the app icon must appear only over the animated stripes screen");
assert.match(blockDrop, /\.otMessage\.pauseOnly\{[\s\S]*?border:0;[\s\S]*?background:transparent;/,
  "PAUSED must be plain text without a message frame");
assert.match(blockDrop, /innerHTML="PAUSED";\s*messageEl\.classList\.add\("pauseOnly"\)/,
  "PAUSED displays must use the frameless style");
assert.match(changeRomsBody, /!kind && !c64Roms\.basic && !c64Roms\.kernal/,
  "removing absent ROMs must be a no-op");
assert.match(changeRomsBody, /if\(affectsCurrent\)\{pauseInternal/,
  "ROM changes may pause only a BASIC-dependent current tune");
assert.doesNotMatch(nativeSetRomsBody, /PlaybackService\.unloadSid/,
  "setting ROMs must not unload the currently playing native SID");

console.log("Playback lifecycle regression checks passed.");
