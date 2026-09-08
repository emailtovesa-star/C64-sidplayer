import createLibsidplayfp from "./sid/libsidplayfp.js";

let module=null, player=null;
let playing=false, generation=0;
let roms={kernal:null,basic:null,chargen:null};

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
  return s;
}

async function renderLoop(gen){
  const TARGET_CHUNK_MS=500;
  const cycles=16384;
  while(playing && gen===generation && player){
    try{
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
        producedMs = (totalSamples/ch/44100)*1000;
      }

      const merged=new Int16Array(totalSamples);
      let off=0;
      for(const p of parts){ merged.set(p,off); off+=p.length; }

      post("pcm",{buffer:merged.buffer},[merged.buffer]);
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
      const bytes=new Uint8Array(m.buffer);
      const header=parseHeader(bytes);
      const sub=await makePlayer(bytes,m.song??Math.max(0,(header.start||1)-1));
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
