// Exhibits: UCL trophy wall, domestic trophies, Cristiano Ronaldo statue
// (with animated spotlights), and the old/new Santiago Bernabéu painting.
import * as THREE from "three";
import {
  createEuropeanCup, createLaLigaTrophy, createCopaTrophy, createSupercopaTrophy,
} from "./trophies.js";

const SILVER = { color: 0xdfe4ec, metalness: 1.0, roughness: 0.16 };
const GOLD = { color: 0xd8b25c, metalness: 0.95, roughness: 0.28 };
const MARBLE_DARK = { color: 0x17161c, roughness: 0.28, metalness: 0.25 };

function mesh(geo, matProps, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(matProps));
  m.position.set(x, y, z);
  return m;
}

/* trophies now live in trophies.js, modelled from the real silhouettes */
export {
  createEuropeanCup, createLaLigaTrophy, createCopaTrophy, createSupercopaTrophy,
} from "./trophies.js";

/* ============================================================ pedestals */

function pedestal(lib, w, h, d, title, sub) {
  const g = new THREE.Group();
  // tagged so main.js derives a collider straight from the geometry — this is
  // how the centrepiece cup ended up walk-through-able when the collider
  // boxes were written out by hand
  g.userData.solid = true;
  g.name = `pedestal:${title}`;
  const wood = new THREE.MeshStandardMaterial({ map: lib.wood(), roughness: 0.5 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood);
  box.position.y = h / 2;
  box.castShadow = true; box.receiveShadow = true;
  g.add(box);
  const cap = mesh(new THREE.BoxGeometry(w + 0.08, 0.05, d + 0.08), MARBLE_DARK, 0, h + 0.025, 0);
  cap.castShadow = true;
  g.add(cap);
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(w - 0.15, 1.15), 0.3),
    new THREE.MeshStandardMaterial({ map: lib.plaque(title, sub), roughness: 0.6 })
  );
  plaque.position.set(0, h * 0.62, d / 2 + 0.012);
  g.add(plaque);
  return g;
}

/* ============================================================ UCL wall */

export function buildUCLExhibit(lib, anchor) {
  const g = new THREE.Group();
  g.position.copy(anchor);
  const wood = new THREE.MeshStandardMaterial({ map: lib.wood(), roughness: 0.5 });
  const matGold = new THREE.MeshStandardMaterial({ color: 0xc9a96a, metalness: 0.85, roughness: 0.3 });

  // backboard
  const back = new THREE.Mesh(new THREE.BoxGeometry(15.4, 4.4, 0.22), wood);
  back.position.set(0, 2.3, -0.75);
  back.receiveShadow = true;
  back.userData.solid = true;
  back.name = "ucl-backboard";
  g.add(back);
  // gold trim
  const trimTop = mesh(new THREE.BoxGeometry(15.4, 0.08, 0.26), { color: 0xc9a96a, metalness: 0.85, roughness: 0.3 }, 0, 4.44, -0.75);
  const trimBot = trimTop.clone(); trimBot.position.y = 0.18;
  g.add(trimTop, trimBot);

  // header
  const header = new THREE.Mesh(
    new THREE.PlaneGeometry(9.5, 0.85),
    new THREE.MeshStandardMaterial({ map: lib.plaque("KINGS OF EUROPE", "15 × European Cup / UEFA Champions League"), roughness: 0.55 })
  );
  header.position.set(0, 3.85, -0.62);
  g.add(header);

  // shelves with the 15 cups
  const shelfGeo = new THREE.BoxGeometry(14.6, 0.07, 0.62);
  const shelfYs = [1.45, 2.55];
  const startX = [-6.3, -5.4];
  const counts = [8, 7];
  let idx = 0;
  const YEARS = [1956, 1957, 1958, 1959, 1960, 1966, 1998, 2000, 2002, 2014, 2016, 2017, 2018, 2022, 2024];
  for (let row = 0; row < 2; row++) {
    const shelf = new THREE.Mesh(shelfGeo, wood);
    shelf.position.set(0, shelfYs[row], -0.45);
    shelf.castShadow = true; shelf.receiveShadow = true;
    g.add(shelf);
    for (let i = 0; i < counts[row]; i++) {
      const cup = createEuropeanCup(0.5);
      const x = startX[row] + i * ((row === 0 ? 12.6 : 10.8) / (counts[row] - 1));
      cup.position.set(x, shelfYs[row] + 0.055, -0.45);
      g.add(cup);
      // year chip on shelf edge
      const chip = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.16),
        new THREE.MeshStandardMaterial({ map: lib.make(`chip${YEARS[idx]}`, 256, 64, (ctx, w, h) => {
          ctx.fillStyle = "#1c1508"; ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = "#c9a96a"; ctx.lineWidth = 5; ctx.strokeRect(3, 3, w - 6, h - 6);
          ctx.fillStyle = "#f0d489"; ctx.font = "700 40px Georgia, serif";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(String(YEARS[idx]), w / 2, h / 2 + 2);
        }), roughness: 0.5 })
      );
      chip.position.set(x, shelfYs[row] + 0.02, -0.1);
      g.add(chip);
      idx++;
    }
  }

  // giant centerpiece on its own pedestal in front
  const ped = pedestal(lib, 1.5, 1.05, 1.5, "LA DECIMOQUINTA", "Wembley 2024");
  ped.position.set(0, 0, 1.0);
  g.add(ped);
  const big = createEuropeanCup(1.35);
  big.position.set(0, 1.24, 1.0);
  g.add(big);

  // accent lighting for the unit
  for (const x of [-5, 0, 5]) {
    const spot = new THREE.SpotLight(0xffe9c4, 42, 12, Math.PI / 6, 0.5, 1.8);
    spot.position.set(x * 0.8 + 0, 5.6, 2.4);
    spot.target.position.set(x, 2.2, -0.6);
    g.add(spot, spot.target);
  }

  // interaction volume
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(16, 4.6, 3.4),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.set(0, 2.2, 0.2);
  g.add(hit);

  const colliders = [new THREE.Box3(
    new THREE.Vector3(anchor.x - 7.7, 0, anchor.z - 1.6),
    new THREE.Vector3(anchor.x + 7.7, 4.6, anchor.z + 0.55)
  )];
  return { group: g, hit, colliders };
}

