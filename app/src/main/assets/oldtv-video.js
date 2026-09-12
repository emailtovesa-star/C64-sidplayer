(() => {
"use strict";
let overlay=null,canvas=null,ctx=null,raf=0,stars=[],oldOverflow="";
let balloonFalling=false,balloonFallY=0,balloonFallV=0,balloonLast={x:-9999,y:-9999,rx:44,ry:58},balloonResetAt=0;
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
 overlay.querySelector(".retroExit").onclick=closeVideo;canvas.addEventListener("pointerdown",hitBalloon);window.addEventListener("resize",resize);
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
   tw:.9+Math.random()*3.4,
   sparkle:Math.random()>.72
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
function hitBalloon(e){
 if(balloonFalling)return;
 const r=canvas.getBoundingClientRect();
 const px=e.clientX-r.left,py=e.clientY-r.top;
 const dx=(px-balloonLast.x)/balloonLast.rx;
 const dy=(py-balloonLast.y)/balloonLast.ry;
 if(dx*dx+dy*dy<=1.15){
   balloonFalling=true;
   balloonFallY=balloonLast.y;
   balloonFallV=30;
   balloonResetAt=0;
 }
}
function balloon(w,h,t){
 const flyX=((t*24)%(w+180))-90;
 const flyY=h*.20+Math.sin(t*.55)*18;

 let x=flyX,y=flyY,tilt=0;
 if(balloonFalling){
   const dt=1/60;
   balloonFallV+=520*dt;
   balloonFallY+=balloonFallV*dt;
   y=balloonFallY;
   x=flyX+Math.sin(t*7)*8;
   tilt=Math.min(.85,balloonFallV/700)*Math.sin(t*5);

   if(y>h+85){
     if(!balloonResetAt)balloonResetAt=t;
     if(t-balloonResetAt>.75){
       balloonFalling=false;
       balloonFallV=0;
       balloonResetAt=0;
       balloonFallY=0;
       y=flyY;
     }
   }
 }

 balloonLast={x,y,rx:44,ry:60};

 ctx.save();
 ctx.translate(x,y);
 ctx.rotate(tilt);
 ctx.shadowBlur=12;
 ctx.shadowColor="#66e0ff";

 // Simple rounded balloon with the V4.0.32 colour scheme.
 ctx.fillStyle="#6f5cff";
 ctx.beginPath();
 ctx.ellipse(0,0,35,43,0,0,Math.PI*2);
 ctx.fill();

 // Left turquoise panel
 ctx.fillStyle="#42e3d0";
 ctx.beginPath();
 ctx.moveTo(-6,-41);
 ctx.lineTo(-15,34);
 ctx.lineTo(-24,29);
 ctx.lineTo(-20,-35);
 ctx.closePath();
 ctx.fill();

 // Centre yellow panel
 ctx.fillStyle="#ffe36c";
 ctx.beginPath();
 ctx.moveTo(-5,-42);
 ctx.lineTo(6,-42);
 ctx.lineTo(11,37);
 ctx.lineTo(-10,37);
 ctx.closePath();
 ctx.fill();

 // Right coral panel
 ctx.fillStyle="#ff7a72";
 ctx.beginPath();
 ctx.moveTo(8,-40);
 ctx.lineTo(22,-32);
 ctx.lineTo(25,27);
 ctx.lineTo(13,35);
 ctx.closePath();
 ctx.fill();

 // Neck, ropes and basket
 ctx.fillStyle="#33205d";
 ctx.fillRect(-7,38,14,8);
 line(-13,38,-8,55,1.5,"#d7c6a0");
 line(13,38,8,55,1.5,"#d7c6a0");
 ctx.fillStyle="#8d5a2b";
 ctx.fillRect(-10,54,20,11);
 ctx.fillStyle="#4b2a18";
 ctx.fillRect(-11,52,22,3);

 // While falling, add a tiny motion streak beneath the basket.
 if(balloonFalling){
   ctx.globalAlpha=.35;
   ctx.strokeStyle="#ffd86f";
   ctx.lineWidth=2;
   ctx.beginPath();
   ctx.moveTo(-5,72);
   ctx.lineTo(-5,92+Math.min(40,balloonFallV*.04));
   ctx.stroke();
   ctx.beginPath();
   ctx.moveTo(5,72);
   ctx.lineTo(5,88+Math.min(34,balloonFallV*.035));
   ctx.stroke();
   ctx.globalAlpha=1;
 }

 ctx.restore();
}
function fullMoon(w,h,t){
 const r=Math.max(38,Math.min(76,Math.min(w,h)*.09));
 const x=w*.82;
 const y=h*.16;

 ctx.save();

 // Natural, restrained halo.
 let halo=ctx.createRadialGradient(x,y,r*.75,x,y,r*1.75);
 halo.addColorStop(0,"rgba(255,252,235,.18)");
 halo.addColorStop(.55,"rgba(210,220,240,.07)");
 halo.addColorStop(1,"rgba(190,205,230,0)");
 ctx.fillStyle=halo;
 ctx.beginPath();ctx.arc(x,y,r*1.75,0,Math.PI*2);ctx.fill();

 // Base lunar disc with subtle spherical shading.
 let disc=ctx.createRadialGradient(x-r*.23,y-r*.26,r*.12,x+r*.06,y+r*.05,r*1.06);
 disc.addColorStop(0,"#f8f5df");
 disc.addColorStop(.45,"#e7e2c9");
 disc.addColorStop(.78,"#d1cbb2");
 disc.addColorStop(1,"#aaa58f");
 ctx.fillStyle=disc;
 ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();

 // Clip all surface detail to the lunar disc.
 ctx.save();
 ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();

 // Broad maria: irregular darker basalt plains.
 const maria=[
   [-.24,-.23,.28,.19,-.28,.17],
   [.22,-.14,.24,.16,.18,.15],
   [.34,.18,.21,.15,-.35,.12],
   [-.18,.18,.26,.18,.27,.13],
   [.03,.33,.23,.13,-.08,.11],
   [-.42,.05,.13,.10,.14,.10]
 ];
 for(const [mx,my,rx,ry,rot,a] of maria){
   ctx.fillStyle=`rgba(72,74,72,${a})`;
   ctx.beginPath();
   ctx.ellipse(x+mx*r,y+my*r,rx*r,ry*r,rot,0,Math.PI*2);
   ctx.fill();
 }
 // Break up maria edges so they don't look like simple ovals.
 const mariaBits=[
   [-.36,-.26,.10,.07,.10],[-.08,-.31,.08,.06,.10],[.31,-.23,.09,.06,.09],
   [.18,-.04,.12,.08,.08],[-.33,.17,.10,.07,.08],[-.05,.22,.11,.07,.07],
   [.18,.34,.10,.06,.07],[.42,.10,.07,.05,.07]
 ];
 for(const [mx,my,rx,ry,a] of mariaBits){
   ctx.fillStyle=`rgba(68,70,68,${a})`;
   ctx.beginPath();ctx.ellipse(x+mx*r,y+my*r,rx*r,ry*r,.2,0,Math.PI*2);ctx.fill();
 }

 // Fine mottled regolith texture, deterministic so it doesn't shimmer frame to frame.
 function hash(n){return Math.abs(Math.sin(n*91.917)*43758.5453)%1;}
 for(let i=0;i<150;i++){
   const ang=hash(i+1)*Math.PI*2;
   const rad=Math.sqrt(hash(i+101))*r*.94;
   const tx=x+Math.cos(ang)*rad;
   const ty=y+Math.sin(ang)*rad;
   const rr=(.6+hash(i+211)*2.2);
   const light=hash(i+313);
   ctx.fillStyle=light>.5
     ? `rgba(255,255,245,${.018+hash(i+411)*.035})`
     : `rgba(55,55,52,${.018+hash(i+511)*.035})`;
   ctx.beginPath();ctx.arc(tx,ty,rr,0,Math.PI*2);ctx.fill();
 }

 // Prominent crater helper: darker floor, bright rim, small shadow.
 function crater(cx,cy,cr,depth=1){
   const px=x+cx*r,py=y+cy*r,rr=cr*r;
   ctx.save();
   ctx.shadowBlur=0;

   // subtle ejecta halo
   ctx.fillStyle=`rgba(245,243,224,${.035*depth})`;
   ctx.beginPath();ctx.arc(px,py,rr*1.55,0,Math.PI*2);ctx.fill();

   // crater bowl
   let cg=ctx.createRadialGradient(px-rr*.25,py-rr*.28,rr*.1,px,py,rr);
   cg.addColorStop(0,"rgba(235,232,213,.22)");
   cg.addColorStop(.55,"rgba(110,108,98,.18)");
   cg.addColorStop(1,"rgba(65,64,58,.34)");
   ctx.fillStyle=cg;
   ctx.beginPath();ctx.arc(px,py,rr,0,Math.PI*2);ctx.fill();

   // sunward rim
   ctx.strokeStyle=`rgba(255,252,232,${.34*depth})`;
   ctx.lineWidth=Math.max(1,rr*.13);
   ctx.beginPath();ctx.arc(px,py,rr*.9,Math.PI*.78,Math.PI*1.72);ctx.stroke();

   // opposite inner shadow
   ctx.strokeStyle=`rgba(55,54,50,${.30*depth})`;
   ctx.lineWidth=Math.max(1,rr*.12);
   ctx.beginPath();ctx.arc(px,py,rr*.78,-.15,Math.PI*.72);ctx.stroke();

   ctx.restore();
 }

 crater(-.46,-.33,.075,.9);
 crater(-.19,-.08,.055,.75);
 crater(.06,-.36,.05,.75);
 crater(.32,-.32,.07,.85);
 crater(.43,.02,.055,.75);
 crater(.25,.29,.072,.9);
 crater(-.08,.37,.062,.8);
 crater(-.38,.33,.05,.7);

 // Tycho-like bright crater with faint rays.
 const tx=x+.05*r,ty=y+.40*r,tr=.055*r;
 for(let i=0;i<10;i++){
   const a=i*Math.PI/5+.17;
   ctx.strokeStyle="rgba(248,246,228,.055)";
   ctx.lineWidth=1;
   ctx.beginPath();
   ctx.moveTo(tx+Math.cos(a)*tr,ty+Math.sin(a)*tr);
   ctx.lineTo(tx+Math.cos(a)*r*.55,ty+Math.sin(a)*r*.55);
   ctx.stroke();
 }
 crater(.05,.40,.055,1.05);

 // Very subtle limb falloff for volume.
 let limb=ctx.createRadialGradient(x-r*.18,y-r*.22,r*.18,x,y,r);
 limb.addColorStop(.58,"rgba(0,0,0,0)");
 limb.addColorStop(.9,"rgba(40,40,35,.05)");
 limb.addColorStop(1,"rgba(30,30,28,.16)");
 ctx.fillStyle=limb;
 ctx.fillRect(x-r,y-r,r*2,r*2);

 ctx.restore();

 // Crisp but natural edge.
 ctx.strokeStyle="rgba(255,253,238,.30)";
 ctx.lineWidth=1;
 ctx.beginPath();ctx.arc(x,y,r-.5,0,Math.PI*2);ctx.stroke();

 ctx.restore();
}
function bg(w,h,t){
 let g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,"#030015");g.addColorStop(.34,"#161047");g.addColorStop(.58,"#5a175d");g.addColorStop(.78,"#1b1648");g.addColorStop(1,"#07000d");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 for(const q of stars){
   q.p+=.020*q.tw;
   const pulse=.62+.38*Math.sin(q.p);
   const flash=q.sparkle?Math.max(0,Math.sin(q.p*1.9))*.35:0;
   ctx.globalAlpha=Math.max(.14,Math.min(1,q.a*(.55+pulse*.55)+flash));
   ctx.fillStyle=q.color;
   ctx.fillRect(q.x,q.y,q.size,q.size);
   if(q.size>1.25){
     ctx.globalAlpha*=.38;
     ctx.fillRect(q.x-3-q.size*.4,q.y+q.size*.45,7+q.size*.8,1);
     ctx.fillRect(q.x+q.size*.45,q.y-3-q.size*.4,1,7+q.size*.8);
   }
   if(q.sparkle && pulse>.88){
     ctx.globalAlpha=.22;
     ctx.fillStyle="#ffffff";
     ctx.fillRect(q.x-5,q.y,10,1);
     ctx.fillRect(q.x,q.y-5,1,10);
   }
 }ctx.globalAlpha=1;
 fullMoon(w,h,t);
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
function openVideo(){makeOverlay();balloonFalling=false;balloonFallY=0;balloonFallV=0;balloonResetAt=0;oldOverflow=document.body.style.overflow;document.body.style.overflow="hidden";overlay.classList.add("show");resize();if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(draw);try{document.documentElement.requestFullscreen?.().catch(()=>{})}catch(e){}}
function closeVideo(){if(raf){cancelAnimationFrame(raf);raf=0}overlay.classList.remove("show");document.body.style.overflow=oldOverflow;try{if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{})}catch(e){}}
function init(){styles();makeOverlay();if(addButton())return;const o=new MutationObserver(()=>{if(addButton())o.disconnect()});o.observe(document.documentElement,{childList:true,subtree:true})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();