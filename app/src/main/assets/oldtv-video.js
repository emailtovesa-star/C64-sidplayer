(() => {
"use strict";

const OVERLAY_ID="oldTvRetroVideoOverlay";
let overlay=null,canvas=null,ctx=null,raf=0,last=0,paused=false;
let oldBodyOverflow="";
let stars=[];

function addStyles(){
  if(document.getElementById("oldTvRetroVideoStyles"))return;
  const s=document.createElement("style");
  s.id="oldTvRetroVideoStyles";
  s.textContent=`
    .oldTvVideoBtn{
      position:absolute;
      left:50%;
      top:15%;
      bottom:auto;
      transform:translateX(-50%);
      width:74%;
      min-height:24px;
      height:24px;
      padding:0 2px;
      border:2px solid #090909;
      border-radius:5px;
      background:linear-gradient(#d7c7a0,#8f7a55 48%,#5c4932 52%,#2b2119);
      box-shadow:inset 0 1px 1px #fff8,0 2px 3px #000;
      color:#18110b;
      font:bold 8px/20px monospace;
      letter-spacing:.3px;
      z-index:8;
      cursor:pointer;
      -webkit-tap-highlight-color:transparent;
    }
    .oldTvVideoBtn:active{transform:translateX(-50%) translateY(1px) scale(.96)}

    .oldTvRetroVideoOverlay{
      position:fixed;
      inset:0;
      z-index:100000;
      display:none;
      background:#020008;
      color:#fff;
      font-family:monospace;
      overflow:hidden;
      touch-action:none;
      overscroll-behavior:none;
      user-select:none;
      -webkit-user-select:none;
    }
    .oldTvRetroVideoOverlay.show{display:block}
    #oldTvRetroVideoCanvas{
      position:absolute;
      inset:0;
      width:100%;
      height:100%;
      display:block;
      background:#020008;
    }
    .retroVideoTop{
      position:absolute;
      top:max(10px,env(safe-area-inset-top));
      left:10px;right:10px;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:8px;
      z-index:3;
      pointer-events:none;
    }
    .retroVideoTitle{
      color:#ff70c7;
      font:bold clamp(14px,4vw,22px) monospace;
      text-shadow:0 0 7px #ff70c7,0 0 15px #6f3cff;
      letter-spacing:1px;
    }
    .retroVideoButtons{display:flex;gap:7px;pointer-events:auto}
    .retroVideoButtons button{
      min-height:38px!important;
      height:38px;
      padding:4px 10px!important;
      border:2px solid #69edff!important;
      background:#15144a!important;
      color:#fff!important;
      font:bold 11px monospace!important;
    }
    .retroVideoButtons button:last-child{
      border-color:#ff8585!important;
      background:#4a111c!important;
    }
    .retroVideoBadge{
      position:absolute;
      left:50%;
      bottom:max(12px,env(safe-area-inset-bottom));
      transform:translateX(-50%);
      z-index:3;
      color:#ffe36c;
      background:#080313bb;
      border:1px solid #8a6fff;
      border-radius:7px;
      padding:5px 9px;
      font:bold 9px monospace;
      letter-spacing:.4px;
      white-space:nowrap;
      pointer-events:none;
    }
  `;
  document.head.appendChild(s);
}

function addButtonToTv(){
  const panel=document.querySelector(".tvControlsOld");
  if(!panel || document.getElementById("oldTvVideoBtn"))return false;
  const b=document.createElement("button");
  b.id="oldTvVideoBtn";
  b.className="oldTvVideoBtn";
  b.type="button";
  b.textContent="VIDEO";
  b.title="Watch original 80s dance animation";
  b.setAttribute("aria-label","Open 80s dance animation");
  b.addEventListener("click",e=>{
    e.preventDefault();e.stopPropagation();openVideo();
  });
  panel.appendChild(b);
  return true;
}

function makeOverlay(){
  if(overlay)return;
  overlay=document.createElement("div");
  overlay.id=OVERLAY_ID;
  overlay.className="oldTvRetroVideoOverlay";
  overlay.setAttribute("aria-hidden","true");
  overlay.innerHTML=`
    <canvas id="oldTvRetroVideoCanvas"></canvas>
    <div class="retroVideoTop">
      <div class="retroVideoTitle">NEON DANCE 1986</div>
      <div class="retroVideoButtons">
        <button id="retroVideoPause" type="button">PAUSE</button>
        <button id="retroVideoExit" type="button">EXIT</button>
      </div>
    </div>
    <div class="retroVideoBadge">ORIGINAL PROCEDURAL ANIMATION · ADULT DANCERS · NO EXTERNAL VIDEO</div>
  `;
  document.body.appendChild(overlay);
  canvas=overlay.querySelector("#oldTvRetroVideoCanvas");
  ctx=canvas.getContext("2d");
  overlay.querySelector("#retroVideoExit").addEventListener("click",closeVideo);
  overlay.querySelector("#retroVideoPause").addEventListener("click",()=>{
    paused=!paused;
    overlay.querySelector("#retroVideoPause").textContent=paused?"PLAY":"PAUSE";
    last=performance.now();
  });
  window.addEventListener("resize",resize);
}

function resize(){
  if(!canvas||!ctx)return;
  const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
  const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
  canvas.width=Math.floor(w*dpr); canvas.height=Math.floor(h*dpr);
  canvas.style.width=w+"px"; canvas.style.height=h+"px";
  ctx.setTransform(dpr,0,0,dpr,0,0);
  stars=Array.from({length:110},()=>({
    x:Math.random()*w,y:Math.random()*h*.62,
    a:.25+Math.random()*.75,p:Math.random()*6.28,s:.5+Math.random()*1.5
  }));
}

function line(x1,y1,x2,y2,w,color,alpha=1){
  ctx.globalAlpha=alpha; ctx.strokeStyle=color; ctx.lineWidth=w; ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.globalAlpha=1;
}

function drawDancer(cx,base,scale,t,phase,colors){
  const beat=t*3.15+phase;
  const sway=Math.sin(beat)*12*scale;
  const bounce=Math.abs(Math.sin(beat*1.05))*8*scale;
  const shoulderY=base-126*scale-bounce;
  const hipY=base-73*scale-bounce;
  const headY=base-154*scale-bounce;
  const arm=Math.sin(beat*1.35);
  const leg=Math.sin(beat*1.08+1.3);

  // glow
  ctx.save();
  ctx.shadowBlur=18*scale;ctx.shadowColor=colors[0];

  // hair/head
  ctx.fillStyle=colors[1];
  ctx.beginPath();ctx.arc(cx+sway*.18,headY,17*scale,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#ffd9bd";
  ctx.beginPath();ctx.arc(cx+sway*.18,headY+3*scale,11*scale,0,Math.PI*2);ctx.fill();

  // torso/dress
  ctx.fillStyle=colors[0];
  ctx.beginPath();
  ctx.moveTo(cx-18*scale+sway*.12,shoulderY);
  ctx.lineTo(cx+18*scale+sway*.12,shoulderY);
  ctx.lineTo(cx+24*scale,hipY+18*scale);
  ctx.lineTo(cx-24*scale,hipY+18*scale);
  ctx.closePath();ctx.fill();

  // belt
  ctx.fillStyle="#ffe36c";
  ctx.fillRect(cx-20*scale,hipY-2*scale,40*scale,4*scale);

  // arms
  line(cx-16*scale+sway*.12,shoulderY+10*scale,
       cx-42*scale-arm*12*scale,shoulderY+38*scale-arm*22*scale,
       7*scale,"#ffd9bd");
  line(cx+16*scale+sway*.12,shoulderY+10*scale,
       cx+42*scale+arm*12*scale,shoulderY+32*scale+arm*24*scale,
       7*scale,"#ffd9bd");

  // legs
  const lx=cx-10*scale-leg*11*scale, rx=cx+10*scale+leg*11*scale;
  line(cx-10*scale,hipY+18*scale,lx,base-28*scale,8*scale,"#ffd9bd");
  line(cx+10*scale,hipY+18*scale,rx,base-28*scale,8*scale,"#ffd9bd");
  line(lx,base-28*scale,lx-9*scale-leg*5*scale,base,7*scale,"#b16dff");
  line(rx,base-28*scale,rx+9*scale+leg*5*scale,base,7*scale,"#69edff");

  // earrings
  ctx.fillStyle="#ffe36c";
  ctx.beginPath();ctx.arc(cx-13*scale+sway*.18,headY+5*scale,2.5*scale,0,6.28);ctx.fill();
  ctx.beginPath();ctx.arc(cx+13*scale+sway*.18,headY+5*scale,2.5*scale,0,6.28);ctx.fill();

  ctx.restore();
}

function drawBackground(w,h,t){
  const bg=ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0,"#040017");
  bg.addColorStop(.55,"#25105b");
  bg.addColorStop(1,"#08000e");
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);

  // stars
  for(const s of stars){
    s.p+=.02;
    ctx.globalAlpha=Math.max(.2,Math.min(1,s.a+Math.sin(s.p)*.25));
    ctx.fillStyle="#fff";ctx.fillRect(s.x,s.y,s.s,s.s);
  }
  ctx.globalAlpha=1;

  // neon stage circles
  const cy=h*.40;
  for(let i=0;i<5;i++){
    ctx.strokeStyle=["#ff48cf","#69edff","#9a67ff","#ffe36c","#ff6d89"][i];
    ctx.globalAlpha=.18+.08*Math.sin(t*2+i);
    ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(w*.5,cy,60+i*48,0,6.28);ctx.stroke();
  }
  ctx.globalAlpha=1;

  // dance floor perspective
  const horizon=h*.64;
  ctx.strokeStyle="#7c4fff";ctx.globalAlpha=.48;ctx.lineWidth=1;
  for(let i=-14;i<=14;i++){
    ctx.beginPath();ctx.moveTo(w*.5+i*12,horizon);ctx.lineTo(w*.5+i*72,h);ctx.stroke();
  }
  const off=(t*.5)%1;
  for(let i=0;i<13;i++){
    const q=(i+off)/13,y=horizon+(h-horizon)*q*q;
    ctx.globalAlpha=.18+.58*q;
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
  }
  ctx.globalAlpha=1;

  // moving light beams
  for(let i=0;i<4;i++){
    const x=w*(.18+i*.22)+Math.sin(t*1.1+i)*w*.04;
    const g=ctx.createLinearGradient(x,0,x,h);
    g.addColorStop(0,"rgba(255,255,255,.16)");
    g.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.moveTo(x-18,0);ctx.lineTo(x+18,0);
    ctx.lineTo(x+120,h*.72);ctx.lineTo(x-120,h*.72);
    ctx.closePath();ctx.fill();
  }
}

function drawVhs(w,h,t){
  ctx.save();
  ctx.globalAlpha=.10;ctx.fillStyle="#fff";
  for(let y=0;y<h;y+=4)ctx.fillRect(0,y,w,1);
  ctx.globalAlpha=.06;
  for(let i=0;i<12;i++){
    const yy=(Math.random()*h)|0;
    ctx.fillRect(0,yy,w,1+Math.random()*2);
  }
  const band=(t*82)%h;
  const g=ctx.createLinearGradient(0,band-20,0,band+20);
  g.addColorStop(0,"transparent");g.addColorStop(.5,"rgba(255,255,255,.09)");g.addColorStop(1,"transparent");
  ctx.globalAlpha=1;ctx.fillStyle=g;ctx.fillRect(0,band-20,w,40);

  const vg=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.2,w/2,h/2,Math.max(w,h)*.72);
  vg.addColorStop(0,"transparent");vg.addColorStop(1,"rgba(0,0,0,.58)");
  ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);ctx.restore();
}

