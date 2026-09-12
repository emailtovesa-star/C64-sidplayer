(() => {
"use strict";
let overlay=null,canvas=null,ctx=null,raf=0,stars=[],oldOverflow="";
const STAR_COLORS=["#ffffff","#8fe8ff","#72a7ff","#b98cff","#ff7ad9","#ff8585","#ffd86f","#8dff9e","#ff9f43","#69edff"];

function styles(){
 if(document.getElementById("oldTvRetroVideoStyles"))return;
 const s=document.createElement("style");s.id="oldTvRetroVideoStyles";
 s.textContent=`
 .oldTvVideoBtn{position:absolute;left:50%;top:3%;bottom:auto;transform:translateX(-50%);width:74%;height:24px;min-height:24px;padding:0 2px;border:2px solid #090909;border-radius:5px;background:linear-gradient(#d7c7a0,#8f7a55 48%,#5c4932 52%,#2b2119);box-shadow:inset 0 1px 1px #fff8,0 2px 3px #000;color:#18110b;font:bold 8px/20px monospace;z-index:8;cursor:pointer}
 .oldTvRetroVideoOverlay{position:fixed;inset:0;z-index:100000;display:none;background:#020008;overflow:hidden;touch-action:none}.oldTvRetroVideoOverlay.show{display:block}
 #oldTvRetroVideoCanvas{position:absolute;inset:0;width:100%;height:100%;display:block}
 .retroExit{position:absolute;right:10px;top:max(10px,env(safe-area-inset-top));z-index:4;width:38px;height:38px;min-height:38px;padding:0;border:2px solid #ff8585;border-radius:50%;background:#4a111ccc;color:#fff;font:bold 18px monospace}`;
 document.head.appendChild(s);
}
function addButton(){
 const p=document.querySelector(".tvControlsOld");if(!p||document.getElementById("oldTvVideoBtn"))return false;
 const b=document.createElement("button");b.id="oldTvVideoBtn";b.className="oldTvVideoBtn";b.type="button";b.textContent="SHOW";
 b.onclick=e=>{e.preventDefault();e.stopPropagation();openVideo()};p.appendChild(b);return true;
}
function makeOverlay(){
 if(overlay)return;
 overlay=document.createElement("div");overlay.className="oldTvRetroVideoOverlay";overlay.id="oldTvRetroVideoOverlay";
 overlay.innerHTML='<canvas id="oldTvRetroVideoCanvas"></canvas><button class="retroExit" aria-label="Exit show">×</button>';
 document.body.appendChild(overlay);canvas=overlay.querySelector("canvas");ctx=canvas.getContext("2d");
 overlay.querySelector(".retroExit").onclick=closeVideo;window.addEventListener("resize",resize);
}
function resize(){
 const d=Math.max(1,Math.min(2,devicePixelRatio||1)),w=innerWidth,h=innerHeight;
 canvas.width=w*d;canvas.height=h*d;canvas.style.width=w+"px";canvas.style.height=h+"px";ctx.setTransform(d,0,0,d,0,0);
 const target=Math.max(180,Math.min(420,Math.floor((w*h)/2600)));
 stars=Array.from({length:target},()=>({
   x:Math.random()*w,y:Math.random()*h*.68,
   a:.25+Math.random()*.75,p:Math.random()*6.28,
   size:.5+Math.random()*2.1,
   color:STAR_COLORS[(Math.random()*STAR_COLORS.length)|0],
   tw:.7+Math.random()*2.6
 }));
}
function line(a,b,c,d,w,col,alpha=1){
 ctx.globalAlpha=alpha;ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap="round";
 ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke();ctx.globalAlpha=1;
}
function ellipse(x,y,rx,ry,col,alpha=1){
 ctx.globalAlpha=alpha;ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
}
function hairShape(x,y,s,col,phase){
 ctx.save();ctx.shadowBlur=10*s;ctx.shadowColor=col;
 ctx.fillStyle=col;
 ctx.beginPath();
 ctx.moveTo(x-28*s,y+9*s);
 ctx.bezierCurveTo(x-33*s,y-26*s,x-16*s,y-38*s,x,y-37*s);
 ctx.bezierCurveTo(x+18*s,y-38*s,x+34*s,y-23*s,x+29*s,y+10*s);
 ctx.bezierCurveTo(x+25*s,y+28*s,x+12*s,y+34*s,x,y+27*s);
 ctx.bezierCurveTo(x-13*s,y+34*s,x-26*s,y+27*s,x-28*s,y+9*s);
 ctx.closePath();ctx.fill();
 ctx.globalAlpha=.35;
 ctx.strokeStyle="#fff";ctx.lineWidth=2*s;
 for(let i=-2;i<=2;i++){
   ctx.beginPath();
   ctx.arc(x+i*7*s,y-4*s,16*s,Math.PI*.95,Math.PI*1.75);
   ctx.stroke();
 }
 ctx.restore();ctx.globalAlpha=1;
}
function dancer(cx,base,s,t,ph,dress,hair,skin,moveType){
 const beat=t*2.9+ph;
 const mode=Math.floor((t*.42+ph*.13)%4);
 const sway=Math.sin(beat)*13*s,bounce=Math.abs(Math.sin(beat))*7*s,x=cx+sway*.18;
 const head=base-205*s-bounce,shoulder=base-165*s-bounce,waist=base-112*s-bounce,hip=base-88*s-bounce;
 const arm=Math.sin(beat*1.35),leg=Math.sin(beat*1.08+1.2);
 ctx.save();ctx.shadowBlur=11*s;ctx.shadowColor=dress;

 hairShape(x,head-2*s,s,hair,ph);
 ellipse(x,head+3*s,18*s,22*s,skin);
 ellipse(x-18*s,head+4*s,3.2*s,5*s,skin);ellipse(x+18*s,head+4*s,3.2*s,5*s,skin);
 line(x-11*s,head-4*s,x-4*s,head-5*s,1.3*s,"#3b241f");line(x+4*s,head-5*s,x+11*s,head-4*s,1.3*s,"#3b241f");
 ellipse(x-7*s,head,s*1.8,s*1.5,"#202033");ellipse(x+7*s,head,s*1.8,s*1.5,"#202033");
 ctx.strokeStyle="#b97868";ctx.lineWidth=1.1*s;ctx.beginPath();ctx.moveTo(x,head+2*s);ctx.lineTo(x-1.5*s,head+8*s);ctx.lineTo(x+2*s,head+9*s);ctx.stroke();
 ctx.strokeStyle="#b92e62";ctx.lineWidth=2*s;ctx.beginPath();ctx.arc(x,head+12*s,6*s,.15,Math.PI-.15);ctx.stroke();
 ctx.fillStyle=skin;ctx.fillRect(x-6*s,head+20*s,12*s,18*s);

 ctx.fillStyle=dress;ctx.beginPath();ctx.moveTo(x-25*s,shoulder);ctx.quadraticCurveTo(x-31*s,shoulder+28*s,x-17*s,waist);ctx.quadraticCurveTo(x-34*s,hip+8*s,x-39*s,hip+34*s);ctx.lineTo(x+39*s,hip+34*s);ctx.quadraticCurveTo(x+34*s,hip+8*s,x+17*s,waist);ctx.quadraticCurveTo(x+31*s,shoulder+28*s,x+25*s,shoulder);ctx.closePath();ctx.fill();
 ctx.fillStyle="#ffe36c";ctx.fillRect(x-19*s,waist-2*s,38*s,5*s);

 // Acrobatic choreography changes every few seconds.
 if(mode===0){
   line(x-23*s,shoulder+12*s,x-62*s-arm*12*s,shoulder+10*s-arm*32*s,9*s,skin);
   line(x+23*s,shoulder+12*s,x+62*s+arm*12*s,shoulder+6*s+arm*32*s,9*s,skin);
 }else if(mode===1){
   // both arms overhead
   line(x-22*s,shoulder+12*s,x-25*s,shoulder-58*s,9*s,skin);
   line(x+22*s,shoulder+12*s,x+25*s,shoulder-58*s,9*s,skin);
 }else if(mode===2){
   // cartwheel-like diagonal pose
   line(x-22*s,shoulder+12*s,x-72*s,shoulder+38*s,9*s,skin);
   line(x+22*s,shoulder+12*s,x+62*s,shoulder-44*s,9*s,skin);
 }else{
   // split-leap style arm pose
   line(x-22*s,shoulder+12*s,x-65*s,shoulder-30*s,9*s,skin);
   line(x+22*s,shoulder+12*s,x+65*s,shoulder-30*s,9*s,skin);
 }

 const lx=x-15*s-leg*14*s,rx=x+15*s+leg*14*s;
 if(mode===2){
   // high kick
   line(x-18*s,hip+34*s,x-62*s,hip-8*s,12*s,skin);
   line(x+18*s,hip+34*s,rx,base-36*s,12*s,skin);
   line(x-62*s,hip-8*s,x-82*s,hip-32*s,9*s,"#b16dff");
   line(rx,base-36*s,rx+10*s,base,9*s,"#69edff");
 }else if(mode===3){
   // wide split-style leap
   line(x-18*s,hip+34*s,x-70*s,base-78*s,12*s,skin);
   line(x+18*s,hip+34*s,x+70*s,base-78*s,12*s,skin);
   line(x-70*s,base-78*s,x-95*s,base-60*s,9*s,"#b16dff");
   line(x+70*s,base-78*s,x+95*s,base-60*s,9*s,"#69edff");
 }else{
   line(x-18*s,hip+34*s,lx,base-42*s,12*s,skin);line(x+18*s,hip+34*s,rx,base-42*s,12*s,skin);
   line(lx,base-42*s,lx-8*s-leg*5*s,base,9*s,"#b16dff");line(rx,base-42*s,rx+8*s+leg*5*s,base,9*s,"#69edff");
 }
 ctx.restore();
}
function balloon(w,h,t){
 // V4.0.28 fantasy neon balloon: curved multicolour panels, seams,
 // highlight, burner flame, rigging and woven basket.
 const travel=(t*21)%(w+230);
 const x=travel-115;
 const y=h*.19+Math.sin(t*.48)*20;
 const tilt=Math.sin(t*.37)*.055;
 const s=Math.max(.82,Math.min(1.18,Math.min(w/430,h/760)));

 ctx.save();
 ctx.translate(x,y);
 ctx.rotate(tilt);
 ctx.scale(s,s);

 // soft neon aura
 ctx.shadowBlur=22;
 ctx.shadowColor="#ff63cf";

 // envelope outer silhouette
 const envelope=()=>{
   ctx.beginPath();
   ctx.moveTo(0,-55);
   ctx.bezierCurveTo(-35,-55,-52,-29,-49,-2);
   ctx.bezierCurveTo(-46,24,-27,43,-13,49);
   ctx.bezierCurveTo(-9,52,-7,57,-6,61);
   ctx.lineTo(6,61);
   ctx.bezierCurveTo(7,57,9,52,13,49);
   ctx.bezierCurveTo(27,43,46,24,49,-2);
   ctx.bezierCurveTo(52,-29,35,-55,0,-55);
   ctx.closePath();
 };

 // dark outline
 ctx.fillStyle="#24113d";
 envelope();ctx.fill();
 ctx.lineWidth=3;ctx.strokeStyle="#ffd86f";ctx.stroke();

 // coloured curved panels clipped inside envelope
 ctx.save();
 envelope();ctx.clip();
 const panels=[
   [-50,-27,"#ff4fae"],[-27,-10,"#8b5cff"],[-10,10,"#ffd34f"],
   [10,27,"#3fdcf2"],[27,50,"#ff7b3d"]
 ];
 for(const [a,b,c] of panels){
   const g=ctx.createLinearGradient(a,0,b,0);
   g.addColorStop(0,"#35164f");
   g.addColorStop(.18,c);
   g.addColorStop(.72,c);
   g.addColorStop(1,"#35164f");
   ctx.fillStyle=g;
   ctx.beginPath();
   ctx.moveTo(a,-58);
   ctx.bezierCurveTo(a-5,-20,a-4,25,a*.28,61);
   ctx.lineTo(b*.28,61);
   ctx.bezierCurveTo(b+4,25,b+5,-20,b,-58);
   ctx.closePath();
   ctx.fill();
 }

 // horizontal decorative bands
 ctx.globalAlpha=.7;
 ctx.strokeStyle="#fff3a0";ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(-45,-22);ctx.quadraticCurveTo(0,-10,45,-22);ctx.stroke();
 ctx.beginPath();ctx.moveTo(-38,18);ctx.quadraticCurveTo(0,31,38,18);ctx.stroke();
 ctx.globalAlpha=1;

 // glossy highlight
 const shine=ctx.createRadialGradient(-18,-25,1,-18,-25,27);
 shine.addColorStop(0,"rgba(255,255,255,.75)");
 shine.addColorStop(.35,"rgba(255,255,255,.20)");
 shine.addColorStop(1,"rgba(255,255,255,0)");
 ctx.fillStyle=shine;ctx.fillRect(-48,-54,60,70);
 ctx.restore();

 // panel seams
 ctx.shadowBlur=0;
 ctx.strokeStyle="rgba(31,14,57,.75)";ctx.lineWidth=1.6;
 for(const px of [-27,-10,10,27]){
   ctx.beginPath();
   ctx.moveTo(px,-50);
   ctx.bezierCurveTo(px*.92,-18,px*.65,27,px*.25,57);
   ctx.stroke();
 }

 // lower collar
 ctx.fillStyle="#542b6d";
 ctx.beginPath();ctx.moveTo(-11,48);ctx.lineTo(11,48);ctx.lineTo(8,63);ctx.lineTo(-8,63);ctx.closePath();ctx.fill();
 ctx.strokeStyle="#ffc75f";ctx.stroke();

 // ropes
 ctx.strokeStyle="#d8c092";ctx.lineWidth=1.6;
 ctx.beginPath();ctx.moveTo(-8,60);ctx.lineTo(-15,88);ctx.stroke();
 ctx.beginPath();ctx.moveTo(8,60);ctx.lineTo(15,88);ctx.stroke();
 ctx.beginPath();ctx.moveTo(-4,61);ctx.lineTo(-7,88);ctx.stroke();
 ctx.beginPath();ctx.moveTo(4,61);ctx.lineTo(7,88);ctx.stroke();

 // animated burner + glow
 const flame=7+Math.sin(t*12)*3;
 ctx.shadowBlur=15;ctx.shadowColor="#ff9d32";
 ctx.fillStyle="#ff5b31";
 ctx.beginPath();ctx.moveTo(-5,69);ctx.quadraticCurveTo(0,69-flame,5,69);ctx.quadraticCurveTo(0,77,-5,69);ctx.fill();
 ctx.fillStyle="#ffe76b";
 ctx.beginPath();ctx.moveTo(-2.5,69);ctx.quadraticCurveTo(0,64,2.5,69);ctx.quadraticCurveTo(0,73,-2.5,69);ctx.fill();

 // basket with rounded shape
 ctx.shadowBlur=8;ctx.shadowColor="#000";
 ctx.fillStyle="#8b542b";
 ctx.beginPath();ctx.moveTo(-18,88);ctx.lineTo(18,88);ctx.lineTo(14,106);ctx.quadraticCurveTo(0,111,-14,106);ctx.closePath();ctx.fill();
 ctx.strokeStyle="#d59a55";ctx.lineWidth=2;ctx.stroke();

 // woven basket detail
 ctx.lineWidth=1;ctx.strokeStyle="#d8a96a";ctx.globalAlpha=.8;
 for(let yy=93;yy<=103;yy+=5){ctx.beginPath();ctx.moveTo(-16,yy);ctx.lineTo(16,yy);ctx.stroke();}
 for(let xx=-11;xx<=11;xx+=7){ctx.beginPath();ctx.moveTo(xx,89);ctx.lineTo(xx*.8,107);ctx.stroke();}
 ctx.globalAlpha=1;

 // tiny basket rim
 ctx.fillStyle="#4b2a18";ctx.fillRect(-19,86,38,4);

 ctx.restore();
}
function bg(w,h,t){
 let g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,"#030015");g.addColorStop(.34,"#161047");g.addColorStop(.58,"#5a175d");g.addColorStop(.78,"#1b1648");g.addColorStop(1,"#07000d");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 for(const q of stars){
   q.p+=.018*q.tw;ctx.globalAlpha=Math.max(.18,Math.min(1,q.a+Math.sin(q.p)*.28));
   ctx.fillStyle=q.color;ctx.fillRect(q.x,q.y,q.size,q.size);
   if(q.size>1.5){ctx.globalAlpha*=.35;ctx.fillRect(q.x-3,q.y+q.size/2,7,1)}
 }ctx.globalAlpha=1;
 balloon(w,h,t);
 const horizon=h*.66;
 const floorColors=["#7c4fff","#ff48cf","#69edff","#ffe36c"];
 for(let i=-16;i<=16;i++){ctx.strokeStyle=floorColors[(i+32)%floorColors.length];ctx.globalAlpha=.42;ctx.beginPath();ctx.moveTo(w/2+i*11,horizon);ctx.lineTo(w/2+i*76,h);ctx.stroke()}
 const off=(t*.5)%1;for(let i=0;i<15;i++){let q=((i+off)/15),y=horizon+(h-horizon)*q*q;ctx.strokeStyle=floorColors[i%floorColors.length];ctx.globalAlpha=.16+.6*q;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}ctx.globalAlpha=1;
 // extra moving colored beams
 for(let i=0;i<6;i++){
   const x=w*(.1+i*.16)+Math.sin(t*.9+i)*w*.035;
   const beam=["rgba(255,80,210,.10)","rgba(105,237,255,.10)","rgba(255,227,108,.08)","rgba(141,255,158,.08)"][i%4];
   ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(x-12,0);ctx.lineTo(x+12,0);ctx.lineTo(x+115,h*.72);ctx.lineTo(x-115,h*.72);ctx.closePath();ctx.fill();
 }
}
function vhs(w,h){ctx.globalAlpha=.07;ctx.fillStyle="#fff";for(let y=0;y<h;y+=4)ctx.fillRect(0,y,w,1);ctx.globalAlpha=1}
function draw(now){
 if(!overlay.classList.contains("show")){raf=0;return}
 const t=now/1000,w=innerWidth,h=innerHeight;bg(w,h,t);
 const base=h*.91,s=Math.max(.95,Math.min(1.75,Math.min(w/360,h/600)));
 dancer(w*.22,base,s,t,0,"#ff3cb7","#ff6ccf","#f0bd9f",0);
 dancer(w*.50,base,s*1.04,t,2.1,"#59dff4","#4cc8ff","#d89a78",1);
 dancer(w*.78,base,s,t,4.2,"#a96cff","#ff9f43","#f3c6a8",2);
 vhs(w,h);raf=requestAnimationFrame(draw)
}
function openVideo(){makeOverlay();oldOverflow=document.body.style.overflow;document.body.style.overflow="hidden";overlay.classList.add("show");resize();if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(draw);try{document.documentElement.requestFullscreen?.().catch(()=>{})}catch(e){}}
function closeVideo(){if(raf){cancelAnimationFrame(raf);raf=0}overlay.classList.remove("show");document.body.style.overflow=oldOverflow;try{if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{})}catch(e){}}
function init(){styles();makeOverlay();if(addButton())return;const o=new MutationObserver(()=>{if(addButton())o.disconnect()});o.observe(document.documentElement,{childList:true,subtree:true})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();