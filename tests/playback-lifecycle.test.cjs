const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

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
const worker = fs.readFileSync("app/src/main/assets/sid-worker.js", "utf8");

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
assert.match(service, /basicLeadInFrames\+=Math\.max\(0,basicCandidateStartRenderedFrames-basicInitStartRenderedFrames\)/,
  "native BASIC timing must remember silent interpreter startup frames");
assert.match(service, /frames-basicLeadInFrames/,
  "native play time must exclude BASIC interpreter startup");
assert.match(service, /basicTune&&audibleStartRenderedFrames<0\)return 0/,
  "native BASIC time must stay at zero until music begins");
assert.match(service, /basicQuietFrames\+=pcmFrames\)>=SAMPLE_RATE\/2/,
  "native BASIC detection must wait through a quiet startup period");
assert.match(worker, /basicQuietFrames\+=pcm\.length\/channels\)>=44100\/2/,
  "worker BASIC detection must wait through a quiet startup period");
assert.match(service, /skipAndSync\(-1,"prev"\)/,
  "lock-screen PREVIOUS must switch songs inside the native service");
assert.match(service, /skipAndSync\(1,"next"\)/,
  "lock-screen NEXT must switch songs inside the native service");
assert.match(html, /nativePlaylistAdd/,
  "the WebView playlist must be mirrored for wake-safe native song changes");
assert.match(html, /adoptNativeSong\(Number\(cmd\.slice\(7\)\)\)/,
  "the WebView must synchronize after a native lock-screen song change");
assert.match(service, /return played<s\.basicLeadInFrames/,
  "the native service must expose the BASIC initialization state");
assert.match(html, /status\("Initializing BASIC tune…"\)/,
  "the UI must explain the silent BASIC startup period");
assert.match(html, /if\(\$\("status"\)\.textContent!=="Initializing BASIC tune…"\)status\("Initializing BASIC tune…"\)/,
  "other status updates must not permanently hide BASIC initialization");
assert.match(service, /basicAudibleCandidateFrames>=SAMPLE_RATE\*3\/4/,
  "brief BASIC startup sounds must not finish initialization");
assert.match(service, /basicCandidateQuietFrames>=SAMPLE_RATE\/2/,
  "short musical rests must not reset BASIC music detection");
assert.match(worker, /basicCandidateFrames>=44100\*3\/4/,
  "worker timing must also require sustained BASIC music");
assert.match(worker, /basicCandidateQuietFrames\+=pcm\.length\/channels\)>=44100\/2/,
  "worker BASIC detection must tolerate short musical rests too");
assert.match(service, /if\(fastBasicStartup\)fastBasicCandidatePcm\.add\(pcm\)/,
  "the verified slow BASIC tune must buffer candidate music while fast-forwarding");
assert.match(service, /basicAudibleCandidateFrames>=SAMPLE_RATE\*3\/4[\s\S]*?pcm=buffered/,
  "the verified slow BASIC tune must reject short setup sounds and preserve sustained music");
assert.match(service, /skipSilentBasicPcm=fastBasicStartup&&audibleStartRenderedFrames<0/,
  "the verified slow BASIC tune must render its silent setup without blocking on AudioTrack");
assert.match(service, /if\(skipSilentBasicPcm\)continue/,
  "silent accelerated BASIC setup must not be written to the audio device");

const timingContext = {};
vm.createContext(timingContext);
vm.runInContext(worker.match(/function isBasicRsid\(bytes\)\{[\s\S]*?\n\}/)[0], timingContext);
vm.runInContext(worker.match(/function hasAudiblePcm\(pcm\)\{[\s\S]*?\n\}/)[0], timingContext);
const basicRsid = new Uint8Array(120);
basicRsid.set(Buffer.from("RSID"));
basicRsid[119] = 0x02;
assert.equal(timingContext.isBasicRsid(basicRsid), true,
  "a BASIC RSID must use audible-start timing");
assert.equal(timingContext.hasAudiblePcm(new Int16Array([0, 64, -128])), false,
  "small emulator residuals must remain part of BASIC startup silence");
assert.equal(timingContext.hasAudiblePcm(new Int16Array(64).fill(1000)), true,
  "real SID output must start the audible song clock");

const searchContext = {
  playlistSearchQuery: "BASIC",
  searchMetadata: q => q.header
};
vm.createContext(searchContext);
vm.runInContext(html.match(/function normalizeSearchText\(s\)\{[^\n]+\}/)[0], searchContext);
vm.runInContext(html.match(/function playlistSearchMatch\(q\)\{[\s\S]*?\n\}/)[0], searchContext);
assert.equal(searchContext.playlistSearchMatch({
  file:{name:"American_Flag_BASIC.sid"},
  header:{name:"American Flag",author:"Jeroen Kimmel"}
}), true, "search must match BASIC in the original filename even when header metadata exists");

assert.match(html, /SELF_LOOPING_BASIC_MD5S=new Set\(\["0af13ccf6895a87619ae7da71da09a0f"\]\)/,
  "Mexican Hat Dance must bypass the external HVSC end timer");
assert.match(html, /durationSec=selfLoopingBasic\?null:/,
  "self-looping BASIC tunes must not be stopped by an external duration");

console.log("Playback lifecycle, BASIC timing, and filename-search regression checks passed.");