function draw(now){
  if(!overlay?.classList.contains("show")){raf=0;return;}
  last=now;
  const t=now/1000,w=parseFloat(canvas.style.width)||innerWidth,h=parseFloat(canvas.style.height)||innerHeight;
  if(!paused){
    drawBackground(w,h,t);
    const base=h*.82;
    const s=Math.max(.72,Math.min(1.32,Math.min(w/430,h/700)));
    drawDancer(w*.27,base,s,t,0,["#ff3cb7","#49205f"]);
    drawDancer(w*.50,base,s*1.06,t,2.1,["#6fe8ff","#3f2a7a"]);
    drawDancer(w*.73,base,s,t,4.2,["#a96cff","#5a214e"]);
    drawVhs(w,h,t);

    ctx.fillStyle="#69edff";ctx.font="bold 10px monospace";ctx.globalAlpha=.78;
    ctx.fillText("CH 86  •  DANCE MIX",12,h-16);ctx.globalAlpha=1;
  }
  raf=requestAnimationFrame(draw);
}

function openVideo(){
  makeOverlay();oldBodyOverflow=document.body.style.overflow;document.body.style.overflow="hidden";
  paused=false;overlay.querySelector("#retroVideoPause").textContent="PAUSE";
  overlay.classList.add("show");overlay.setAttribute("aria-hidden","false");
  resize();last=performance.now();
  if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(draw);
  try{if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});}catch(e){}
}

function closeVideo(){
  if(!overlay)return;
  if(raf){cancelAnimationFrame(raf);raf=0;}
  overlay.classList.remove("show");overlay.setAttribute("aria-hidden","true");
  document.body.style.overflow=oldBodyOverflow;
  try{if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});}catch(e){}
}

function init(){
  addStyles();makeOverlay();
  if(addButtonToTv())return;
  const obs=new MutationObserver(()=>{if(addButtonToTv())obs.disconnect();});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(addButtonToTv,600);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();