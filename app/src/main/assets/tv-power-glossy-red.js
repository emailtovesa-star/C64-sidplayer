(() => {
  "use strict";

  function applyGlossyRedPower() {
    if (document.getElementById("tvPowerGlossyRedStyles")) return;

    const style = document.createElement("style");
    style.id = "tvPowerGlossyRedStyles";
    style.textContent = `
      /* V4.0.6 glossy pink push-button, based on the supplied reference image */
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

        /* Hide the old power glyph: the whole pink face is the button. */
        color:transparent !important;
        font-size:0 !important;
        text-shadow:none !important;

        border:2px solid #7a0646 !important;
        background:
          radial-gradient(circle at 35% 27%,
            rgba(255,255,255,.96) 0 4%,
            rgba(255,255,255,.52) 5% 11%,
            transparent 12% 20%),
          radial-gradient(circle at 45% 42%,
            #ff5fba 0 19%,
            #f02b9a 42%,
            #c20b72 68%,
            #730342 100%) !important;

        box-shadow:
          inset 0 0 0 2px #ff66c1,
          inset 0 0 0 4px #a50760,
          inset 0 -4px 6px #56002f,
          inset 0 4px 5px rgba(255,255,255,.42),
          0 0 0 2px #250116,
          0 2px 4px rgba(0,0,0,.78),
          0 0 7px rgba(255,35,163,.38) !important;
      }

      .tvPowerBtn::before {
        content:"" !important;
        position:absolute !important;
        left:5px !important;
        top:5px !important;
        right:5px !important;
        bottom:5px !important;
        border-radius:50% !important;
        border:1px solid #720442 !important;
        background:
          radial-gradient(circle at 34% 25%,
            rgba(255,255,255,.85) 0 7%,
            rgba(255,255,255,.30) 8% 18%,
            transparent 20%),
          linear-gradient(145deg,#ff57b4 0%,#e51b8b 48%,#a3055d 100%) !important;
        box-shadow:
          inset 0 2px 3px rgba(255,255,255,.48),
          inset 0 -3px 4px rgba(82,0,45,.68),
          0 0 0 1px #1d0111 !important;
      }

      .tvPowerBtn:active {
        transform:scale(.94) !important;
        box-shadow:
          inset 0 0 0 2px #e83aa1,
          inset 0 0 0 4px #730342,
          inset 0 4px 7px #50002c,
          0 0 0 2px #210113,
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
