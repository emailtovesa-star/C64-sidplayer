(() => {
"use strict";

const OVERLAY_ID="oldTvRetroVideoOverlay";
let overlay=null,canvas=null,ctx=null,raf=0,last=0,paused=false;
let oldBodyOverflow="";
let stars=[],buildings=[];

function addStyles(){
  if(document.getElementById("oldTvRetroVideoStyles"))return;
  const s=document.createElement("style");
  s.id="oldTvRetroVideoStyles";
  s.textContent=`
    .oldTvVideoBtn{
      position:absolute;
      left:50%;
      bottom:20%;
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
      z-index:7;
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
      left:10px;
      right:10px;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:8px;
      z-index:3;
      pointer-events:none;
    }
    .retroVideoTitle{
      color:#69edff;
      font:bold clamp(14px,4vw,22px) monospace;
      text-shadow:0 0 7px #3be4ff,0 0 15px #255cff;
      letter-spacing:1px;
    }
    .retroVideoButtons{display:flex;gap:7px;pointer-events:auto}
    .retroVideoButtons button{
      min-height:38px!important;
      height:38px;
      padding:4px 10px!important;
      border:2px solid #ff70c7!important;
      background:#35113d!important;
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
  b.title="Watch original retro 80s animation";
  b.setAttribute("aria-label","Open retro 80s video");
  b.addEventListener("click",e=>{
    e.preventDefault();
    e.stopPropagation();
    openVideo();
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
      <div class="retroVideoTitle">RETRO 80s TV</div>
      <div class="retroVideoButtons">
        <button id="retroVideoPause" type="button">PAUSE</button>
        <button id="retroVideoExit" type="button">EXIT</button>
      </div>
    </div>
    <div class="retroVideoBadge">ORIGINAL PROCEDURAL VISUAL · NO EXTERNAL VIDEO</div>
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

function seedScene(w,h){
  stars=Array.from({length:100},()=>({
    x:Math.random()*w,
    y:Math.random()*h*.52,
    a:.25+Math.random()*.75,
    p:Math.random()*Math.PI*2,
    s:.4+Math.random()*1.6
  }));
  buildings=[];
  let x=0;
  while(x<w*1.25){
    const bw=18+Math.random()*42;
    const bh=24+Math.random()*100;
    buildings.push({x,w:bw,h:bh,phase:Math.random()*10});
    x+=bw+3+Math.random()*8;
  }
}

function resize(){
  if(!canvas||!ctx)return;
  const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
  const w=Math.max(1,window.innerWidth);
  const h=Math.max(1,window.innerHeight);
  canvas.width=Math.floor(w*dpr);
  canvas.height=Math.floor(h*dpr);
  canvas.style.width=w+"px";
  canvas.style.height=h+"px";
  ctx.setTransform(dpr,0,0,dpr,0,0);
  seedScene(w,h);
}

function drawSun(w,h,t){
  const cx=w*.5, cy=h*.36, r=Math.min(w,h)*.12;
  const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
  g.addColorStop(0,"#fff7a8");
  g.addColorStop(.3,"#ffb347");
  g.addColorStop(.7,"#ff4f9a");
  g.addColorStop(1,"#8c1cff");
  ctx.fillStyle=g;
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();

  ctx.save();
  ctx.globalCompositeOperation="destination-out";
  for(let i=0;i<8;i++){
    const yy=cy-r*.15+i*r*.18;
    ctx.fillRect(cx-r-2,yy+Math.sin(t*.8+i)*1.5,r*2+4,Math.max(2,r*.055));
  }
  ctx.restore();
}

function drawMountains(w,h,t){
  const horizon=h*.58;
  ctx.fillStyle="#16082a";
  ctx.beginPath();
  ctx.moveTo(0,horizon);
  for(let x=0;x<=w;x+=24){
    const y=horizon-30
      -Math.sin(x*.012+t*.08)*30
      -Math.sin(x*.031+1.7)*18
      -Math.abs(Math.sin(x*.006+.8))*55;
    ctx.lineTo(x,y);
  }
  ctx.lineTo(w,horizon+4);ctx.lineTo(0,horizon+4);ctx.closePath();ctx.fill();

  ctx.strokeStyle="#7d4cff";
  ctx.globalAlpha=.4;
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(0,horizon);
  for(let x=0;x<=w;x+=24){
    const y=horizon-30
      -Math.sin(x*.012+t*.08)*30
      -Math.sin(x*.031+1.7)*18
      -Math.abs(Math.sin(x*.006+.8))*55;
    ctx.lineTo(x,y);
  }
  ctx.stroke();
  ctx.globalAlpha=1;
}

function drawCity(w,h,t){
  const horizon=h*.58;
  ctx.fillStyle="#080311";
  for(const b of buildings){
    const bx=(b.x-(t*10)%(w*1.25));
    const x=((bx%(w*1.25))+w*1.25)%(w*1.25)-30;
    const y=horizon-b.h;
    ctx.fillRect(x,y,b.w,b.h);
    ctx.fillStyle="#13d7ff";
    ctx.globalAlpha=.35;
    for(let wy=y+8;wy<horizon-4;wy+=12){
      for(let wx=x+5;wx<x+b.w-4;wx+=9){
        if(((Math.floor(wx+wy+b.phase*7))%4)!==0) ctx.fillRect(wx,wy,2,3);
      }
    }
    ctx.globalAlpha=1;
    ctx.fillStyle="#080311";
  }
}

function drawGrid(w,h,t){
  const horizon=h*.58;
  ctx.save();
  ctx.beginPath();ctx.rect(0,horizon,w,h-horizon);ctx.clip();

  const bg=ctx.createLinearGradient(0,horizon,0,h);
  bg.addColorStop(0,"#160022");
  bg.addColorStop(1,"#020008");
  ctx.fillStyle=bg;ctx.fillRect(0,horizon,w,h-horizon);

  ctx.strokeStyle="#ff39d4";
  ctx.lineWidth=1;
  ctx.globalAlpha=.72;

  const cx=w/2;
  for(let i=-18;i<=18;i++){
    const x0=cx+i*16;
    const x1=cx+i*90;
    ctx.beginPath();ctx.moveTo(x0,horizon);ctx.lineTo(x1,h);ctx.stroke();
  }

  const speed=(t*.35)%1;
  for(let i=0;i<18;i++){
    const q=(i+speed)/18;
    const eased=q*q;
    const y=horizon+(h-horizon)*eased;
    ctx.globalAlpha=.22+.65*q;
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha=1;
}

function drawRoad(w,h,t){
  const horizon=h*.58;
  ctx.fillStyle="#05030b";
  ctx.beginPath();
  ctx.moveTo(w*.45,horizon);
  ctx.lineTo(w*.55,horizon);
  ctx.lineTo(w*.78,h);
  ctx.lineTo(w*.22,h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle="#69edff";
  ctx.lineWidth=2;
  ctx.globalAlpha=.65;
  ctx.beginPath();ctx.moveTo(w*.45,horizon);ctx.lineTo(w*.22,h);ctx.stroke();
  ctx.beginPath();ctx.moveTo(w*.55,horizon);ctx.lineTo(w*.78,h);ctx.stroke();

  const offset=(t*.8)%1;
  ctx.strokeStyle="#ffe36c";
  for(let i=0;i<10;i++){
    const q=(i+offset)/10;
    const y=horizon+(h-horizon)*q*q;
    const ww=1+q*6;
    ctx.lineWidth=ww;
    ctx.globalAlpha=.2+.8*q;
    const len=4+q*30;
    ctx.beginPath();ctx.moveTo(w/2,y);ctx.lineTo(w/2,y+len);ctx.stroke();
  }
  ctx.globalAlpha=1;
}

function drawVhs(w,h,t){
  ctx.save();
  ctx.globalAlpha=.12;
  ctx.fillStyle="#fff";
  for(let y=0;y<h;y+=4)ctx.fillRect(0,y,w,1);

  ctx.globalAlpha=.08;
  for(let i=0;i<16;i++){
    const yy=(Math.random()*h)|0;
    ctx.fillRect(0,yy,w,1+Math.random()*2);
  }

  const band=(t*75)%h;
  const grad=ctx.createLinearGradient(0,band-25,0,band+25);
  grad.addColorStop(0,"transparent");
  grad.addColorStop(.5,"rgba(255,255,255,.10)");
  grad.addColorStop(1,"transparent");
  ctx.globalAlpha=1;
  ctx.fillStyle=grad;ctx.fillRect(0,band-25,w,50);

  const vg=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.2,w/2,h/2,Math.max(w,h)*.68);
  vg.addColorStop(0,"transparent");
  vg.addColorStop(1,"rgba(0,0,0,.65)");
  ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);
  ctx.restore();
}

function draw(now){
  if(!overlay?.classList.contains("show")){raf=0;return;}
  const dt=Math.min(.05,Math.max(0,(now-(last||now))/1000));
  last=now;
  const t=now/1000;
  const w=parseFloat(canvas.style.width)||window.innerWidth;
  const h=parseFloat(canvas.style.height)||window.innerHeight;

  if(!paused){
    const sky=ctx.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,"#020008");
    sky.addColorStop(.42,"#24104e");
    sky.addColorStop(.68,"#7a165f");
    sky.addColorStop(1,"#05010b");
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);

    for(const s of stars){
      s.p+=dt*(.7+s.s*.4);
      ctx.globalAlpha=Math.max(.15,Math.min(1,s.a+Math.sin(s.p)*.25));
      ctx.fillStyle="#fff";
      ctx.fillRect(s.x,s.y,s.s,s.s);
    }
    ctx.globalAlpha=1;

    drawSun(w,h,t);
    drawMountains(w,h,t);
    drawCity(w,h,t);
    drawGrid(w,h,t);
    drawRoad(w,h,t);
    drawVhs(w,h,t);

    ctx.fillStyle="#69edff";
    ctx.font="bold 10px monospace";
    ctx.globalAlpha=.75;
    ctx.fillText("CH 84  •  STEREO",12,h-16);
    ctx.globalAlpha=1;
  }
  raf=requestAnimationFrame(draw);
}

function openVideo(){
  makeOverlay();
  oldBodyOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  paused=false;
  overlay.querySelector("#retroVideoPause").textContent="PAUSE";
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden","false");
  resize();
  last=performance.now();
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(draw);
  try{
    if(document.documentElement.requestFullscreen){
      document.documentElement.requestFullscreen().catch(()=>{});
    }
  }catch(e){}
}

function closeVideo(){
  if(!overlay)return;
  if(raf){cancelAnimationFrame(raf);raf=0;}
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden","true");
  document.body.style.overflow=oldBodyOverflow;
  try{
    if(document.fullscreenElement&&document.exitFullscreen){
      document.exitFullscreen().catch(()=>{});
    }
  }catch(e){}
}

function init(){
  addStyles();
  makeOverlay();
  if(addButtonToTv())return;
  const obs=new MutationObserver(()=>{
    if(addButtonToTv())obs.disconnect();
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(addButtonToTv,600);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();