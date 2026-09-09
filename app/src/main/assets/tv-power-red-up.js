(() => {
  "use strict";

  function applyV406VisualTweak() {
    if (document.getElementById("tvPowerV406RedUpStyles")) return;

    const style = document.createElement("style");
    style.id = "tvPowerV406RedUpStyles";
    style.textContent = `
      /* V4.0.6 refinement: red TV power button */
      .tvPowerBtn{
        border-color:#ff7272 !important;
        background:
          radial-gradient(circle at 35% 30%,
            #ff8a8a 0 10%,
            #e83b3b 24%,
            #aa1515 52%,
            #5d0909 78%,
            #260303 100%) !important;
        box-shadow:
          inset 0 0 0 2px #4a0505,
          inset 0 3px 5px #ffb0b055,
          0 3px 9px #000b,
          0 0 12px #ff383888 !important;
        color:#fff6f6 !important;
        text-shadow:0 0 5px #fff,0 0 8px #ff5b5b;
      }

      .tvPowerBtn.off{
        border-color:#ff3c3c !important;
        background:
          radial-gradient(circle at 38% 32%,
            #ff5d5d 0 9%,
            #bb1717 30%,
            #720909 62%,
            #300303 100%) !important;
        color:#ffffff !important;
        box-shadow:
          inset 0 0 0 2px #320202,
          0 3px 9px #000b,
          0 0 14px #ff2929aa !important;
      }

      /* Move the old antenna TV a little higher inside the song info box. */
      .tvPowerStage.show .vintageTv{
        animation:tvAppearV406Up .65s .28s cubic-bezier(.18,.8,.3,1.15) forwards !important;
      }

      @keyframes tvAppearV406Up{
        from{
          opacity:0;
          transform:scale(.72) translateY(-2px);
        }
        to{
          opacity:1;
          transform:scale(1) translateY(-14px);
        }
      }

      @media(max-width:520px){
        .tvPowerStage.show .vintageTv{
          animation-name:tvAppearV406UpMobile !important;
        }

        @keyframes tvAppearV406UpMobile{
          from{
            opacity:0;
            transform:scale(.72) translateY(0);
          }
          to{
            opacity:1;
            transform:scale(1) translateY(-10px);
          }
        }
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyV406VisualTweak, { once:true });
  } else {
    applyV406VisualTweak();
  }
})();
