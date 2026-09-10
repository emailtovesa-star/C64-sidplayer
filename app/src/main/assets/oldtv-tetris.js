(() => {
"use strict";

const GAME_ID = "oldTvTetrisOverlay";
let overlay = null;
let canvas = null;
let ctx = null;
let scoreEl = null;
let linesEl = null;
let levelEl = null;
let messageEl = null;
let running = false;
let paused = false;
let gameOver = false;
let lastDrop = 0;
let raf = 0;
let board = [];
let current = null;
let score = 0;
let lines = 0;
let level = 1;
let oldBodyOverflow = "";

const COLS = 10, ROWS = 20;
const COLORS = [
  null, "#52d9ff", "#ffe36c", "#b57aff",
  "#75ef76", "#ff6969", "#7393ff", "#ffad55"
];
const SHAPES = [
  [[1,1,1,1]],
  [[1,1],[1,1]],
  [[0,1,0],[1,1,1]],
  [[0,1,1],[1,1,0]],
  [[1,1,0],[0,1,1]],
  [[1,0,0],[1,1,1]],
  [[0,0,1],[1,1,1]]
];

function addStyles(){
  if(document.getElementById("oldTvTetrisStyles")) return;
  const s=document.createElement("style");
  s.id="oldTvTetrisStyles";
  s.textContent=`
    .oldTvGameBtn{
      position:absolute;
      left:50%;
      bottom:4%;
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
      z-index:6;
      cursor:pointer;
      -webkit-tap-highlight-color:transparent;
    }
    .oldTvGameBtn:active{transform:translateX(-50%) translateY(1px) scale(.96)}
    .oldTvTetrisOverlay{
      position:fixed;
      inset:0;
      z-index:99999;
      display:none;
      background:
        radial-gradient(circle at 50% 18%,#202060 0,#0a0a28 42%,#02020c 100%);
      color:#fff;
      font-family:monospace;
      touch-action:none;
      overscroll-behavior:none;
      user-select:none;
      -webkit-user-select:none;
    }
    .oldTvTetrisOverlay.show{display:flex}
    .otGameShell{
      width:100%;
      height:100%;
      max-width:760px;
      margin:auto;
      display:grid;
      grid-template-rows:auto minmax(0,1fr) auto;
      gap:7px;
      padding:max(8px,env(safe-area-inset-top)) 8px max(8px,env(safe-area-inset-bottom));
    }
    .otGameTop{
      display:grid;
      grid-template-columns:1fr auto;
      gap:8px;
      align-items:center;
      padding:4px 4px 0;
    }
    .otGameTitle{
      color:#ffe36c;
      font:bold clamp(16px,4.8vw,24px) monospace;
      text-shadow:0 0 8px #ffe36c88;
    }
    .otGameStats{
      color:#8aff99;
      font:bold clamp(10px,3vw,14px) monospace;
      line-height:1.35;
    }
    .otExit{
      min-height:38px!important;
      height:38px;
      padding:4px 12px!important;
      border:2px solid #ff8585!important;
      background:#4a111c!important;
      color:#fff!important;
      font:bold 12px monospace!important;
    }
    .otCanvasWrap{
      min-height:0;
      display:flex;
      align-items:center;
      justify-content:center;
      position:relative;
    }
    #oldTvTetrisCanvas{
      display:block;
      height:100%;
      max-height:100%;
      max-width:100%;
      aspect-ratio:1/2;
      background:#050513;
      border:3px solid #7671ee;
      box-shadow:0 0 24px #496cff55,inset 0 0 15px #000;
      image-rendering:pixelated;
    }
    .otMessage{
      position:absolute;
      left:50%;top:50%;
      transform:translate(-50%,-50%);
      min-width:72%;
      padding:14px;
      text-align:center;
      border:2px solid #ffe36c;
      border-radius:8px;
      background:#111049ee;
      color:#fff;
      font:bold 15px/1.4 monospace;
      box-shadow:0 8px 28px #000c;
    }
    .otMessage.hidden{display:none}
    .otControls{
      display:grid;
      grid-template-columns:repeat(5,1fr);
      gap:6px;
      align-items:stretch;
    }
    .otCtrl{
      min-height:54px!important;
      padding:5px 2px!important;
      border:2px solid #7772ec!important;
      border-radius:9px!important;
      background:linear-gradient(#27256e,#111049)!important;
      color:#fff!important;
      font:bold 18px/1 monospace!important;
      touch-action:none;
      -webkit-tap-highlight-color:transparent;
    }
    .otCtrl small{display:block;margin-top:5px;font-size:8px;line-height:1;color:#b8c8ff}
    .otCtrl:active{transform:translateY(2px);filter:brightness(1.35)}
    .otStart{
      grid-column:1/-1;
      min-height:38px!important;
      padding:4px!important;
      border-color:#73e886!important;
      color:#9cff9f!important;
      font-size:12px!important;
    }
    @media (orientation:landscape) and (max-height:520px){
      .otGameShell{
        max-width:none;
        grid-template-columns:minmax(120px,1fr) auto minmax(220px,1.2fr);
        grid-template-rows:1fr;
        align-items:center;
        gap:10px;
      }
      .otGameTop{display:flex;flex-direction:column;align-items:stretch}
      .otCanvasWrap{height:100%}
      .otControls{grid-template-columns:repeat(3,1fr)}
      .otStart{grid-column:1/-1}
    }
  `;
  document.head.appendChild(s);
}

function addButtonToTv(){
  const panel=document.querySelector(".tvControlsOld");
  if(!panel || document.getElementById("oldTvGameBtn")) return false;
  const b=document.createElement("button");
  b.id="oldTvGameBtn";
  b.className="oldTvGameBtn";
  b.type="button";
  b.textContent="GAME";
  b.title="Play block game";
  b.setAttribute("aria-label","Open block game");
  b.addEventListener("click", e=>{
    e.preventDefault();
    e.stopPropagation();
    openGame();
  });
  panel.appendChild(b);
  return true;
}

function makeOverlay(){
  if(overlay) return;
  overlay=document.createElement("div");
  overlay.id=GAME_ID;
  overlay.className="oldTvTetrisOverlay";
  overlay.setAttribute("aria-hidden","true");
  overlay.innerHTML=`
    <div class="otGameShell">
      <div class="otGameTop">
        <div>
          <div class="otGameTitle">C64 BLOCK DROP</div>
          <div class="otGameStats">
            SCORE <span id="otScore">0</span><br>
            LINES <span id="otLines">0</span> · LEVEL <span id="otLevel">1</span>
          </div>
        </div>
        <button class="otExit" id="otExit" type="button">EXIT</button>
      </div>
      <div class="otCanvasWrap">
        <canvas id="oldTvTetrisCanvas" width="240" height="480"></canvas>
        <div class="otMessage" id="otMessage">PRESS START</div>
      </div>
      <div class="otControls">
        <button class="otCtrl" data-act="left" type="button">◀<small>LEFT</small></button>
        <button class="otCtrl" data-act="rotate" type="button">↻<small>ROTATE</small></button>
        <button class="otCtrl" data-act="down" type="button">▼<small>DOWN</small></button>
        <button class="otCtrl" data-act="right" type="button">▶<small>RIGHT</small></button>
        <button class="otCtrl" data-act="drop" type="button">⇊<small>DROP</small></button>
        <button class="otCtrl otStart" id="otStart" type="button">START / RESTART</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  canvas=overlay.querySelector("#oldTvTetrisCanvas");
  ctx=canvas.getContext("2d");
  scoreEl=overlay.querySelector("#otScore");
  linesEl=overlay.querySelector("#otLines");
  levelEl=overlay.querySelector("#otLevel");
  messageEl=overlay.querySelector("#otMessage");

  overlay.querySelector("#otExit").addEventListener("click",closeGame);
  overlay.querySelector("#otStart").addEventListener("click",startGame);

  overlay.querySelectorAll("[data-act]").forEach(b=>{
    const action=b.dataset.act;
    const doAction=e=>{
      e.preventDefault();
      actionMove(action);
    };
    b.addEventListener("pointerdown",doAction);
  });

  document.addEventListener("keydown", keyHandler);
}

function resetBoard(){
  board=Array.from({length:ROWS},()=>Array(COLS).fill(0));
}

function randPiece(){
  const idx=Math.floor(Math.random()*SHAPES.length);
  return {
    shape:SHAPES[idx].map(r=>r.slice()),
    color:idx+1,
    x:Math.floor((COLS-SHAPES[idx][0].length)/2),
    y:-1
  };
}

function collide(p=current, dx=0, dy=0, shape=p?.shape){
  if(!p) return true;
  for(let y=0;y<shape.length;y++){
    for(let x=0;x<shape[y].length;x++){
      if(!shape[y][x]) continue;
      const nx=p.x+x+dx, ny=p.y+y+dy;
      if(nx<0||nx>=COLS||ny>=ROWS) return true;
      if(ny>=0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function merge(){
  current.shape.forEach((row,y)=>row.forEach((v,x)=>{
    if(v){
      const by=current.y+y, bx=current.x+x;
      if(by>=0) board[by][bx]=current.color;
    }
  }));
}

function clearLines(){
  let n=0;
  for(let y=ROWS-1;y>=0;y--){
    if(board[y].every(Boolean)){
      board.splice(y,1);
      board.unshift(Array(COLS).fill(0));
      n++; y++;
    }
  }
  if(n){
    lines+=n;
    score += [0,100,300,500,800][n]*level;
    level=1+Math.floor(lines/10);
    updateStats();
  }
}

function spawn(){
  current=randPiece();
  if(collide(current,0,1) || collide(current,0,0)){
    endGame();
  }
}

function lockPiece(){
  merge();
  clearLines();
  spawn();
}

function rotate(){
  if(!running||paused||gameOver) return;
  const s=current.shape;
  const r=s[0].map((_,i)=>s.map(row=>row[i]).reverse());
  if(!collide(current,0,0,r)){ current.shape=r; return; }
  if(!collide(current,-1,0,r)){ current.x--; current.shape=r; return; }
  if(!collide(current,1,0,r)){ current.x++; current.shape=r; }
}

function stepDown(manual=false){
  if(!running||paused||gameOver) return;
  if(!collide(current,0,1)){
    current.y++;
    if(manual){score++;updateStats();}
  }else lockPiece();
}

function hardDrop(){
  if(!running||paused||gameOver) return;
  let d=0;
  while(!collide(current,0,1)){current.y++;d++;}
  score+=d*2;
  updateStats();
  lockPiece();
}

function actionMove(a){
  if(!running||paused||gameOver) return;
  if(a==="left" && !collide(current,-1,0)) current.x--;
  else if(a==="right" && !collide(current,1,0)) current.x++;
  else if(a==="down") stepDown(true);
  else if(a==="rotate") rotate();
  else if(a==="drop") hardDrop();
  draw();
}

function keyHandler(e){
  if(!overlay?.classList.contains("show")) return;
  const k=e.key;
  if(["ArrowLeft","ArrowRight","ArrowDown","ArrowUp"," ","Escape"].includes(k)) e.preventDefault();
  if(k==="Escape"){closeGame();return;}
  if(k==="Enter" && (!running||gameOver)){startGame();return;}
  if(k==="ArrowLeft") actionMove("left");
  if(k==="ArrowRight") actionMove("right");
  if(k==="ArrowDown") actionMove("down");
  if(k==="ArrowUp"||k==="x"||k==="X") actionMove("rotate");
  if(k===" ") actionMove("drop");
}

function updateStats(){
  scoreEl.textContent=score;
  linesEl.textContent=lines;
  levelEl.textContent=level;
}

function cell(x,y,c,alpha=1){
  const w=canvas.width/COLS, h=canvas.height/ROWS;
  const px=x*w, py=y*h;
  ctx.globalAlpha=alpha;
  ctx.fillStyle=COLORS[c]||"#fff";
  ctx.fillRect(px+1,py+1,w-2,h-2);
  ctx.fillStyle="rgba(255,255,255,.20)";
  ctx.fillRect(px+2,py+2,w-4,3);
  ctx.fillStyle="rgba(0,0,0,.25)";
  ctx.fillRect(px+w-4,py+3,2,h-6);
  ctx.globalAlpha=1;
}

function draw(){
  if(!ctx) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#050513";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const w=canvas.width/COLS, h=canvas.height/ROWS;
  ctx.strokeStyle="rgba(120,120,210,.12)";
  ctx.lineWidth=1;
  for(let x=1;x<COLS;x++){ctx.beginPath();ctx.moveTo(x*w,0);ctx.lineTo(x*w,canvas.height);ctx.stroke();}
  for(let y=1;y<ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*h);ctx.lineTo(canvas.width,y*h);ctx.stroke();}

  board.forEach((row,y)=>row.forEach((v,x)=>{if(v)cell(x,y,v)}));

  if(current){
    let ghostY=current.y;
    while(!collide({...current,y:ghostY},0,1)) ghostY++;
    current.shape.forEach((row,y)=>row.forEach((v,x)=>{
      if(v && ghostY+y>=0) cell(current.x+x,ghostY+y,current.color,.18);
    }));
    current.shape.forEach((row,y)=>row.forEach((v,x)=>{
      if(v && current.y+y>=0) cell(current.x+x,current.y+y,current.color,1);
    }));
  }
}

function loop(ts){
  if(!running){raf=0;return;}
  const interval=Math.max(110,760-(level-1)*60);
  if(!paused && ts-lastDrop>=interval){
    stepDown(false);
    lastDrop=ts;
  }
  draw();
  raf=requestAnimationFrame(loop);
}

function startGame(){
  resetBoard();
  score=0;lines=0;level=1;
  running=true;paused=false;gameOver=false;
  current=randPiece();
  updateStats();
  messageEl.classList.add("hidden");
  lastDrop=performance.now();
  if(raf) cancelAnimationFrame(raf);
  raf=requestAnimationFrame(loop);
}

function endGame(){
  gameOver=true;
  running=false;
  current=null;
  draw();
  messageEl.innerHTML=`GAME OVER<br>SCORE ${score}<br><br>PRESS START`;
  messageEl.classList.remove("hidden");
}

function openGame(){
  makeOverlay();
  oldBodyOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden","false");
  draw();
  try{
    if(document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(()=>{});
    }
  }catch(e){}
}

function closeGame(){
  if(!overlay) return;
  running=false;
  if(raf){cancelAnimationFrame(raf);raf=0;}
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden","true");
  document.body.style.overflow=oldBodyOverflow;
  try{
    if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(()=>{});
  }catch(e){}
}

function init(){
  addStyles();
  makeOverlay();
  if(addButtonToTv()) return;
  const obs=new MutationObserver(()=>{
    if(addButtonToTv()) obs.disconnect();
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>{addButtonToTv();},500);
}

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();