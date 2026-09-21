// Collision suite.
//   1. no position pops on any route
//   2. nothing solid can be walked through — checked against each prop's own
//      bounding box, so a missing collider fails the test
//   3. if the player ever ends up inside something, they walk out smoothly
import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", headless: true,
  args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"] });
const p = await b.newPage({ viewport: { width: 900, height: 600 } });
p.on("pageerror", e => console.log("pageerror:", e.message));
await p.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await p.waitForFunction(() => window.__museum, null, { timeout: 30000 });
await p.waitForTimeout(2500);                   // let the statue models land
await p.evaluate(() => window.__museum.enter());

const r = await p.evaluate(() => {
  const M = window.__museum, c = M.controls, THREE = M.THREE;
  const dt = 1 / 60;
  const out = { routes: 0, pops: 0, biggestPop: 0, solidProps: 0,
                walkedThrough: [], ended_inside: 0,
                stuck_cases: 0, stuck_escaped: 0, worstStuckStep: 0 };

  // the props that claim to be solid, by their real geometry
  const props = [];
  M.scene.traverse((o) => {
    if (!o.userData.solid) return;
    const box = new THREE.Box3().setFromObject(o);
    if (!box.isEmpty()) props.push({ name: o.name || o.type, box });
  });
  out.solidProps = props.length;

  const penetration = (pos) => {
    let worst = 0, who = null;
    for (const { name, box } of props) {
      const dx = Math.min(pos.x - box.min.x, box.max.x - pos.x);
      const dz = Math.min(pos.z - box.min.z, box.max.z - pos.z);
      if (dx > 0 && dz > 0) {
        const d = Math.min(dx, dz);
        if (d > worst) { worst = d; who = name; }
      }
    }
    return { worst, who };
  };

  const inCollider = (pos) => c.colliders.some(box => box.max.y >= 0.35 &&
    pos.x > box.min.x - 0.30 && pos.x < box.max.x + 0.30 &&
    pos.z > box.min.z - 0.30 && pos.z < box.max.z + 0.30);

  const MAX = 7.2 * dt * 1.6 + 0.02;

  // 0: broad sweep — every heading from a grid across the whole floor
  for (let x = -19; x <= 19; x += 1.5) {
    for (let z = -12; z <= 12; z += 1.5) {
      for (let a = 0; a < 6; a++) {
        c.setPose(x, z, (a / 6) * Math.PI * 2);
        c.vel.set(0, 0, 0); c.keys.clear();
        if (inCollider(c.pos) || penetration(c.pos).worst > 0) continue;
        out.routes++;
        c.keys.add("forward"); c.keys.add("sprint");
        if (a % 2) c.keys.add("right");
        let prev = c.pos.clone();
        for (let i = 0; i < 70; i++) {
          M.step(dt, 1);
          const d = Math.hypot(c.pos.x - prev.x, c.pos.z - prev.z);
          if (d > MAX) { out.pops++; out.biggestPop = Math.max(out.biggestPop, d); }
          prev.copy(c.pos);
        }
        c.keys.clear();
        if (inCollider(c.pos)) out.ended_inside++;
        const pen = penetration(c.pos);
        if (pen.worst > 0.02) out.walkedThrough.push({ prop: pen.who, into: +pen.worst.toFixed(2) });
      }
    }
  }

  // 1+2: charge every solid prop from 16 directions, sprinting
  for (const { name, box } of props) {
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
    const reach = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2 + 4;
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const sx = cx + Math.sin(ang) * reach, sz = cz + Math.cos(ang) * reach;
      if (sx < -19 || sx > 19 || sz < -12 || sz > 12) continue;
      c.setPose(sx, sz, Math.atan2(-(cx - sx), -(cz - sz)));   // face the prop
      c.vel.set(0, 0, 0); c.keys.clear();
      // only judge routes that begin in clear space
      if (inCollider(c.pos) || penetration(c.pos).worst > 0) continue;
      out.routes++;
      c.keys.add("forward"); c.keys.add("sprint");
      if (a % 3 === 0) c.keys.add("right");                    // graze the corners too
      let prev = c.pos.clone(), deepest = 0, culprit = null;
      for (let i = 0; i < 120; i++) {
        M.step(dt, 1);
        const d = Math.hypot(c.pos.x - prev.x, c.pos.z - prev.z);
        if (d > MAX) {
          out.pops++;
          out.biggestPop = Math.max(out.biggestPop, d);
          if (out.popWhere = out.popWhere || [], out.popWhere.length < 6) {
            out.popWhere.push({ from: [+prev.x.toFixed(2), +prev.z.toFixed(2)],
                                to: [+c.pos.x.toFixed(2), +c.pos.z.toFixed(2)], d: +d.toFixed(2) });
          }
        }
        const pen = penetration(c.pos);
        if (pen.worst > deepest) { deepest = pen.worst; culprit = pen.who; }
        prev.copy(c.pos);
      }
      c.keys.clear();
      if (deepest > 0.02) out.walkedThrough.push({ prop: name, into: +deepest.toFixed(2) });
      if (inCollider(c.pos)) out.ended_inside++;
    }
  }

  // 3: dropped inside each collider, walk out gracefully
  for (const box of c.colliders) {
    if (box.max.y < 0.35) continue;
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
    if (cx < -19 || cx > 19 || cz < -12 || cz > 12) continue;
    out.stuck_cases++;
    c.setPose(cx, cz, 0); c.vel.set(0, 0, 0); c.keys.clear();
    let prev = c.pos.clone(), worst = 0;
    for (let i = 0; i < 300; i++) {
      M.step(dt, 1);
      worst = Math.max(worst, Math.hypot(c.pos.x - prev.x, c.pos.z - prev.z));
      prev.copy(c.pos);
    }
    if (worst > out.worstStuckStep) { out.worstStuckStep = worst; out.worstStuckBox = [+cx.toFixed(1), +cz.toFixed(1)]; }
    if (!inCollider(c.pos)) out.stuck_escaped++;
  }
  c.keys.clear();
  // collapse duplicates
  const seen = {};
  out.walkedThrough = out.walkedThrough.filter(w => {
    const k = w.prop + w.into;
    return seen[k] ? false : (seen[k] = true);
  });
  return out;
});
console.log(JSON.stringify(r, null, 1));
await b.close();
