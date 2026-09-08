import createLibsidplayfp from "./sid/libsidplayfp.js";

let module=null, player=null;
let playing=false, generation=0, pcmGeneration=1;
let roms={kernal:null,basic:null,chargen:null};

let sourceBytes=null;
let currentSong=0;
let elapsedFrames=0;
let channels=2;
let loopOne=false;
// SID files normally contain no duration metadata. V3.7 uses a 3:00
// repeat point for LOOP 1. A future version can use HVSC Songlengths.md5.
const LOOP_SECONDS=180;

function post(type, data={}) { self.postMessage({type, ...data}); }
function clean(s){return String(s||"").replace(/\0/g,"").trim()}
function parseHeader(a){
  const ascii=(o,n)=>clean(String.fromCharCode(...a.slice(o,o+n)));
  if(a.length<0x76)return{name:"",author:"",release:"",songs:1,start:1};
  return {
    name:ascii(0x16,32),author:ascii(0x36,32),release:ascii(0x56,32),
    songs:(a[0x0e]<<8)|a[0x0f],start:(a[0x10]<<8)|a[0x11]
  };
}
function positionSeconds(){ return elapsedFrames/44100; }
function reportPosition(extra={}){
  post("position",{seconds:positionSeconds(),loopOne,loopSeconds:LOOP_SECONDS,...extra});
}

async function init(){
  try{
    module=await createLibsidplayfp({
      locateFile:asset=>new URL("./sid/"+asset,self.location.href).href
    });
    const test=new module.SidPlayerContext();
    if(!test.configure(44100,true))throw new Error(test.getLastError());
    const engine=(typeof module.getSidEngineName==="function")
      ? module.getSidEngineName() : "reSIDfp";
    test.delete();
    post("ready",{engine});
  }catch(e){post("error",{message:String(e&&(e.stack||e.message||e))})}
}
await init();

async function makePlayer(bytes,song){
  if(player){try{player.delete()}catch(e){} player=null}
  player=new module.SidPlayerContext();
  if(!player.configure(44100,true))throw new Error(player.getLastError());

  if(typeof player.setEmulationConfig==="function"){
    try{
      player.setEmulationConfig({
        sidModel:"MOS6581", forceSidModel:false, digiBoost:true
      });
    }catch(e){}
  }

  if(roms.kernal||roms.basic||roms.chargen){
    if(!player.setSystemROMs(roms.kernal,roms.basic,roms.chargen))
      throw new Error("ROM: "+player.getLastError());
  }

  const patched=bytes.slice();
  const songs=Math.max(1,(patched[0x0e]<<8)|patched[0x0f]);
  const s=Math.max(0,Math.min(songs-1,song));
  patched[0x10]=((s+1)>>8)&255;
  patched[0x11]=(s+1)&255;

  if(!player.loadSidBuffer(patched))throw new Error(player.getLastError());
  if(typeof player.reset==="function"){
    try{ player.reset(); }catch(e){}
  }
  channels=player.getChannels?player.getChannels():2;
  return s;
}

async function restartAtStart(){
  if(!sourceBytes)return;
  currentSong=await makePlayer(sourceBytes,currentSong);
  elapsedFrames=0;
}

async function fastSeekTo(targetSeconds){
  if(!sourceBytes)return;
  const target=Math.max(0,targetSeconds);
  const now=positionSeconds();

  // Rewind requires rebuilding the C64 state from the start.
  if(target < now){
    await restartAtStart();
  }

  // Fast seek: run the emulator in large chunks instead of normal playback-size
  // chunks. 1,000,000 C64 cycles is roughly one second of emulated time, so
  // this is dramatically faster than the old 32K-cycle seek loop.
  const FAST_CYCLES=1000000;
  let iterations=0;
  while(positionSeconds()+0.01 < target){
    let pcm=player.render(FAST_CYCLES);
    if(!pcm || pcm.length===0) throw new Error("Renderer returned no audio while seeking");
    elapsedFrames += pcm.length/channels;
    // Keep the worker responsive without slowing every seek step.
    if((++iterations % 8)===0) await new Promise(r=>setTimeout(r,0));
  }
  reportPosition({seeking:false});
}

async function renderLoop(gen){
  const TARGET_CHUNK_MS=200;
  const cycles=16384;

  while(playing && gen===generation && player){
    try{
      if(loopOne && positionSeconds()>=LOOP_SECONDS){
        await restartAtStart();
        post("looped");
      }

      const parts=[];
      let totalSamples=0;
      let producedMs=0;

      while(producedMs<TARGET_CHUNK_MS){
        let pcm=player.render(cycles);
        if(!pcm || pcm.length===0) throw new Error("Renderer returned no audio");
        pcm=pcm.slice();
        parts.push(pcm);
        totalSamples += pcm.length;
        elapsedFrames += pcm.length/channels;
        producedMs = (totalSamples/channels/44100)*1000;

        if(loopOne && positionSeconds()>=LOOP_SECONDS) break;
      }

      const merged=new Int16Array(totalSamples);
      let off=0;
      for(const p of parts){ merged.set(p,off); off+=p.length; }

      self.postMessage(
        {type:"pcm",generation:pcmGeneration,buffer:merged.buffer},
        [merged.buffer]
      );
      reportPosition();
      await new Promise(r=>setTimeout(r,0));
    }catch(e){
      playing=false;
      post("error",{message:"Playback: "+String(e&&(e.stack||e.message||e))});
      return;
    }
  }
}

self.onmessage=async e=>{
  const m=e.data||{};
  try{
    if(m.type==="load"){
      playing=false; generation++;
      if(Number.isInteger(m.pcmGeneration)) pcmGeneration=m.pcmGeneration;
      const bytes=new Uint8Array(m.buffer);
      sourceBytes=bytes.slice();
      const header=parseHeader(bytes);
      currentSong=await makePlayer(sourceBytes,m.song??Math.max(0,(header.start||1)-1));
      elapsedFrames=0;
      post("loaded",{header,sub:currentSong});
      reportPosition();
      return;
    }

    if(m.type==="play"){
      if(!player)return;
      if(playing)return;
      playing=true;
      const gen=++generation;
      renderLoop(gen);
      return;
    }

    if(m.type==="pause"){
      playing=false; generation++;
      return;
    }

    if(m.type==="stop"){
      playing=false; generation++;
      if(player){try{player.delete()}catch(e){} player=null}
      elapsedFrames=0;
      reportPosition();
      return;
    }

    if(m.type==="seek"){
      if(!player)return;
      const resume=!!m.resume;
      playing=false;
      generation++;
      if(Number.isInteger(m.pcmGeneration)) pcmGeneration=m.pcmGeneration;
      post("position",{seconds:positionSeconds(),seeking:true,loopOne,loopSeconds:LOOP_SECONDS});
      await fastSeekTo(Number(m.seconds)||0);
      if(resume){
        playing=true;
        const gen=++generation;
        renderLoop(gen);
      }
      return;
    }

    if(m.type==="loopOne"){
      loopOne=!!m.enabled;
      reportPosition();
      return;
    }

    if(m.type==="roms"){
      if(m.kernal)roms.kernal=new Uint8Array(m.kernal);
      if(m.basic)roms.basic=new Uint8Array(m.basic);
      if(m.chargen)roms.chargen=new Uint8Array(m.chargen);
      return;
    }
  }catch(err){
    post("error",{message:String(err&&(err.stack||err.message||err))});
  }
};
