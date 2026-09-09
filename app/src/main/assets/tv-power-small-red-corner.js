(() => {
  "use strict";

  function applySmallRedCornerPower() {
    if (document.getElementById("tvPowerSmallRedCornerStyles")) return;

    const style = document.createElement("style");
    style.id = "tvPowerSmallRedCornerStyles";
    style.textContent = `
      /* V4.0.6: smaller solid-red TV power button in the song-info corner */
      .screen{
        padding-right:44px !important;
      }

      .tvPowerBtn,
      .tvPowerBtn.off{
        right:4px !important;
        bottom:4px !important;
        width:30px !important;
        height:30px !important;
        min-width:30px !important;
        min-height:30px !important;
        padding:0 !important;

        border:2px solid #ff7777 !important;
        border-radius:50% !important;
        background:#d71919 !important;
        background-image:none !important;

        color:#ffffff !important;
        font:bold 18px/26px sans-serif !important;
        text-shadow:0 0 3px #ffffffaa !important;

        box-shadow:
          inset 0 0 0 1px #850000,
          0 2px 5px #000a,
          0 0 7px #ff202066 !important;
      }

      .tvPowerBtn:active{
        transform:scale(.92) !important;
        background:#a90e0e !important;
      }

      @media(max-width:520px){
        .screen{
          padding-right:40px !important;
        }
        .tvPowerBtn,
        .tvPowerBtn.off{
          right:3px !important;
          bottom:3px !important;
          width:28px !important;
          height:28px !important;
          min-width:28px !important;
          min-height:28px !important;
          font-size:17px !important;
          line-height:24px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applySmallRedCornerPower, { once:true });
  } else {
    applySmallRedCornerPower();
  }
})();
