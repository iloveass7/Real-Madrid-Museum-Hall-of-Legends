// Magazine page builders — real photos (Wikimedia Commons) when available,
// elegant generated cards as fallback.
import { UCL_FINALS, BALLON_DOR, LA_LIGA, COPA_DEL_REY, SUPERCOPA } from "../data/history.js";

let MANIFEST = {};
export function setManifest(m) { MANIFEST = m || {}; }

/* ---------- small inline SVG art (always crisp) ---------- */

function svgCup(w = 92) {
  return `
  <svg width="${w}" viewBox="0 0 80 110" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="g-silver" x1="0" x2="1">
        <stop offset="0" stop-color="#8d99a8"/><stop offset=".5" stop-color="#f2f5fa"/><stop offset="1" stop-color="#8d99a8"/>
      </linearGradient>
    </defs>
    <ellipse cx="14" cy="42" rx="9" ry="16" transform="rotate(18 14 42)" stroke="url(#g-silver)" stroke-width="5"/>
    <ellipse cx="66" cy="42" rx="9" ry="16" transform="rotate(-18 66 42)" stroke="url(#g-silver)" stroke-width="5"/>
    <path d="M28 6 h24 c0 14 6 20 10 30 -2 10 -12 12 -22 12 s-20 -2 -22 -12 c4 -10 10 -16 10 -30 z" fill="url(#g-silver)"/>
    <rect x="34" y="50" width="12" height="18" fill="url(#g-silver)"/>
    <ellipse cx="40" cy="74" rx="22" ry="6" fill="url(#g-silver)"/>
    <ellipse cx="40" cy="80" rx="26" ry="5" fill="#14110c"/>
  </svg>`;
}

