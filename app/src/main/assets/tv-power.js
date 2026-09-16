(() => {
  "use strict";

  const VERSION = "V4.0.26";

  function injectStyles() {
    if (document.getElementById("tvPowerStyles")) return;
    const style = document.createElement("style");
    style.id = "tvPowerStyles";
    style.textContent = `
      .screen{
        position:relative;
        overflow:hidden;
        min-height:154px;
        padding-right:58px !important;
      }

      .tvPowerBtn{
        position:absolute;
        right:8px;
        bottom:8px;
        width:42px;
        height:42px;
        min-height:42px;
        padding:0;
        z-index:12;
        border-radius:50%;
        border:2px solid #8daeff;
        background:
          radial-gradient(circle at 38% 32%,#4d68bc 0 15%,#263f94 37%,#111a54 72%,#080b27 100%);
        box-shadow:
          inset 0 0 0 2px #07102f,
          0 3px 9px #000b,
          0 0 9px #4f8eff66;
        color:#bfe0ff;
        font:bold 24px/38px sans-serif;
        cursor:pointer;
        user-select:none;
        -webkit-tap-highlight-color:transparent;
      }
      .tvPowerBtn:active{transform:scale(.94)}
      .tvPowerBtn.off{
        color:#ff7575;
        border-color:#ff6767;
        box-shadow:
          inset 0 0 0 2px #2f0707,
          0 3px 9px #000b,
          0 0 11px #ff414177;
      }

      .tvPowerStage{
        position:absolute;
        inset:0;
        z-index:10;
        display:none;
        align-items:center;
        justify-content:center;
        background:
          radial-gradient(circle at 50% 42%,#0e1432 0,#050713 58%,#000 100%);
      }
      .tvPowerStage.show{display:flex}

      .crtShutdownFlash{
        position:absolute;
        inset:0;
        pointer-events:none;
        opacity:0;
        z-index:14;
      }
      .crtShutdownFlash.run{
        animation:crtShut .62s ease-in forwards;
      }
      @keyframes crtShut{
        0%{
          opacity:1;
          background:#dff7ff;
          transform:scaleY(1) scaleX(1);
          filter:brightness(1.5);
        }
        40%{
          opacity:.95;
          background:#fff;
          transform:scaleY(.025) scaleX(.92);
          filter:brightness(2.5);
        }
        72%{
          opacity:.9;
          background:#fff;
          transform:scaleY(.018) scaleX(.12);
          filter:brightness(3);
        }
        100%{
          opacity:0;
          background:#fff;
          transform:scaleY(.004) scaleX(.015);
        }
      }

      .vintageTv{
        position:relative;
        width:min(74%,330px);
        aspect-ratio:1.34/1;
        transform:scale(.82);
        opacity:0;
      }
      .tvPowerStage.show .vintageTv{
        animation:tvAppear .65s .28s cubic-bezier(.18,.8,.3,1.15) forwards;
      }
      @keyframes tvAppear{
        from{opacity:0;transform:scale(.72) translateY(10px)}
        to{opacity:1;transform:scale(1) translateY(0)}
      }

      .tvAntenna{
        position:absolute;
        left:50%;
        top:-25%;
        width:48%;
        height:32%;
        transform:translateX(-50%);
      }
      .tvAntenna::before,
      .tvAntenna::after{
        content:"";
        position:absolute;
        bottom:0;
        width:5px;
        height:105%;
        border-radius:5px;
        background:linear-gradient(90deg,#555,#ddd,#444);
        box-shadow:0 1px 2px #000;
        transform-origin:bottom center;
      }
      .tvAntenna::before{
        left:48%;
        transform:rotate(-35deg);
      }
      .tvAntenna::after{
        right:48%;
        transform:rotate(35deg);
      }

      .tvCabinet{
        position:absolute;
        inset:15% 4% 5%;
        border-radius:15% 13% 12% 12%;
        background:
          linear-gradient(135deg,#8a5f35 0,#4b2d18 33%,#79502e 62%,#382014 100%);
        border:4px solid #2b160b;
        box-shadow:
          inset 0 0 0 3px #c6925a,
          inset 0 3px 0 #e0b07888,
          inset 0 -16px 22px #1c100b99,
          0 13px 20px #000b;
      }
      .tvCabinet::after{
        content:"";
        position:absolute;
        left:12%;
        right:12%;
        bottom:-10%;
        height:10%;
        background:
          linear-gradient(90deg,
            transparent 0 10%,
            #332016 10% 18%,
            transparent 18% 82%,
            #332016 82% 90%,
            transparent 90%);
      }

      .tvGlass{
        position:absolute;
        left:8%;
        top:10%;
        width:66%;
        height:72%;
        overflow:hidden;
        border-radius:20% / 16%;
        border:5px solid #24170f;
        background:
          radial-gradient(ellipse at 48% 44%,#292d2f 0,#111617 55%,#030505 100%);
        box-shadow:
          inset 0 0 22px #000,
          inset 0 0 5px #a0b1ab88;
      }
      .tvGifAnimation{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        object-fit:cover;
        display:none;
        z-index:2;
        border-radius:inherit;
        pointer-events:none;
      }
      .tvGlass.gifPlaying .tvGifAnimation{display:block}
      .tvEqualizer{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        display:none;
        z-index:2;
        border-radius:inherit;
        pointer-events:none;
      }
      .tvGlass.equalizerPlaying .tvEqualizer{display:block}
      .tvGlass.equalizerPlaying .tvOffDot{display:none}
      .tvGlass.equalizerPlaying::before{z-index:3;opacity:.10}
      .tvGlass.equalizerPlaying::after{z-index:4}
      .tvGlass.gifPlaying .tvOffDot{display:none}
      .tvGlass.gifPlaying::before{z-index:3;opacity:.10}
      .tvGlass.gifPlaying::after{z-index:4}
      .tvGlass{cursor:pointer;-webkit-tap-highlight-color:transparent}

      .tvGlass::before{
        content:"";
        position:absolute;
        inset:0;
        opacity:.2;
        background:
          repeating-linear-gradient(
            0deg,
            transparent 0 3px,
            #d6f1e8 4px,
            transparent 5px
          );
        animation:oldTvStatic .18s steps(2,end) infinite;
      }
      @keyframes oldTvStatic{
        0%{transform:translateY(-3px);opacity:.11}
        50%{transform:translateY(2px);opacity:.23}
        100%{transform:translateY(0);opacity:.13}
      }
      .tvGlass::after{
        content:"";
        position:absolute;
        inset:0;
        background:
          radial-gradient(ellipse at 35% 24%,#ffffff1f 0 7%,transparent 25%),
          radial-gradient(ellipse at center,transparent 45%,#0009 100%);
      }

      .tvOffDot{
        position:absolute;
        width:8px;
        height:8px;
        border-radius:50%;
        left:50%;
        top:50%;
        transform:translate(-50%,-50%);
        background:#c9f8ff;
        box-shadow:0 0 7px #fff,0 0 14px #91dfff;
        animation:offDot 1.5s ease-in-out infinite;
      }
      @keyframes offDot{
        0%,100%{opacity:.35;transform:translate(-50%,-50%) scale(.6)}
        50%{opacity:.95;transform:translate(-50%,-50%) scale(1)}
      }

      .tvControlsOld{
        position:absolute;
        right:5%;
        top:13%;
        width:18%;
        height:66%;
        border-radius:10px;
        background:linear-gradient(#322a24,#171310);
        border:2px solid #17100b;
        box-shadow:inset 0 0 0 2px #5a4737;
      }
      .tvKnob{
        position:absolute;
        left:50%;
        width:43%;
        aspect-ratio:1;
        transform:translateX(-50%);
        border-radius:50%;
        background:
          radial-gradient(circle at 36% 30%,#a8a8a8 0 7%,#4b4b4b 28%,#171717 62%,#050505 100%);
        border:2px solid #080808;
        box-shadow:0 2px 3px #000;
      }
      .tvKnob.one{top:10%}
      .tvKnob.two{top:38%}
      .tvSpeaker{
        position:absolute;
        left:24%;
        right:24%;
        bottom:8%;
        height:24%;
        opacity:.72;
        background:repeating-linear-gradient(
          90deg,
          #080808 0 2px,
          transparent 2px 5px
        );
      }

      .tvOffLabel{
        position:absolute;
        left:0;
        right:0;
        bottom:-10%;
        text-align:center;
        color:#c7d8ff;
        font:bold 11px monospace;
        letter-spacing:2px;
        text-shadow:0 0 6px #78a8ff;
      }

      .songInfoHidden{
        visibility:hidden;
      }

      @media(max-width:520px){
        .screen{padding-right:54px !important}
        .tvPowerBtn{
          width:38px;height:38px;min-height:38px;
          font-size:22px;line-height:34px;
        }
        .vintageTv{width:min(82%,285px)}
      }
    `;
    document.head.appendChild(style);
  }

  function updateVersion() {
    const title = document.querySelector("title");
    if (title) title.textContent = "C64 SID Player V4.0.26";
    const sub = document.querySelector(".sub");
    if (sub) sub.textContent = VERSION;
  }

  function buildTvPowerUi() {
    const screen = document.querySelector(".screen");
    if (!screen || document.getElementById("tvPowerBtn")) return;

    const button = document.createElement("button");
    button.id = "tvPowerBtn";
    button.className = "tvPowerBtn";
    button.type = "button";
    button.title = "TV power";
    button.setAttribute("aria-label", "TV power");
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = "⏻";

    const stage = document.createElement("div");
    stage.id = "tvPowerStage";
    stage.className = "tvPowerStage";
    stage.setAttribute("aria-hidden", "true");
    stage.innerHTML = `
      <div class="crtShutdownFlash" id="crtShutdownFlash"></div>
      <div class="vintageTv">
        <div class="tvAntenna"></div>
        <div class="tvCabinet">
          <div class="tvGlass" id="retroTvTouchScreen"><div class="tvOffDot"></div><img class="tvGifAnimation" id="retroTvGif" alt="" draggable="false"><canvas class="tvEqualizer" id="retroTvEqualizer" aria-label="Three-channel SID equalizer"></canvas></div>
          <div class="tvControlsOld">
            <div class="tvKnob one"></div>
            <div class="tvKnob two"></div>
            <div class="tvSpeaker"></div>
          </div>
        </div>
        <div class="tvOffLabel">TELEVISION OFF</div>
      </div>
    `;

    screen.appendChild(stage);
    screen.appendChild(button);

    // Stop retro-TV clicks from reaching the parent song-info screen.
    // This prevents TV/cabinet/background touches from toggling infoWhite.
    stage.addEventListener("click", e => {
      e.stopPropagation();
    });

    // Touch the actual retro TV glass to start the embedded GIF.
    // The src is assigned only on first touch, avoiding GIF decode work at app startup.
    const retroTvTouchScreen = stage.querySelector("#retroTvTouchScreen");
    const retroTvGif = stage.querySelector("#retroTvGif");
    const retroTvEqualizer = stage.querySelector("#retroTvEqualizer");
    let equalizerFrame = 0;
    let equalizerLevels = [0,0,0];
    let retroTvDisplayMode = 0; // 0=original TV, 1=C64 screen, 2=stripes, 3=SID equalizer

    function readVisualizerLevels() {
      try {
        const packed = Number(window.AndroidPlayer?.nativeVisualizerLevels?.()) >>> 0;
        return [packed&1023,(packed>>>10)&1023,(packed>>>20)&1023];
      } catch (_) { return [0,0,0]; }
    }

    function drawEqualizer() {
      if (!retroTvEqualizer || retroTvDisplayMode !== 3) { equalizerFrame=0; return; }
      const rect=retroTvEqualizer.getBoundingClientRect();
      const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
      const width=Math.max(1,Math.round(rect.width*dpr));
      const height=Math.max(1,Math.round(rect.height*dpr));
      if(retroTvEqualizer.width!==width||retroTvEqualizer.height!==height){retroTvEqualizer.width=width;retroTvEqualizer.height=height;}
      const ctx=retroTvEqualizer.getContext("2d");
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const w=rect.width,h=rect.height;
      ctx.fillStyle="#020716";ctx.fillRect(0,0,w,h);
      const target=readVisualizerLevels();
      for(let i=0;i<3;i++)equalizerLevels[i]+=(target[i]-equalizerLevels[i])*(target[i]>equalizerLevels[i]?.42:.16);
      const colors=["#69edff","#ff70c7","#65ff72"];
      const labels=["SID 1","SID 2","SID 3"];
      const segments=12,gap=2;
      const side=w*.12,column=(w-side*2)/3,barW=column*.50;
      const top=h*.15,bottom=h*.23,usable=h-top-bottom;
      ctx.textAlign="center";ctx.textBaseline="middle";ctx.font=`bold ${Math.max(7,h*.075)}px monospace`;
      for(let c=0;c<3;c++){
        const x=side+c*column+(column-barW)/2;
        const lit=Math.round((equalizerLevels[c]/1000)*segments);
        for(let s=0;s<segments;s++){
          const segH=(usable-gap*(segments-1))/segments;
          const y=top+(segments-1-s)*(segH+gap);
          ctx.globalAlpha=s<lit?(.62+.38*(s+1)/segments):.10;
          ctx.fillStyle=colors[c];ctx.fillRect(x,y,barW,segH);
          if(s<lit){ctx.globalAlpha=.18;ctx.shadowColor=colors[c];ctx.shadowBlur=8;ctx.fillRect(x,y,barW,segH);ctx.shadowBlur=0;}
        }
        ctx.globalAlpha=1;ctx.fillStyle=colors[c];ctx.fillText(labels[c],x+barW/2,h-bottom*.43);
      }
      ctx.globalAlpha=.55;ctx.fillStyle="#c8e9ff";ctx.font=`bold ${Math.max(6,h*.055)}px monospace`;ctx.fillText("LIVE SID LEVELS",w/2,h*.075);
      ctx.globalAlpha=1;
      equalizerFrame=requestAnimationFrame(drawEqualizer);
    }

    function stopEqualizer(){if(equalizerFrame)cancelAnimationFrame(equalizerFrame);equalizerFrame=0;equalizerLevels=[0,0,0];}
    if (retroTvTouchScreen && retroTvGif) {
      retroTvTouchScreen.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();

        retroTvDisplayMode = (retroTvDisplayMode + 1) % 4;
        stopEqualizer();
        retroTvTouchScreen.classList.remove("gifPlaying","equalizerPlaying");
        retroTvGif.removeAttribute("src");

        if (retroTvDisplayMode === 0) {
          // Original unlit TV picture.
        } else if (retroTvDisplayMode === 1) {
          // C64 BASIC screen animation.
          retroTvGif.src = "retro-tv-c64-screen.gif";
          retroTvTouchScreen.classList.add("gifPlaying");
        } else if (retroTvDisplayMode === 2) {
          // Shortened stripes / MP4-derived animation.
          retroTvGif.src = "retro-tv-animation.gif";
          retroTvTouchScreen.classList.add("gifPlaying");
        } else {
          // Live three-band display representing the three SID music channels.
          retroTvTouchScreen.classList.add("equalizerPlaying");
          equalizerFrame=requestAnimationFrame(drawEqualizer);
        }
      });
    }

    const infoElements = [...screen.children].filter(el =>
      el !== stage &&
      el !== button &&
      el.id !== "engine"
    );

    let tvOff = false;

    function setTvOff(off) {
      tvOff = off;
      button.classList.toggle("off", off);
      button.setAttribute("aria-pressed", off ? "true" : "false");

      if (off) {
        // Visual "TV off" effect only. SID playback is intentionally not changed.
        const flash = stage.querySelector("#crtShutdownFlash");
        stage.classList.add("show");
        stage.setAttribute("aria-hidden", "false");

        for (const el of infoElements) el.classList.add("songInfoHidden");

        flash.classList.remove("run");
        void flash.offsetWidth;
        flash.classList.add("run");
      } else {
        stopEqualizer();
        stage.classList.remove("show");
        stage.setAttribute("aria-hidden", "true");
        for (const el of infoElements) el.classList.remove("songInfoHidden");
      }
    }

    button.addEventListener("click", () => setTvOff(!tvOff));
  }

  function init() {
    injectStyles();
    updateVersion();
    buildTvPowerUi();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else {
    init();
  }
})();
