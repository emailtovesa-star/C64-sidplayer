(() => {
"use strict";

const VERSION="V4.0.12";
let canvas=null,ctx=null,stars=[],raf=0,last=0,overlay=null;

const PALETTE=[
  "#ffffff","#8fe8ff","#72a7ff","#b98cff",
  "#ff7ad9","#ff8585","#ffd86f","#8dff9e"
];

function updateVersion(){
  const t=document.querySelector("title");
  if(t) t.textContent="C64 SID Player V4.0.12";
  const sub=document.querySelector(".sub");
  if(sub) sub.textContent=VERSION;
}

function addStyles(){
  if(document.getElementById("bdColorStarStyles")) return;
  const s=document.createElement("style");
  s.id="bdColorStarStyles";
  s.textContent=`
    #otStarfieldExtra{
      position:absolute;
      inset:0;
      width:100%;
      height:100%;
      z-index:0;
      pointer-events:none;
      opacity:.95;
    }
  `;
  document.head.appendChild(s);
}

function biasedX(w){
  // Extra density on the left side, but still stars across the whole screen.
  if(Math.random()<0.62){
    return Math.pow(Math.random(),1.7)*w*0.62;
  }
  return Math.random()*w;
}

function makeStar(w,h,anywhere=true){
  const z=Math.random();
  const hot=Math.random();
  return{
    x:biasedX(w),
    y:anywhere?Math.random()*h:-8-Math.random()*50,
    z,
    size:.65+z*2.15,
    speed:24+z*76,
    drift:(Math.random()-.45)*(7+z*18),
    twinkle:Math.random()*Math.PI*2,
    twinkleSpeed:1.2+Math.random()*3.0,
    color:PALETTE[Math.floor(Math.random()*PALETTE.length)],
    streak:hot>.72
  };
}

function resize(){
  if(!canvas||!ctx) return;
  const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
  const w=Math.max(1,window.innerWidth);
  const h=Math.max(1,window.innerHeight);
  canvas.width=Math.floor(w*dpr);
  canvas.height=Math.floor(h*dpr);
  canvas.style.width=w+"px";
  canvas.style.height=h+"px";
  ctx.setTransform(dpr,0,0,dpr,0,0);

  // Denser than V4.0.11, with a minimum large enough for portrait phones.
  const target=Math.max(140,Math.min(320,Math.floor((w*h)/3300)));
  while(stars.length<target) stars.push(makeStar(w,h,true));
  if(stars.length>target) stars.length=target;
}

function draw(dt){
  if(!ctx||!canvas) return;
  const w=parseFloat(canvas.style.width)||window.innerWidth;
  const h=parseFloat(canvas.style.height)||window.innerHeight;
  ctx.clearRect(0,0,w,h);

  for(const s of stars){
    s.y+=s.speed*dt;
    s.x+=s.drift*dt;
    s.twinkle+=s.twinkleSpeed*dt;

    if(s.y>h+12||s.x<-18||s.x>w+18){
      const n=makeStar(w,h,false);
      Object.assign(s,n);
    }

    const pulse=.72+Math.sin(s.twinkle)*.28;
    const alpha=Math.max(.22,Math.min(1,(.42+s.z*.58)*pulse));

    ctx.globalAlpha=alpha;
    ctx.fillStyle=s.color;

    if(s.streak&&s.z>.58){
      const len=3+s.z*8;
      ctx.fillRect(s.x,s.y-len,s.size*.72,len);
      ctx.globalAlpha=Math.min(1,alpha+.18);
      ctx.fillRect(s.x,s.y,s.size,s.size);
    }else{
      ctx.fillRect(s.x,s.y,s.size,s.size);
    }

    if(s.z>.72){
      ctx.globalAlpha=alpha*.30;
      ctx.fillRect(s.x-s.size*2.2,s.y,s.size*1.8,Math.max(1,s.size*.45));
    }
  }
  ctx.globalAlpha=1;
}

function visible(){
  if(!overlay) return false;
  return overlay.classList.contains("show")&&getComputedStyle(overlay).display!=="none";
}

function loop(now){
  const dt=Math.min(.05,Math.max(0,(now-(last||now))/1000));
  last=now;
  if(visible()) draw(dt);
  raf=requestAnimationFrame(loop);
}

function install(){
  overlay=document.getElementById("oldTvTetrisOverlay");
  if(!overlay||document.getElementById("otStarfieldExtra")) return false;

  canvas=document.createElement("canvas");
  canvas.id="otStarfieldExtra";
  overlay.insertBefore(canvas,overlay.firstChild);
  ctx=canvas.getContext("2d");

  resize();
  window.addEventListener("resize",resize);

  if(!raf){
    last=performance.now();
    raf=requestAnimationFrame(loop);
  }
  return true;
}

function init(){
  updateVersion();
  addStyles();

  if(install()) return;

  const obs=new MutationObserver(()=>{
    if(install()) obs.disconnect();
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>install(),700);
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",init,{once:true});
}else{
  init();
}
})();