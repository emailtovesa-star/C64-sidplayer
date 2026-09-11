(() => {
"use strict";
let overlay=null,canvas=null,ctx=null,raf=0,stars=[],oldOverflow="";
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
function addButton(){const p=document.querySelector(".tvControlsOld");if(!p||document.getElementById("oldTvVideoBtn"))return false;const b=document.createElement("button");b.id="oldTvVideoBtn";b.className="oldTvVideoBtn";b.type="button";b.textContent="VIDEO";b.onclick=e=>{e.preventDefault();e.stopPropagation();openVideo()};p.appendChild(b);return true}
function makeOverlay(){if(overlay)return;overlay=document.createElement("div");overlay.className="oldTvRetroVideoOverlay";overlay.id="oldTvRetroVideoOverlay";overlay.innerHTML='<canvas id="oldTvRetroVideoCanvas"></canvas><button class="retroExit" aria-label="Exit video">×</button>';document.body.appendChild(overlay);canvas=overlay.querySelector("canvas");ctx=canvas.getContext("2d");overlay.querySelector(".retroExit").onclick=closeVideo;window.addEventListener("resize",resize)}
function resize(){const d=Math.max(1,Math.min(2,devicePixelRatio||1)),w=innerWidth,h=innerHeight;canvas.width=w*d;canvas.height=h*d;canvas.style.width=w+"px";canvas.style.height=h+"px";ctx.setTransform(d,0,0,d,0,0);stars=Array.from({length:100},()=>({x:Math.random()*w,y:Math.random()*h*.58,a:.3+Math.random()*.7,p:Math.random()*6.28}))}
function line(a,b,c,d,w,col){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke()}
function ellipse(x,y,rx,ry,col){ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
function dancer(cx,base,s,t,ph,dress,hair,skin){
 const beat=t*3+ph,sway=Math.sin(beat)*12*s,bounce=Math.abs(Math.sin(beat))*7*s,x=cx+sway*.18;
 const head=base-205*s-bounce,shoulder=base-165*s-bounce,waist=base-112*s-bounce,hip=base-88*s-bounce,arm=Math.sin(beat*1.3),leg=Math.sin(beat*1.08+1.2);
 ctx.save();ctx.shadowBlur=12*s;ctx.shadowColor=dress;
 ellipse(x,head-2*s,29*s,32*s,hair);ellipse(x-20*s,head+5*s,13*s,28*s,hair);ellipse(x+20*s,head+5*s,13*s,28*s,hair);
 ellipse(x,head+3*s,18*s,22*s,skin);ellipse(x-18*s,head+4*s,3.2*s,5*s,skin);ellipse(x+18*s,head+4*s,3.2*s,5*s,skin);
 line(x-11*s,head-4*s,x-4*s,head-5*s,1.3*s,"#3b241f");line(x+4*s,head-5*s,x+11*s,head-4*s,1.3*s,"#3b241f");
 ellipse(x-7*s,head,s*1.8,s*1.5,"#202033");ellipse(x+7*s,head,s*1.8,s*1.5,"#202033");
 ctx.strokeStyle="#b97868";ctx.lineWidth=1.1*s;ctx.beginPath();ctx.moveTo(x,head+2*s);ctx.lineTo(x-1.5*s,head+8*s);ctx.lineTo(x+2*s,head+9*s);ctx.stroke();
 ctx.strokeStyle="#b92e62";ctx.lineWidth=2*s;ctx.beginPath();ctx.arc(x,head+12*s,6*s,.15,Math.PI-.15);ctx.stroke();
 ctx.fillStyle=skin;ctx.fillRect(x-6*s,head+20*s,12*s,18*s);
 ctx.fillStyle=dress;ctx.beginPath();ctx.moveTo(x-25*s,shoulder);ctx.quadraticCurveTo(x-31*s,shoulder+28*s,x-17*s,waist);ctx.quadraticCurveTo(x-34*s,hip+8*s,x-39*s,hip+34*s);ctx.lineTo(x+39*s,hip+34*s);ctx.quadraticCurveTo(x+34*s,hip+8*s,x+17*s,waist);ctx.quadraticCurveTo(x+31*s,shoulder+28*s,x+25*s,shoulder);ctx.closePath();ctx.fill();
 ctx.fillStyle="#ffe36c";ctx.fillRect(x-19*s,waist-2*s,38*s,5*s);
 line(x-23*s,shoulder+12*s,x-55*s-arm*13*s,shoulder+48*s-arm*28*s,9*s,skin);line(x+23*s,shoulder+12*s,x+55*s+arm*13*s,shoulder+43*s+arm*28*s,9*s,skin);
 const lx=x-15*s-leg*14*s,rx=x+15*s+leg*14*s;line(x-18*s,hip+34*s,lx,base-42*s,12*s,skin);line(x+18*s,hip+34*s,rx,base-42*s,12*s,skin);line(lx,base-42*s,lx-8*s-leg*5*s,base,9*s,"#b16dff");line(rx,base-42*s,rx+8*s+leg*5*s,base,9*s,"#69edff");ctx.restore()
}
function bg(w,h,t){let g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,"#040017");g.addColorStop(.55,"#25105b");g.addColorStop(1,"#08000e");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);for(const q of stars){q.p+=.02;ctx.globalAlpha=Math.max(.2,q.a+Math.sin(q.p)*.2);ctx.fillStyle="#fff";ctx.fillRect(q.x,q.y,1.5,1.5)}ctx.globalAlpha=1;const horizon=h*.66;ctx.strokeStyle="#7c4fff";ctx.globalAlpha=.5;for(let i=-15;i<=15;i++){ctx.beginPath();ctx.moveTo(w/2+i*11,horizon);ctx.lineTo(w/2+i*75,h);ctx.stroke()}for(let i=0;i<14;i++){let q=((i+(t*.5)%1)/14),y=horizon+(h-horizon)*q*q;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}ctx.globalAlpha=1}
function vhs(w,h){ctx.globalAlpha=.08;ctx.fillStyle="#fff";for(let y=0;y<h;y+=4)ctx.fillRect(0,y,w,1);ctx.globalAlpha=1}
function draw(now){if(!overlay.classList.contains("show")){raf=0;return}const t=now/1000,w=innerWidth,h=innerHeight;bg(w,h,t);const base=h*.91,s=Math.max(.95,Math.min(1.75,Math.min(w/360,h/600)));dancer(w*.22,base,s,t,0,"#ff3cb7","#49205f","#f0bd9f");dancer(w*.50,base,s*1.04,t,2.1,"#59dff4","#44256f","#d89a78");dancer(w*.78,base,s,t,4.2,"#a96cff","#6b3425","#f3c6a8");vhs(w,h);raf=requestAnimationFrame(draw)}
function openVideo(){makeOverlay();oldOverflow=document.body.style.overflow;document.body.style.overflow="hidden";overlay.classList.add("show");resize();if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(draw);try{document.documentElement.requestFullscreen?.().catch(()=>{})}catch(e){}}
function closeVideo(){if(raf){cancelAnimationFrame(raf);raf=0}overlay.classList.remove("show");document.body.style.overflow=oldOverflow;try{if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{})}catch(e){}}
function init(){styles();makeOverlay();if(addButton())return;const o=new MutationObserver(()=>{if(addButton())o.disconnect()});o.observe(document.documentElement,{childList:true,subtree:true})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();