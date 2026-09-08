import createLibsidplayfp from "./sid/libsidplayfp.js";

let module=null, player=null;
let playing=false, generation=0, pcmGeneration=1;
let sourceBytes=null, currentSong=0;
let roms={kernal:null,basic:null,chargen:null};
let songlengths=new Map(), loopOne=false, loopSeconds=null, elapsedFrames=0, channels=2;

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


function parseTime(field){
  const m=/^(\d+):(\d+)(?:\.(\d{1,3}))?/.exec(field);
  if(!m)return null;
  let frac=0;
  if(m[3]) frac=Number(m[3]) * (m[3].length===1?100:m[3].length===2?10:1);
  return Number(m[1])*60+Number(m[2])+frac/1000;
}
async function loadSonglengths(){
  try{
    const text=await (await fetch("./Songlengths.md5")).text();
    for(const raw of text.split(/\r?\n/)){
      const line=raw.trim();
      if(!line || line.startsWith(";") || line.startsWith("[")) continue;
      const eq=line.indexOf("="); if(eq<=0) continue;
      const md5=line.slice(0,eq).trim().toLowerCase();
      if(!/^[0-9a-f]{32}$/.test(md5)) continue;
      const times=line.slice(eq+1).trim().split(/\s+/).map(parseTime);
      if(times.length && times.every(x=>x!==null)) songlengths.set(md5,times);
    }
    post("db",{entries:songlengths.size});
  }catch(e){ post("db",{entries:0,error:String(e)}); }
}
function currentSeconds(){ return elapsedFrames/44100; }

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
    await loadSonglengths();
    post("ready",{engine});
  }catch(e){post("error",{message:String(e&&(e.stack||e.message||e))})}
}
await init();

async function makePlayer(bytes,song){
  if(player){try{player.delete()}catch(e){} player=null}
  player=new module.SidPlayerContext();
  if(!player.configure(44100,true))throw new Error(player.getLastError());
  if(typeof player.setEmulationConfig==="function"){
    player.setEmulationConfig({
      sidModel:"MOS6581", forceSidModel:false, digiBoost:true
    });
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
  if(typeof player.reset==="function"&&!player.reset())
    throw new Error(player.getLastError());

  channels=player.getChannels?player.getChannels():2;
  const md5=(typeof player.getTuneMd5==="function" ? String(player.getTuneMd5()||"") : "").trim().toLowerCase();
  const lengths=songlengths.get(md5);
  loopSeconds=(lengths && Number.isFinite(lengths[s])) ? lengths[s] : null;
  elapsedFrames=0;
  post("duration",{seconds:loopSeconds,md5,sub:s,dbEntries:songlengths.size});
  return s;
}

async function renderLoop(gen){
  const TARGET_CHUNK_MS=200;
  const cycles=16384;
  while(playing && gen===generation && player){
    try{
      if(loopOne && loopSeconds && currentSeconds()>=loopSeconds){
        currentSong=await makePlayer(sourceBytes,currentSong);
        post("looped",{seconds:loopSeconds});
      }
      const parts=[];
      let totalSamples=0;
      let producedMs=0;
      const ch=player.getChannels?player.getChannels():2;

      while(producedMs<TARGET_CHUNK_MS){
        let pcm=player.render(cycles);
        if(!pcm || pcm.length===0) throw new Error("Renderer returned no audio");
        pcm=pcm.slice();
        parts.push(pcm);
        totalSamples += pcm.length;
        elapsedFrames += pcm.length/channels;
        producedMs = (totalSamples/ch/44100)*1000;
        if(loopOne && loopSeconds && currentSeconds()>=loopSeconds) break;
      }

      const merged=new Int16Array(totalSamples);
      let off=0;
      for(const p of parts){ merged.set(p,off); off+=p.length; }

      self.postMessage({type:"pcm",generation:pcmGeneration,buffer:merged.buffer},[merged.buffer]);
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
      if (Number.isInteger(m.pcmGeneration)) pcmGeneration=m.pcmGeneration;
      const bytes=new Uint8Array(m.buffer);
      sourceBytes=bytes.slice();
      const header=parseHeader(bytes);
      const sub=await makePlayer(sourceBytes,m.song??Math.max(0,(header.start||1)-1));
      currentSong=sub;
      post("loaded",{header,sub});
      return;
    }
    if(m.type==="play"){
      if(!player)return;
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
      return;
    }
    if(m.type==="loopOne"){
      loopOne=!!m.enabled;
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
