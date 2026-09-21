// Waving club banners.
//
// The cloth is a finely-tessellated plane whose vertices are displaced in the
// vertex shader (injected into MeshStandardMaterial, so the banners still take
// the museum's lights and shadows). Normals are recomputed analytically from
// the same wave, which is what makes the fabric read as cloth rather than as a
// flat picture that wobbles. Textures are drawn large and sampled with
// anisotropic linear filtering — no pixel-art look anywhere.
import * as THREE from "three";

const WHITE = "#ffffff";
const NAVY = "#00317d";      // club blue
const GOLD = "#c8a44a";
const GOLD_LT = "#f0d489";
const PURPLE = "#4b2a80";    // the morado of the crest band

/* ------------------------------------------------------------------ */
/* crest                                                               */
/* ------------------------------------------------------------------ */

/** Real Madrid's crest: gold-ringed white roundel, interlaced RMCF
 *  monogram in club blue, the mulberry band across the lower right and
 *  the royal crown on top. */
export function drawCrest(ctx, cx, cy, r) {
  ctx.save();
  // respect whatever alpha the caller set (the posters draw this as a faint
  // watermark), instead of overriding it
  const a0 = ctx.globalAlpha;
  // crown
  ctx.save();
  ctx.translate(cx, cy - r * 1.02);
  const cw = r * 1.05, ch = r * 0.52;
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(-cw / 2, ch * 0.42);
  ctx.lineTo(-cw / 2, -ch * 0.06);
  ctx.lineTo(-cw * 0.30, ch * 0.16);
  ctx.lineTo(-cw * 0.12, -ch * 0.34);
  ctx.lineTo(0, ch * 0.10);
  ctx.lineTo(cw * 0.12, -ch * 0.34);
  ctx.lineTo(cw * 0.30, ch * 0.16);
  ctx.lineTo(cw / 2, -ch * 0.06);
  ctx.lineTo(cw / 2, ch * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = GOLD_LT;
  ctx.fillRect(-cw / 2, ch * 0.42, cw, ch * 0.22);
  for (const x of [-cw * 0.12, cw * 0.12, 0]) {
    ctx.beginPath(); ctx.arc(x, -ch * 0.40, r * 0.055, 0, 7); ctx.fill();
  }
  ctx.restore();

  // roundel
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = GOLD; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.935, 0, Math.PI * 2);
  ctx.fillStyle = NAVY; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
  ctx.fillStyle = WHITE; ctx.fill();

  // mulberry band, lower right, clipped to the roundel
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2); ctx.clip();
  ctx.translate(cx, cy); ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = PURPLE;
  ctx.fillRect(-r * 1.4, r * 0.34, r * 2.8, r * 0.26);
  ctx.restore();

  // interlaced RMCF monogram
  ctx.strokeStyle = NAVY;
  ctx.fillStyle = NAVY;
  ctx.lineWidth = r * 0.085;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.font = `700 ${Math.round(r * 1.06)}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.save();
  ctx.translate(cx, cy);
  // the letters overlap the way the real monogram does
  ctx.globalAlpha = a0 * 0.95;
  ctx.fillText("M", 0, r * 0.02);
  ctx.font = `700 ${Math.round(r * 0.82)}px Georgia, serif`;
  ctx.fillText("R", -r * 0.40, -r * 0.10);
  ctx.fillText("C", r * 0.36, r * 0.16);
  ctx.font = `700 ${Math.round(r * 0.66)}px Georgia, serif`;
  ctx.fillText("F", r * 0.05, r * 0.46);
  ctx.restore();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* banner artwork                                                      */
/* ------------------------------------------------------------------ */

function bannerTexture(lib, key, variant) {
  return lib.make(key, 768, 1536, (ctx, w, h) => {
    const dark = variant === "navy";
    const field = dark ? "#0b1f4d" : "#f7f7f4";
    const ink = dark ? "#f2f4fb" : NAVY;

    // cloth field with a soft vertical weave
    ctx.fillStyle = field; ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, "rgba(0,0,0,.10)");
    g.addColorStop(0.5, "rgba(255,255,255,.06)");
    g.addColorStop(1, "rgba(0,0,0,.10)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = dark ? 0.10 : 0.055;
    for (let x = 0; x < w; x += 3) {
      ctx.fillStyle = x % 6 ? "#000" : "#fff";
      ctx.fillRect(x, 0, 1.4, h);
    }
    ctx.globalAlpha = 1;

    // border
    ctx.strokeStyle = GOLD; ctx.lineWidth = 12;
    ctx.strokeRect(26, 26, w - 52, h - 52);
    ctx.strokeStyle = dark ? "rgba(240,212,137,.5)" : "rgba(0,49,125,.45)";
    ctx.lineWidth = 4;
    ctx.strokeRect(48, 48, w - 96, h - 96);

    // header bar
    ctx.fillStyle = dark ? GOLD : NAVY;
    ctx.fillRect(48, 48, w - 96, 108);
    ctx.fillStyle = dark ? "#0b1f4d" : GOLD_LT;
    ctx.font = '700 52px Georgia, serif';
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.letterSpacing = "10px";
    ctx.fillText("REAL MADRID C.F.", w / 2, 104);
    ctx.letterSpacing = "0px";

    drawCrest(ctx, w / 2, h * 0.40, w * 0.29);

    ctx.fillStyle = ink;
    ctx.font = '700 104px Georgia, serif';
    ctx.fillText("HALA", w / 2, h * 0.645);
    ctx.fillText("MADRID", w / 2, h * 0.715);
    ctx.font = 'italic 46px Georgia, serif';
    ctx.fillStyle = dark ? "rgba(240,244,251,.75)" : "rgba(0,49,125,.7)";
    ctx.fillText("y nada más", w / 2, h * 0.775);

    // fifteen stars for fifteen European Cups
    ctx.fillStyle = GOLD;
    const star = (x, y, rr) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 ? rr * 0.44 : rr;
        ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      ctx.closePath(); ctx.fill();
    };
    for (let i = 0; i < 15; i++) {
      const col = i % 8, row = (i / 8) | 0;
      const n = row === 0 ? 8 : 7;
      star(w / 2 + (col - (n - 1) / 2) * 62, h * 0.845 + row * 62, 20);
    }
    ctx.fillStyle = ink;
    ctx.font = '700 44px Georgia, serif';
    ctx.letterSpacing = "6px";
    ctx.fillText("15 COPAS DE EUROPA", w / 2, h * 0.945);
    ctx.letterSpacing = "0px";
  });
}

/* ------------------------------------------------------------------ */
/* cloth material                                                      */
/* ------------------------------------------------------------------ */

const clock = { t: 0 };
const uniforms = [];

function clothMaterial(map, seed) {
  const mat = new THREE.MeshStandardMaterial({
    map, side: THREE.DoubleSide, roughness: 0.82, metalness: 0.0,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uSeed = { value: seed };
    uniforms.push(shader.uniforms.uTime);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `
        #include <common>
        uniform float uTime;
        uniform float uSeed;
        // hanging cloth: still at the top rod, freer toward the hem
        vec3 wave(vec2 uv) {
          float slack = pow(1.0 - uv.y, 1.35);
          float edge  = 0.45 + 0.55 * abs(uv.x - 0.5) * 2.0;
          float p1 = sin(uv.x * 7.0 + uv.y * 2.2 - uTime * 1.7 + uSeed);
          float p2 = sin(uv.x * 3.1 - uv.y * 4.0 + uTime * 1.15 + uSeed * 1.7);
          float z  = (p1 * 0.42 + p2 * 0.58) * slack * edge * 0.12;
          // analytic slopes so the shading ripples with the cloth
          float dx = (cos(uv.x * 7.0 + uv.y * 2.2 - uTime * 1.7 + uSeed) * 7.0 * 0.42
                    + cos(uv.x * 3.1 - uv.y * 4.0 + uTime * 1.15 + uSeed * 1.7) * 3.1 * 0.58)
                    * slack * edge * 0.12;
          float dy = (cos(uv.x * 7.0 + uv.y * 2.2 - uTime * 1.7 + uSeed) * 2.2 * 0.42
                    - cos(uv.x * 3.1 - uv.y * 4.0 + uTime * 1.15 + uSeed * 1.7) * 4.0 * 0.58)
                    * slack * edge * 0.12;
          return vec3(z, dx, dy);
        }
      `)
      .replace("#include <beginnormal_vertex>", `
        vec3 w0 = wave(uv);
        vec3 objectNormal = normalize(vec3(-w0.y, -w0.z, 1.0));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3( tangent.xyz );
        #endif
      `)
      .replace("#include <begin_vertex>", `
        vec3 transformed = vec3(position);
        transformed.z += w0.x;
        // the hem swings slightly toward the viewer as it lifts
        transformed.y -= abs(w0.x) * 0.25 * pow(1.0 - uv.y, 2.0);
      `);
  };
  return mat;
}

/* ------------------------------------------------------------------ */
/* build                                                               */
/* ------------------------------------------------------------------ */

/** Hang the club banners around the hall. Returns { group, update }. */
export function buildFlags(lib, ROOM) {
  const group = new THREE.Group();
  const white = bannerTexture(lib, "banner_white", "white");
  const navy = bannerTexture(lib, "banner_navy", "navy");

  const rodMat = new THREE.MeshStandardMaterial({ color: 0xc9a96a, metalness: 0.9, roughness: 0.28 });

  let n = 0;
  const hang = (x, y, z, rotY, w = 1.5, h = 3.1, variant = "white") => {
    const b = new THREE.Group();
    b.position.set(x, y, z);
    b.rotation.y = rotY;

    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h, 34, 60),
      clothMaterial(variant === "navy" ? navy : white, n * 1.9)
    );
    cloth.castShadow = true;
    cloth.receiveShadow = true;
    b.add(cloth);

    // rod + finials the banner hangs from
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, w + 0.34, 16), rodMat);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, h / 2 + 0.06, 0.03);
    rod.castShadow = true;
    b.add(rod);
    for (const s of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), rodMat);
      cap.position.set(s * (w / 2 + 0.17), h / 2 + 0.06, 0.03);
      b.add(cap);
      const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.26, 10), rodMat);
      brace.rotation.x = Math.PI / 2;
      brace.position.set(s * (w / 2 + 0.05), h / 2 + 0.06, -0.10);
      b.add(brace);
    }
    group.add(b);
    n++;
    return b;
  };

  const yTop = 4.9;
  // north and south walls, between the wall posters
  for (const x of [-17.2, -0.6, 6.4]) {
    hang(x, yTop - 1.55, ROOM.z0 + 0.35, 0, 1.5, 3.1, x === -0.6 ? "navy" : "white");
    hang(x, yTop - 1.55, ROOM.z1 - 0.35, Math.PI, 1.5, 3.1, x === -0.6 ? "navy" : "white");
  }
  // flanking the statue on the east wall
  for (const z of [-4.4, 4.4]) {
    hang(ROOM.x1 - 0.35, yTop - 1.35, z, -Math.PI / 2, 1.7, 3.5, "navy");
  }
  // either side of the entrance doors on the west wall
  for (const z of [-6.6, 6.6]) {
    hang(ROOM.x0 + 0.35, yTop - 1.55, z, Math.PI / 2, 1.5, 3.1, "white");
  }

  function update(t) {
    clock.t = t;
    for (const u of uniforms) u.value = t;
  }

  return { group, update };
}
