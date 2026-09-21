// TextureLibrary — every texture in the museum is generated procedurally on
// canvas first (so the app always works), then real photos downloaded from
// Wikimedia Commons are painted on top of the matching canvas when available.
import * as THREE from "three";

const GOLD = "#c9a96a";
const GOLD_BRIGHT = "#f0d489";
const BLUE = "#005296";
const INK = "#0b0e17";

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

export class TextureLibrary {
  constructor(renderer) {
    this.maxAniso = renderer.capabilities.getMaxAnisotropy();
    this.registry = new Map();   // key -> { canvas, ctx, texture, w, h, photoLoaded }
    this.photoSources = {};      // slug -> { file, source } (from manifest)
    this.bindings = [];          // { key, slug, tint, overlay }
    this.photosReady = false;
  }

  /** Load asset manifest, then paint every bound photo onto its canvas. */
  async init() {
    try {
      const res = await fetch("assets/manifest.json");
      if (res.ok) this.photoSources = await res.json();
    } catch { /* offline — procedural fallbacks only */ }
    this.photosReady = true;
    for (const b of this.bindings) this._paint(b);
  }

  /** Create (or fetch) a canvas-backed texture. */
  make(key, w, h, draw, opts = {}) {
    if (this.registry.has(key)) return this.registry.get(key).texture;
    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext("2d");
    draw(ctx, w, h);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAniso;
    if (opts.repeat) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(opts.repeat[0], opts.repeat[1]);
    }
    this.registry.set(key, { canvas, ctx, texture, w, h, photoLoaded: false });
    // auto-bind when a manifest entry shares this key (e.g. "bernabeu_old")
    this.bindPhoto(key, key);
    return texture;
  }

  /** True once the real photo has been painted onto key's canvas. */
  hasPhoto(key) {
    return !!this.registry.get(key)?.photoLoaded;
  }

  /** Bind a manifest photo slug to a texture canvas key. */
  bindPhoto(key, slug, opts = {}) {
    const meta = this.photoSources[slug];
    const entry = this.registry.get(key);
    this.bindings.push({ key, slug, ...opts });
    if (this.photosReady && meta && entry) this._paint({ key, slug, ...opts });
  }

  _paint(b) {
    const meta = this.photoSources[b.slug];
    const entry = this.registry.get(b.key);
    if (!meta || !entry || entry.photoLoaded) return;
    const img = new Image();
    img.onload = () => {
      const { canvas, ctx, texture, w, h } = entry;
      if (b.custom) {
        b.custom(ctx, img, w, h);
      } else {
        const scale = Math.max(w / img.width, h / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        if (b.tint === "gold") {
          ctx.globalCompositeOperation = "multiply";
          ctx.fillStyle = "#cfa64e";
          ctx.fillRect(0, 0, w, h);
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = "rgba(255,235,190,.20)";
          ctx.fillRect(0, 0, w, h);
          ctx.globalCompositeOperation = "source-over";
        }
        if (b.tint === "goldFace") {
          // lighter gilding than "gold" — keeps facial features/skin tones
          // readable instead of gilding them into abstraction.
          ctx.globalCompositeOperation = "multiply";
          ctx.fillStyle = "#e8c887";
          ctx.fillRect(0, 0, w, h);
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = "rgba(255,240,205,.12)";
          ctx.fillRect(0, 0, w, h);
          ctx.globalCompositeOperation = "source-over";
        }
        if (b.overlay) b.overlay(ctx, w, h);
      }
      entry.photoLoaded = true;
      texture.needsUpdate = true;
    };
    img.onerror = () => { /* keep procedural art */ };
    img.src = meta.file;
  }

  /* ------------------------------------------------------------------ */
  /* Surfaces                                                            */
  /* ------------------------------------------------------------------ */

  marbleFloor() {
    return this.make("floor", 1024, 1024, (ctx, w, h) => {
      // cool polished terrazzo — modern gallery floor, not warm old-world marble
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#e9eaec"); g.addColorStop(.5, "#dfe1e4"); g.addColorStop(1, "#e6e7e9");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // large modern tile grid, thin cool-grey joints
      const n = 4, s = w / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const shade = (i + j) % 2 === 0 ? 0 : 5;
        ctx.fillStyle = `rgba(${205 - shade},${208 - shade},${212 - shade},0.35)`;
        ctx.fillRect(i * s, j * s, s, s);
        ctx.strokeStyle = "rgba(150,155,162,0.55)"; ctx.lineWidth = 2.5;
        ctx.strokeRect(i * s + 1.5, j * s + 1.5, s - 3, s - 3);
      }
      // terrazzo flecks instead of warm veining
      for (let i = 0; i < 1400; i++) {
        const r = 1 + Math.random() * 3.2;
        const tones = ["rgba(255,255,255,0.55)", "rgba(120,128,138,0.35)", "rgba(180,190,200,0.4)", "rgba(60,66,74,0.22)"];
        ctx.fillStyle = tones[(Math.random() * tones.length) | 0];
        ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2); ctx.fill();
      }
      // soft cool polish highlights
      for (let i = 0; i < 22; i++) {
        const gx = Math.random() * w, gy = Math.random() * h, r = 60 + Math.random() * 180;
        const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
        gg.addColorStop(0, "rgba(255,255,255,0.10)"); gg.addColorStop(1, "transparent");
        ctx.fillStyle = gg; ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
      }
    }, { repeat: [5, 3.25] });
  }

  carpet() {
    return this.make("carpet", 512, 1024, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, "#1c2450"); g.addColorStop(.5, "#232d63"); g.addColorStop(1, "#1c2450");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // subtle weave
      for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * .05})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
      }
      // gold borders
      ctx.fillStyle = GOLD;
      ctx.fillRect(14, 0, 5, h); ctx.fillRect(w - 19, 0, 5, h);
      ctx.fillRect(34, 0, 2, h); ctx.fillRect(w - 36, 0, 2, h);
      // center monogram strip
      ctx.save();
      ctx.translate(w / 2, h / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "rgba(201,169,106,.22)";
      ctx.font = "700 44px Georgia, serif"; ctx.textAlign = "center";
      for (let i = -3; i <= 3; i++) ctx.fillText("★  R M ★", i * 260, 15);
      ctx.restore();
    });
  }

  wall() {
    return this.make("wall", 1024, 512, (ctx, w, h) => {
      // clean modern gallery wall — soft white/grey, minimal reveals
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#f4f4f2"); g.addColorStop(.55, "#eeeeec"); g.addColorStop(1, "#e6e6e4");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // fine plaster noise, much subtler than before
      for (let i = 0; i < 3000; i++) {
        ctx.fillStyle = `rgba(${Math.random() < .5 ? "255,255,255" : "40,42,46"},${Math.random() * .035})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      // thin, minimal vertical reveal lines (architectural joints, not ornate panels)
      ctx.strokeStyle = "rgba(60,64,70,0.16)"; ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        const x = i * (w / 4);
        ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, h - 20); ctx.stroke();
      }
      // slim dark skirting at the base — modern, not a heavy brown wainscot
      ctx.fillStyle = "#2b2d31"; ctx.fillRect(0, h - 16, w, 16);
      ctx.fillStyle = "rgba(255,255,255,.10)"; ctx.fillRect(0, h - 16, w, 2);
    }, { repeat: [6, 1] });
  }

  ceiling() {
    return this.make("ceiling", 1024, 1024, (ctx, w, h) => {
      // modern dropped ceiling — light grey panels, cool white LED reveals
      ctx.fillStyle = "#d7d9dc"; ctx.fillRect(0, 0, w, h);
      const n = 4, s = w / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = i * s, y = j * s;
        ctx.fillStyle = "#e4e5e7"; ctx.fillRect(x + 14, y + 14, s - 28, s - 28);
        ctx.fillStyle = "#dadbdd"; ctx.fillRect(x + 40, y + 40, s - 80, s - 80);
        // cool white LED strip instead of warm gold cove light
        const g = ctx.createLinearGradient(x, y + 14, x, y + 40);
        g.addColorStop(0, "rgba(222,233,255,.95)"); g.addColorStop(1, "rgba(222,233,255,0)");
        ctx.fillStyle = g; ctx.fillRect(x + 16, y + 14, s - 32, 26);
      }
    }, { repeat: [5, 3.25] });
  }

  wood() {
    return this.make("wood", 512, 512, (ctx, w, h) => {
      // light ash/oak — modern gallery wood, not dark old-world mahogany
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, "#c9b393"); g.addColorStop(.5, "#d8c3a2"); g.addColorStop(1, "#c6b090");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) {
        ctx.strokeStyle = `rgba(${120 + Math.random() * 40},${95 + Math.random() * 30},${60 + Math.random() * 20},${.18 + Math.random() * .22})`;
        ctx.lineWidth = 1 + Math.random() * 3;
        ctx.beginPath();
        const y = Math.random() * h;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(w * .3, y + (Math.random() - .5) * 30, w * .7, y + (Math.random() - .5) * 30, w, y);
        ctx.stroke();
      }
    }, { repeat: [2, 1] });
  }

  /* ------------------------------------------------------------------ */
  /* Crest / logos / plaques                                             */
  /* ------------------------------------------------------------------ */

  crest(size = 512) {
    return this.make("crest", size, size, (ctx, w, h) => {
      const c = w / 2, r = w / 2 - 8;
      ctx.clearRect(0, 0, w, h);
      // outer gold ring
      ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.fillStyle = GOLD; ctx.fill();
      // white inner
      ctx.beginPath(); ctx.arc(c, c, r * .9, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff"; ctx.fill();
      // navy diagonal band (stylized sash)
      ctx.save();
      ctx.beginPath(); ctx.arc(c, c, r * .9, 0, Math.PI * 2); ctx.clip();
      ctx.translate(c, c); ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = BLUE;
      ctx.fillRect(-r, -r * .18, r * 2, r * .36);
      ctx.restore();
      // monogram
      ctx.fillStyle = BLUE;
      ctx.font = `800 ${Math.round(w * .30)}px Georgia, serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("RM", c, c + w * .02);
      // crown hint
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      const cw = w * .34, cx = c - cw / 2, cy = c - r * .82;
      ctx.moveTo(cx, cy + w * .05);
      for (let i = 0; i <= 4; i++) {
        const px = cx + (cw / 4) * i;
        ctx.lineTo(px, cy + (i % 2 === 0 ? w * .05 : -w * .03));
      }
      ctx.lineTo(cx + cw, cy + w * .05); ctx.closePath(); ctx.fill();
    });
  }

  plaque(title, sub = "") {
    const key = "plaque:" + title + sub;
    return this.make(key, 512, 160, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#20180f"); g.addColorStop(1, "#3a2c18");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = GOLD; ctx.lineWidth = 6; ctx.strokeRect(6, 6, w - 12, h - 12);
      ctx.fillStyle = GOLD_BRIGHT;
      ctx.font = "700 40px Georgia, serif"; ctx.textAlign = "center";
      ctx.fillText(title, w / 2, sub ? h / 2 - 6 : h / 2 + 14);
      if (sub) {
        ctx.font = "400 24px Georgia, serif";
        ctx.fillStyle = "rgba(240,212,137,.8)";
        ctx.fillText(sub, w / 2, h / 2 + 36);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Wall posters / gallery art                                          */
  /* ------------------------------------------------------------------ */

  poster(key, { kicker = "", title = "", sub = "", photo = null, accent = GOLD }) {
    const drawTitleBand = (ctx, w, h) => {
      // gradient band + text, drawn over photos at the bottom
      const gh = h * 0.34;
      const g = ctx.createLinearGradient(0, h - gh, 0, h);
      g.addColorStop(0, "rgba(8,10,20,0)");
      g.addColorStop(1, "rgba(8,10,20,.94)");
      ctx.fillStyle = g; ctx.fillRect(0, h - gh, w, gh);
      ctx.textAlign = "center";
      if (kicker) {
        ctx.fillStyle = accent;
        ctx.font = "600 28px 'Segoe UI', sans-serif";
        ctx.fillText(kicker.toUpperCase(), w / 2, h - gh + 52);
      }
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 62px Georgia, serif";
      title.split("\n").forEach((ln, i) => ctx.fillText(ln, w / 2, h - gh + 130 + i * 70));
    };

    // A poster with no photograph used to be drawn on near-black navy, which
    // against these white walls just read as a dead frame. These are printed
    // gallery posters now: warm paper, navy and gold, crest watermarked
    // behind the title.
    const tex = this.make(key, 768, 1024, (ctx, w, h) => {
      // paper
      ctx.fillStyle = "#f3efe4"; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = `rgba(120,110,90,${Math.random() * .05})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      const vg = ctx.createRadialGradient(w / 2, h * .45, w * .2, w / 2, h * .5, w * .95);
      vg.addColorStop(0, "rgba(255,255,255,0)");
      vg.addColorStop(1, "rgba(120,110,88,.16)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);

      // frame rules
      ctx.strokeStyle = BLUE; ctx.lineWidth = 9;
      ctx.strokeRect(26, 26, w - 52, h - 52);
      ctx.strokeStyle = accent; ctx.lineWidth = 2.5;
      ctx.strokeRect(44, 44, w - 88, h - 88);

      ctx.textAlign = "center";

      // kicker on a navy band
      if (kicker) {
        ctx.fillStyle = BLUE;
        ctx.fillRect(44, 92, w - 88, 74);
        ctx.fillStyle = GOLD_BRIGHT;
        ctx.font = "700 30px 'Segoe UI', sans-serif";
        ctx.letterSpacing = "7px";
        ctx.fillText(kicker.toUpperCase(), w / 2, 140);
        ctx.letterSpacing = "0px";
      }

      // title — shrunk to fit so long names don't run off the paper
      const lines = title.split("\n");
      let size = 82;
      ctx.fillStyle = BLUE;
      for (; size > 40; size -= 2) {
        ctx.font = `800 ${size}px Georgia, serif`;
        if (lines.every((ln) => ctx.measureText(ln).width <= w - 150)) break;
      }
      const lead = size * 1.18;
      const top = (kicker ? 300 : 250) + (82 - size) * 0.4;
      lines.forEach((ln, i) => ctx.fillText(ln, w / 2, top + i * lead));

      // gold rule under the title
      const ruleY = top + (lines.length - 1) * lead + 58;
      ctx.strokeStyle = accent; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 130, ruleY); ctx.lineTo(w / 2 + 130, ruleY);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(w / 2, ruleY, 9, 0, 7); ctx.fill();

      if (sub) {
        ctx.fillStyle = "rgba(20,32,66,.78)";
        ctx.font = "400 32px Georgia, serif";
        wrapText(ctx, sub, w / 2, ruleY + 72, w - 190, 44);
      }

      // footer
      ctx.fillStyle = BLUE;
      ctx.fillRect(44, h - 166, w - 88, 3);
      ctx.fillStyle = "rgba(20,32,66,.75)";
      ctx.font = "700 26px 'Segoe UI', sans-serif";
      ctx.letterSpacing = "8px";
      ctx.fillText("REAL MADRID C.F.", w / 2, h - 116);
      ctx.font = "400 22px Georgia, serif";
      ctx.letterSpacing = "3px";
      ctx.fillStyle = "rgba(20,32,66,.55)";
      ctx.fillText("FUNDADO EN 1902", w / 2, h - 80);
      ctx.letterSpacing = "0px";
    });

    // Paint the real logo as a watermark after the canvas is drawn
    const _entry = this.registry.get(key);
    if (_entry) {
      const logoWm = new Image();
      logoWm.onload = () => {
        const { canvas: c, ctx: x, texture: t, w, h } = _entry;
        x.save();
        x.globalAlpha = 0.09;
        const s = w * 0.52;
        x.drawImage(logoWm, w / 2 - s / 2, h * 0.585 - s / 2, s, s);
        x.restore();
        t.needsUpdate = true;
      };
      logoWm.src = "assets/img/real_madrid_logo.png";
    }

    if (photo) this.bindPhoto(key, photo, { overlay: drawTitleBand });
    return tex;
  }

  /** Stadium artwork for the Bernabéu painting fallback. */
  stadiumArt(kind /* 'old' | 'new' */) {
    const key = kind === "old" ? "bernabeu_old" : "bernabeu_new";
    return this.make(key, 1400, 900, (ctx, w, h) => {
      if (kind === "old") {
        // dusk sky
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "#1a2340"); g.addColorStop(.45, "#4a3a5c"); g.addColorStop(.7, "#c9722f"); g.addColorStop(1, "#1d1408");
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        // classic bowl silhouette, four corner towers
        ctx.fillStyle = "#241a10";
        ctx.fillRect(0, h * .58, w, h * .42);
        ctx.fillStyle = "#170f08";
        [w * .08, w * .34, w * .58, w * .82].forEach((x) => {
          ctx.fillRect(x, h * .34, w * .1, h * .26);
          ctx.fillRect(x - 8, h * .32, w * .1 + 16, 12);
        });
        // white seating band
        ctx.fillStyle = "rgba(240,240,235,.85)";
        ctx.fillRect(0, h * .6, w, h * .05);
        // floodlight glows
        [w * .13, w * .39, w * .63, w * .87].forEach((x) => {
          const gg = ctx.createRadialGradient(x, h * .3, 0, x, h * .3, 130);
          gg.addColorStop(0, "rgba(255,244,200,.95)"); gg.addColorStop(1, "transparent");
          ctx.fillStyle = gg; ctx.fillRect(x - 130, h * .3 - 130, 260, 260);
        });
      } else {
        // night sky, modern steel shell
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "#05070f"); g.addColorStop(.6, "#0d1526"); g.addColorStop(1, "#101b34");
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        // steel louvered facade
        ctx.save();
        ctx.translate(w / 2, h * .56);
        ctx.fillStyle = "#9aa7b5";
        roundRect(ctx, -w * .42, -h * .2, w * .84, h * .42, 30); ctx.fill();
        ctx.fillStyle = "#6e7c8c";
        for (let i = -20; i <= 20; i++) ctx.fillRect(i * (w * .02) - 4, -h * .2, 8, h * .42);
        // blue LED band
        const lg = ctx.createLinearGradient(-w * .42, 0, w * .42, 0);
        lg.addColorStop(0, "#0af0ff"); lg.addColorStop(1, "#2f6bff");
        ctx.fillStyle = lg; ctx.globalAlpha = .9;
        ctx.fillRect(-w * .42, -h * .05, w * .84, 14);
        ctx.restore();
        ctx.globalAlpha = 1;
        // glow
        const gg = ctx.createRadialGradient(w / 2, h * .5, 0, w / 2, h * .5, w * .5);
        gg.addColorStop(0, "rgba(120,180,255,.22)"); gg.addColorStop(1, "transparent");
        ctx.fillStyle = gg; ctx.fillRect(0, 0, w, h);
      }
      // caption strip
      ctx.fillStyle = "rgba(6,8,14,.82)";
      ctx.fillRect(0, h - 74, w, 74);
      ctx.fillStyle = GOLD;
      ctx.font = "600 30px Georgia, serif"; ctx.textAlign = "center";
      ctx.fillText(
        kind === "old" ? "ESTADIO SANTIAGO BERNABÉU — 1947 · The Cathedral" : "SANTIAGO BERNABÉU — 2024 · The Spaceship",
        w / 2, h - 28
      );
    });
  }

  /* ------------------------------------------------------------------ */
  /* Material detail maps                                                */
  /* ------------------------------------------------------------------ */

  /** Fine noise — used as bumpMap for cast/hammered metal. */
  noiseBump(size = 256) {
    return this.make("noise_bump", size, size, (ctx, w, h) => {
      const img = ctx.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        const v = 118 + Math.random() * 20;
        img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      // a few faint dents
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * w, y = Math.random() * h, r = 2 + Math.random() * 5;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(80,80,80,.5)"); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
    }, { linear: true, repeat: [2, 2] });
  }

  /** Vertical polish streaks — used as roughnessMap for burnished silver. */
  streaks(size = 256) {
    return this.make("streak_rough", size, size, (ctx, w, h) => {
      ctx.fillStyle = "#6e6e6e"; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        const x = Math.random() * w;
        const shade = 70 + Math.floor(Math.random() * 90);
        ctx.strokeStyle = `rgba(${shade},${shade},${shade},.35)`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(x, Math.random() * h * .2);
        ctx.bezierCurveTo(x + 8, h * .4, x - 8, h * .7, x, h);
        ctx.stroke();
      }
    }, { linear: true, repeat: [3, 1] });
  }

  /** Gold football pattern — Copa del Rey lid finial. */
  soccerBall() {
    return this.make("soccer_ball", 512, 512, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w * .38, h * .35, 20, w / 2, h / 2, w * .62);
      g.addColorStop(0, "#f4d78a"); g.addColorStop(.6, "#d8b25c"); g.addColorStop(1, "#9c7433");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // pentagon tiling (approximate truncated icosahedron projection)
      const pent = (cx, cy, r, rot) => {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = rot + (i / 5) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
      };
      ctx.fillStyle = "rgba(120,85,20,.55)";
      ctx.strokeStyle = "rgba(90,60,14,.8)"; ctx.lineWidth = 5;
      const centers = [[w * .5, h * .5], [w * .18, h * .3], [w * .82, h * .3],
      [w * .18, h * .72], [w * .82, h * .72], [w * .5, h * .02], [w * .5, h * .98],
      [w * .02, h * .5], [w * .98, h * .5]];
      for (const [cx, cy] of centers) {
        pent(cx, cy, w * .105, 0);
        ctx.fill(); ctx.stroke();
      }
      // seams between patches
      ctx.strokeStyle = "rgba(90,60,14,.35)"; ctx.lineWidth = 3;
      for (const [cx, cy] of centers) {
        for (const [ox, oy] of centers) {
          const d = Math.hypot(cx - ox, cy - oy);
          if (d > w * .3 && d < w * .36) {
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ox, oy); ctx.stroke();
          }
        }
      }
    });
  }

  /** Generic trophy illustration used as fallback photo inside pages and walls. */
  trophyCard(key, title, sub = "") {
    return this.make(key, 768, 1024, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h * .38, 60, w / 2, h * .45, h * .75);
      g.addColorStop(0, "#2a3350"); g.addColorStop(1, "#0b0f1e");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = GOLD; ctx.lineWidth = 8; ctx.strokeRect(12, 12, w - 24, h - 24);
      drawTrophySVGish(ctx, w / 2, h * .18, w * .5, "#e8ecf2", "#9aa4b2");
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 56px Georgia, serif";
      wrapText(ctx, title, w / 2, h * .76, w - 90, 60);
      if (sub) {
        ctx.fillStyle = GOLD_BRIGHT;
        ctx.font = "500 32px Georgia, serif";
        wrapText(ctx, sub, w / 2, h * .9, w - 90, 40);
      }
    });
  }
}

/* ================= helpers ================= */

function keyOf(slug) { return slug; }

export function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  let line = "", yy = y;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word; yy += lineHeight;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
  return yy;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Stylized "big ears" European Cup drawn on a 2D canvas. */
function drawTrophySVGish(ctx, cx, top, size, light, dark) {
  const u = size / 100; // unit
  const y = (v) => top + v * u;
  const metal = ctx.createLinearGradient(cx - 40 * u, 0, cx + 40 * u, 0);
  metal.addColorStop(0, dark); metal.addColorStop(.5, light); metal.addColorStop(1, dark);
  ctx.fillStyle = metal;
  ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1.5;
  // ears
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(cx + s * 26 * u, y(36)); ctx.rotate(s * -0.28);
    ctx.beginPath(); ctx.ellipse(0, 0, 9 * u, 16 * u, 0, 0, Math.PI * 2);
    ctx.strokeStyle = light; ctx.lineWidth = 4.4 * u; ctx.stroke();
    ctx.restore();
  }
  // body
  ctx.beginPath();
  ctx.moveTo(cx - 30 * u, y(52));
  ctx.bezierCurveTo(cx - 34 * u, y(26), cx - 16 * u, y(16), cx - 13 * u, y(6));
  ctx.lineTo(cx + 13 * u, y(6));
  ctx.bezierCurveTo(cx + 16 * u, y(16), cx + 34 * u, y(26), cx + 30 * u, y(52));
  ctx.quadraticCurveTo(cx, y(60), cx - 30 * u, y(52));
  ctx.closePath(); ctx.fill();
  // neck ring
  ctx.fillRect(cx - 14 * u, y(4), 28 * u, 4 * u);
  // stem + base
  ctx.fillRect(cx - 5 * u, y(58), 10 * u, 12 * u);
  ctx.beginPath(); ctx.ellipse(cx, y(74), 22 * u, 6 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#14110c";
  ctx.beginPath(); ctx.ellipse(cx, y(80), 26 * u, 5 * u, 0, 0, Math.PI * 2); ctx.fill();
}
