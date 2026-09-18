const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('app/src/main/assets/index.html','utf8');
const elements={};const calls=[];const posts=[];
const ctx={Uint8Array,Math,Number,performance:{now:()=>0},setTimeout:()=>{},
 $:id=>elements[id]||(elements[id]={}),status:s=>ctx.message=s,
 workerReady:true,restartOnNextPlay:false,playbackReady:false,playbackLoadError:'',
 pauseInternal:()=>{},pcmGeneration:0,current:-1,currentBytes:null,activeSub:0,
 nativeAndroid:true,c64Roms:{basic:null,kernal:null},worker:{postMessage:m=>posts.push(m)},
 android:(...a)=>{calls.push(a);return ctx.nativeOk},nativeOk:true,
 toBase64:b=>Buffer.from(b).toString('base64'),ensureBytes:async q=>q.bytes,renderList:()=>{},
 updateCurrentHighlight:()=>{},showSelectedSong:()=>{},
 atob:s=>Buffer.from(s,'base64').toString('binary')};vm.createContext(ctx);
for(const name of ['decodeRom','needsBasicRoms','loadSong','play']){
 const start=source.indexOf('function '+name+'(');assert(start>=0);let end=source.indexOf('\n}',start)+2;
 vm.runInContext((source.slice(start-6,start)==='async '?'async ':'')+source.slice(start,end),ctx);
}
(async()=>{
 const read=n=>{const b=new Uint8Array(124);b.set(Buffer.from(n.startsWith('Chess')?'RSID':'PSID'));b[5]=2;b[7]=124;b[15]=n.startsWith('Chess')?1:2;b[17]=b[15];if(n.startsWith('Chess'))b[119]=2;return b;};
 ctx.queue=[{bytes:read('Chess_Offenbach_BASIC.sid')}];
 await ctx.loadSong(0,true);assert(ctx.playbackLoadError.includes('BASIC and KERNAL'));assert(!ctx.playbackReady);assert(!calls.some(a=>a[0]==='nativeLoadSid'));await ctx.play();assert(!calls.some(a=>a[0]==='nativePlay'));
 calls.length=0;ctx.queue=[{bytes:read('Street_Cred_Boxing.sid')}];await ctx.loadSong(0,false);
 const load=calls.find(a=>a[0]==='nativeLoadSid');assert.equal(load[2],1);assert.equal(posts.at(-1).song,1);assert.deepEqual(Buffer.from(load[1],'base64'),Buffer.from(ctx.queue[0].bytes));assert(ctx.playbackReady);
 ctx.nativeOk=false;calls.length=0;await ctx.loadSong(0,true);await ctx.play();assert(!ctx.playbackReady);assert(!calls.some(a=>a[0]==='nativePlay'));
 assert.equal(ctx.decodeRom(Buffer.alloc(8191).toString('base64')),null);assert.equal(ctx.decodeRom(Buffer.alloc(8192).toString('base64')).length,8192);
 console.log('Missing ROM guard, default subtune, original metadata bytes, load failure, ROM size checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