/* ============================================================ domestic */

export function buildDomesticExhibit(lib, anchor) {
  const g = new THREE.Group();
  g.position.copy(anchor);

  const header = new THREE.Mesh(
    new THREE.PlaneGeometry(10.5, 0.8),
    new THREE.MeshStandardMaterial({ map: lib.plaque("DOMESTIC HONOURS", "La Liga · Copa del Rey · Supercopa"), roughness: 0.55 })
  );
  header.position.set(0, 3.5, 0.85);
  header.rotation.y = Math.PI;
  g.add(header);

  const defs = [
    { x: -4.6, trophy: createLaLigaTrophy(1.15), title: "LA LIGA", sub: "36 titles" },
    { x: 0, trophy: createCopaTrophy(1.15), title: "COPA DEL REY", sub: "20 titles" },
    { x: 4.6, trophy: createSupercopaTrophy(1.15), title: "SUPERCOPA", sub: "13 titles" },
  ];
  for (const d of defs) {
    const ped = pedestal(lib, 1.15, 1.05, 1.15, d.title, d.sub);
    ped.position.set(d.x, 0, 0);
    ped.rotation.y = Math.PI; // plaque faces the room
    g.add(ped);
    d.trophy.position.set(d.x, 1.16, 0);
    g.add(d.trophy);
    const spot = new THREE.SpotLight(0xfff0d4, 30, 10, Math.PI / 6.2, 0.5, 1.8);
    spot.position.set(d.x, 5.4, -1.6);
    spot.target.position.set(d.x, 1.4, 0);
    g.add(spot, spot.target);
  }

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(11.5, 3.4, 2.6),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.set(0, 1.7, 0);
  g.add(hit);

  const colliders = [new THREE.Box3(
    new THREE.Vector3(anchor.x - 5.4, 0, anchor.z - 1.05),
    new THREE.Vector3(anchor.x + 5.4, 2.2, anchor.z + 0.65)
  )];
  return { group: g, hit, colliders };
}

/* ============================================================ painting */

export function buildPainting(lib, anchor) {
  const g = new THREE.Group();
  g.position.copy(anchor);
  g.rotation.y = Math.PI / 2; // face +x into the hall

  const frameOuter = mesh(new THREE.BoxGeometry(4.1, 2.75, 0.14), { color: 0x2a2118, roughness: 0.5 }, 0, 0, 0);
  frameOuter.castShadow = true;
  g.add(frameOuter);
  const innerTrim = mesh(new THREE.BoxGeometry(3.76, 2.42, 0.16), { color: 0xc9a96a, metalness: 0.8, roughness: 0.32 }, 0, 0, 0.005);
  g.add(innerTrim);

  const texOld = lib.stadiumArt("old");
  const texNew = lib.stadiumArt("new");

  const planeOld = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 2.3),
    new THREE.MeshStandardMaterial({ map: texOld, roughness: 0.72 })
  );
  planeOld.position.z = 0.095;
  g.add(planeOld);

  const planeNew = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 2.3),
    new THREE.MeshStandardMaterial({ map: texNew, roughness: 0.72, transparent: true, opacity: 0 })
  );
  planeNew.position.z = 0.105;
  g.add(planeNew);

  // glass sheen
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 2.3),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, roughness: 0.05, metalness: 0 })
  );
  glass.position.z = 0.115;
  g.add(glass);

  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.42),
    new THREE.MeshStandardMaterial({ map: lib.plaque("SANTIAGO BERNABÉU", "1947 → 2024 — touch to travel in time"), roughness: 0.6 })
  );
  plaque.position.set(0, -1.75, 0.05);
  g.add(plaque);

  // picture light
  const lamp = new THREE.PointLight(0xffe7bd, 14, 6.5, 1.8);
  lamp.position.set(0, 1.9, 0.9);
  g.add(lamp);
  const lampBar = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 10), { color: 0xc9a96a, metalness: 0.85, roughness: 0.3 }, 0, 1.62, 0.28);
  lampBar.rotation.z = Math.PI / 2;
  g.add(lampBar);

  const hit = new THREE.Mesh(new THREE.BoxGeometry(4.3, 3.0, 0.7), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.z = 0.15;
  g.add(hit);

  let showNew = false;
  let fade = 0; // 0 = old, 1 = new
  function toggle() { showNew = !showNew; return showNew; }
  function update(dt) {
    const tgt = showNew ? 1 : 0;
    if (Math.abs(fade - tgt) > 0.001) {
      fade += Math.sign(tgt - fade) * dt * 1.6;
      fade = THREE.MathUtils.clamp(fade, 0, 1);
      planeNew.material.opacity = fade;
      planeOld.material.transparent = true;
      planeOld.material.opacity = 1 - fade * 0.0; // new covers old; keep old fully opaque
      lamp.intensity = 14 + Math.sin(fade * Math.PI) * 26; // pulse while morphing
    }
  }

  return { group: g, hit, colliders: [], toggle, update, isNew: () => showNew };
}
