/* Design tokens + global styles shared by every screen. */

export const BLUE_DARK = "#0B3C6B";
export const BLUE = "#14588F";
export const BLUE_LIGHT = "#EAF1F8";
export const WHITE = "#FFFFFF";
export const TEXT = "#1B2733";
export const MUTED = "#5B6B7A";
export const LINE = "#D7E1EA";
export const ORANGE = "#F5821F";
export const ORANGE_DARK = "#D96E12";
export const GREEN = "#2E7D46";
export const RED = "#C1272D";
export const AMBER = "#C97A0A";

export const FONT_MONO = "'IBM Plex Mono', ui-monospace, monospace";
export const FONT_BODY = "'IBM Plex Sans', system-ui, sans-serif";

export function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
      * { box-sizing: border-box; }
      html, body, #root { min-height: 100%; }
      input, select, textarea { font-family: ${FONT_BODY}; }
      input:focus, select:focus, button:focus, textarea:focus { outline: 2px solid ${BLUE_DARK}; outline-offset: 2px; }
      @media (prefers-reduced-motion: reduce) {
        .anim, .skeleton, .live-dot { animation: none !important; transition: none !important; }
      }

      @keyframes riseIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
      @keyframes livePulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(.82); } }
      @keyframes checkPop { 0% { transform: scale(.4); opacity: 0; } 70% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }

      .pill { border: 1px solid ${LINE}; background: #fff; cursor: pointer; transition: background .15s, border-color .15s, color .15s; border-radius: 6px; }
      .pill.active { background: ${BLUE_DARK}; border-color: ${BLUE_DARK}; color: #fff; }
      .btn-primary { background: ${ORANGE}; color: #fff; border: none; cursor: pointer; transition: background .15s, transform .1s; border-radius: 6px; font-weight: 600; }
      .btn-primary:hover { background: ${ORANGE_DARK}; }
      .btn-primary:active { transform: translateY(1px); }
      .btn-primary:disabled { opacity: .55; cursor: not-allowed; }
      .btn-ghost { background: transparent; border: 1px solid ${BLUE_DARK}; color: ${BLUE_DARK}; cursor: pointer; border-radius: 6px; }
      .btn-ghost:hover { background: rgba(11,60,107,0.05); }
      .field { border: 1px solid ${LINE}; background: #fff; padding: 10px 12px; width: 100%; font-size: 14px; color: ${TEXT}; border-radius: 6px; }
      .field:disabled { background: #F4F7FA; color: #8A99A8; }
      .card { background: #fff; border: 1px solid ${LINE}; border-radius: 8px; box-shadow: 0 1px 2px rgba(11,60,107,0.06); }
      .card-hover { transition: border-color .15s, box-shadow .15s; }
      .card-hover:hover { border-color: ${BLUE}; box-shadow: 0 3px 10px rgba(11,60,107,0.09); }
      .seat-btn { width: 34px; height: 34px; border-radius: 6px; font-family: ${FONT_MONO}; font-size: 11px; display:flex; align-items:center; justify-content:center; cursor:pointer; border: 1px solid ${LINE}; background:#fff; transition: background .12s, border-color .12s, color .12s; }
      .seat-btn:hover { border-color: ${BLUE}; }
      .seat-btn.booked { background: #EDEFF2; color: #A6AEB6; border-color: #E1E4E8; cursor: not-allowed; }
      .seat-btn.selected { background: ${GREEN}; color: #fff; border-color: ${GREEN}; }
      .scroll-row { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; }
      .scroll-row::-webkit-scrollbar { height: 6px; }
      .scroll-row::-webkit-scrollbar-thumb { background: ${LINE}; border-radius: 3px; }

      .skeleton { background: linear-gradient(90deg, #EDF2F7 0%, #F7FAFC 50%, #EDF2F7 100%); background-size: 800px 100%; animation: shimmer 1.2s linear infinite; border-radius: 6px; }
      .live-dot { width: 8px; height: 8px; border-radius: 50%; background: ${GREEN}; animation: livePulse 1.6s ease-in-out infinite; display: inline-block; }
      .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; }
      .spinner-dark { width: 22px; height: 22px; border: 2px solid ${LINE}; border-top-color: ${BLUE_DARK}; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; }

      .station-wrap { position: relative; }
      .station-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 60; background: #fff; border: 1px solid ${LINE}; border-radius: 8px; box-shadow: 0 12px 28px rgba(11,60,107,.16); max-height: 300px; overflow-y: auto; padding: 4px; }
      .station-option { padding: 8px 10px; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; gap: 10px; align-items: center; }
      .station-option:hover, .station-option.active { background: ${BLUE_LIGHT}; }
      .station-code { font-family: ${FONT_MONO}; font-size: 11px; color: ${BLUE_DARK}; background: ${BLUE_LIGHT}; border: 1px solid ${LINE}; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }

      .method-tab { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 6px; border: 1px solid ${LINE}; border-radius: 8px; background: #fff; cursor: pointer; font-size: 11px; color: ${MUTED}; transition: border-color .15s, background .15s, color .15s; }
      .method-tab.active { border-color: ${BLUE_DARK}; background: ${BLUE_LIGHT}; color: ${BLUE_DARK}; font-weight: 600; }
      .gateway-input { border: 1px solid ${LINE}; background: #fff; padding: 11px 12px; width: 100%; font-size: 14px; color: ${TEXT}; border-radius: 6px; font-family: ${FONT_MONO}; }
      .gateway-input::placeholder { color: #9AAAB8; font-family: ${FONT_BODY}; }
      .otp-input { width: 42px; height: 50px; text-align: center; font-family: ${FONT_MONO}; font-size: 20px; font-weight: 600; border: 1px solid ${LINE}; border-radius: 6px; background: #fff; color: ${TEXT}; }
      .otp-input:focus { border-color: ${BLUE_DARK}; }
      .pay-badge { font-size: 10px; font-weight: 600; color: ${MUTED}; border: 1px solid ${LINE}; padding: 2px 6px; border-radius: 3px; letter-spacing: .3px; }
      .gateway-step { display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 13px; color: ${MUTED}; }
      .gateway-step.done { color: ${TEXT}; }
      .gateway-step .dot { width: 20px; height: 20px; border-radius: 50%; border: 1px solid ${LINE}; display: flex; align-items: center; justify-content: center; font-size: 10px; background: #fff; flex: 0 0 auto; }
      .gateway-step.done .dot { background: ${GREEN}; border-color: ${GREEN}; color: #fff; }
      .gateway-step.active .dot { border-color: ${ORANGE}; color: ${ORANGE}; }

      @media print {
        .no-print { display: none !important; }
        body { background: #fff !important; }
        .print-ticket { box-shadow: none !important; border: 1px solid #bbb !important; break-inside: avoid; }
        main { padding: 0 !important; max-width: 100% !important; }
      }
    `}</style>
  );
}