function svgBall(w = 74) {
  const petals = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const x = 40 + Math.cos(a) * 22, y = 40 + Math.sin(a) * 22;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="rgba(120,85,20,.35)"/>`;
  }).join("");
  return `
  <svg width="${w}" viewBox="0 0 80 80" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id="g-ball" cx=".35" cy=".3" r="1">
        <stop offset="0" stop-color="#fff0bf"/><stop offset=".55" stop-color="#e3b54f"/><stop offset="1" stop-color="#8a6420"/>
      </radialGradient>
    </defs>
    <circle cx="40" cy="40" r="34" fill="url(#g-ball)"/>
    <polygon points="40,26 51,34 47,48 33,48 29,34" fill="rgba(120,85,20,.5)"/>
    ${petals}
  </svg>`;
}

/* ---------- image helpers ---------- */

const fbCache = new Map();
function fallbackCard(label, sub, kind) {
  const key = `${kind}|${label}|${sub}`;
  if (fbCache.has(key)) return fbCache.get(key);
  const c = document.createElement("canvas");
  c.width = 880; c.height = 560;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(440, 220, 40, 440, 280, 560);
  g.addColorStop(0, "#232c48"); g.addColorStop(1, "#0a0e1c");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 880, 560);
  ctx.strokeStyle = "#c9a96a"; ctx.lineWidth = 6; ctx.strokeRect(10, 10, 860, 540);
  // simple silver cup silhouette
  ctx.fillStyle = "#dfe4ec";
  ctx.strokeStyle = "#9aa4b2"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(370, 210, 26, 44, 0.35, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(510, 210, 26, 44, -0.35, 0, 7); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(390, 120); ctx.lineTo(490, 120);
  ctx.bezierCurveTo(492, 190, 530, 200, 526, 250);
  ctx.quadraticCurveTo(440, 280, 354, 250);
  ctx.bezierCurveTo(350, 200, 388, 190, 390, 120);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(424, 258, 32, 40);
  ctx.beginPath(); ctx.ellipse(440, 306, 58, 12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#14110c";
  ctx.beginPath(); ctx.ellipse(440, 316, 66, 12, 0, 0, 7); ctx.fill();
  ctx.textAlign = "center";
  ctx.fillStyle = "#f0d489";
  ctx.font = "700 52px Georgia, serif";
  ctx.fillText(label, 440, 420);
  ctx.fillStyle = "rgba(255,255,255,.8)";
  ctx.font = "400 28px Georgia, serif";
  ctx.fillText(sub, 440, 470);
  ctx.fillStyle = "rgba(255,255,255,.35)";
  ctx.font = "400 18px 'Segoe UI', sans-serif";
  ctx.fillText("ARCHIVE IMAGE", 440, 520);
  const url = c.toDataURL("image/jpeg", 0.85);
  fbCache.set(key, url);
  return url;
}

function img(src, alt, fbLabel, fbSub) {
  const fb = fallbackCard(fbLabel, fbSub, "cup");
  return `<img class="page-photo" src="${src}" alt="${alt}"
    onerror="this.onerror=null;this.src='${fb}'">`;
}

function photoFor(slug, alt, fbLabel, fbSub) {
  const meta = MANIFEST[slug];
  if (meta) return img(meta.file, alt, fbLabel, fbSub);
  return img(fallbackCard(fbLabel, fbSub, "cup"), alt, fbLabel, fbSub);
}

/* ================================================================ pages */

export function buildUCLPages() {
  const total = UCL_FINALS.length;
  return UCL_FINALS.map((f, i) => {
    const slug = `final_${f.year}`;
    const dots = UCL_FINALS.map((_, j) =>
      `<span class="${j === i ? "now" : ""}">${j + 1}</span>`
    ).join("");
    return {
      html: `
      <div class="pg-hero">
        <div>
          ${photoFor(slug, `${f.year} European Cup final`, `EUROPEAN CUP`, String(f.year))}
        </div>
        <div>
          <div class="page-sub">Europe · Final Nº ${i + 1} of ${total}</div>
          <div class="page-year">${f.year}</div>
          <div class="page-score">Real Madrid <b>${f.score}</b><br/>${f.opponent}</div>
          <div class="page-meta">${f.edition} — ${f.venue}</div>
          <p class="page-text">${f.note}</p>
          <div class="page-note">Trophy Nº ${i + 1} — every star on the mini-map below is a real European final won by Real Madrid.</div>
          <div class="mini-trophies">${dots}</div>
        </div>
      </div>`,
    };
  });
}

export function buildBallonPages() {
  return BALLON_DOR.map((p, i) => {
    const years = p.years.join(" · ");
    const balls = p.years.map(() => svgBall(46)).join("");
    return {
      html: `
      <div class="pg-hero">
        <div>
          ${photoFor(p.img, `${p.player} Ballon d'Or`, "BALLON D'OR", years)}
        </div>
        <div>
          <div class="player-number">Ballon d'Or · Winner Nº ${i + 1} of ${BALLON_DOR.length}</div>
          <div class="player-name">${p.player}</div>
          <div class="player-years">${years}</div>
          <div class="page-meta" style="margin-top:6px">${p.role}</div>
          <div style="display:flex;gap:10px;margin:18px 0 4px">${balls}</div>
          <p class="page-text">${p.note}</p>
          <div class="page-note">Shown holding the Ballon d'Or era he conquered — one of ${BALLON_DOR.reduce((a, b) => a + b.years.length, 0)} golden balls won in white.</div>
        </div>
      </div>`,
    };
  });
}

export function buildDomesticPages() {
  const defs = [
    { cup: LA_LIGA, svg: svgCup(120), slug: "laliga_trophy", sub: "Spanish League Championship" },
    { cup: COPA_DEL_REY, svg: svgCup(120), slug: "copa_trophy", sub: "Copa de S.M. el Rey" },
    { cup: SUPERCOPA, svg: svgCup(120), slug: "spanish_super_cup", sub: "Spanish Super Cup" },
  ];
  return defs.map((d, i) => ({
    html: `
    <div class="pg-hero">
      <div style="text-align:center">
        ${d.slug ? photoFor(d.slug, d.cup.name, d.cup.name.toUpperCase(), `${d.cup.count} titles`) : d.svg}
      </div>
      <div>
        <div class="page-sub">Domestic Honours · ${i + 1} / 3</div>
        <div style="display:flex;align-items:baseline;gap:18px">
          <div class="tally-big">${d.cup.count}</div>
          <div>
            <div class="player-name" style="font-size:34px">${d.cup.name}</div>
            <div class="page-meta">${d.sub}</div>
          </div>
        </div>
        <p class="page-text">${d.cup.blurb}</p>
        <div class="page-sub" style="margin-top:20px">Every season won</div>
        <div class="year-grid">${d.cup.years.map((y) => `<span>${y}</span>`).join("")}</div>
      </div>
    </div>`,
  }));
}
