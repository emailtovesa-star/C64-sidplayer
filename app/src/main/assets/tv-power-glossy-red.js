(() => {
  "use strict";

  function applyGlossyRedPower() {
    if (document.getElementById("tvPowerGlossyRedStyles")) return;

    const style = document.createElement("style");
    style.id = "tvPowerGlossyRedStyles";
    style.textContent = `
      /* V4.0.6 glossy red push-button, based on the supplied reference image */
      .tvPowerBtn,
      .tvPowerBtn.off {
        right:3px !important;
        bottom:3px !important;
        width:31px !important;
        height:31px !important;
        min-width:31px !important;
        min-height:31px !important;
        padding:0 !important;
        border-radius:50% !important;

        /* Hide the old power glyph: the whole red face is the button. */
        color:transparent !important;
        font-size:0 !important;
        text-shadow:none !important;

        border:2px solid #7c0508 !important;
        background:
          radial-gradient(circle at 35% 27%,
            rgba(255,255,255,.96) 0 4%,
            rgba(255,255,255,.52) 5% 11%,
            transparent 12% 20%),
          radial-gradient(circle at 45% 42%,
            #ff4a4f 0 19%,
            #ed1d25 42%,
            #c50910 68%,
            #850308 100%) !important;

        box-shadow:
          inset 0 0 0 2px #ff5155,
          inset 0 0 0 4px #b4070c,
          inset 0 -4px 6px #620003,
          inset 0 4px 5px rgba(255,255,255,.42),
          0 0 0 2px #2b0203,
          0 2px 4px rgba(0,0,0,.78),
          0 0 7px rgba(255,30,35,.38) !important;
      }

      .tvPowerBtn::before {
        content:"" !important;
        position:absolute !important;
        left:5px !important;
        top:5px !important;
        right:5px !important;
        bottom:5px !important;
        border-radius:50% !important;
        border:1px solid #780306 !important;
        background:
          radial-gradient(circle at 34% 25%,
            rgba(255,255,255,.85) 0 7%,
            rgba(255,255,255,.30) 8% 18%,
            transparent 20%),
          linear-gradient(145deg,#ff3d43 0%,#e3131a 48%,#ad050a 100%) !important;
        box-shadow:
          inset 0 2px 3px rgba(255,255,255,.48),
          inset 0 -3px 4px rgba(82,0,2,.68),
          0 0 0 1px #1d0102 !important;
      }

      .tvPowerBtn:active {
        transform:scale(.94) !important;
        box-shadow:
          inset 0 0 0 2px #e53a3f,
          inset 0 0 0 4px #850308,
          inset 0 4px 7px #590002,
          0 0 0 2px #210102,
          0 1px 2px rgba(0,0,0,.85) !important;
      }

      .tvPowerBtn:active::before {
        transform:translateY(1px) scale(.96);
        filter:brightness(.88);
      }

      @media(max-width:520px) {
        .tvPowerBtn,
        .tvPowerBtn.off {
          right:3px !important;
          bottom:3px !important;
          width:29px !important;
          height:29px !important;
          min-width:29px !important;
          min-height:29px !important;
        }
        .tvPowerBtn::before {
          left:5px !important;
          top:5px !important;
          right:5px !important;
          bottom:5px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyGlossyRedPower, { once:true });
  } else {
    applyGlossyRedPower();
  }
})();
