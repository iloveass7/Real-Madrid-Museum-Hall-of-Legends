// The four trophies, rebuilt from their real silhouettes.
//
//   · UEFA Champions League — "la Orejona": deep bowl, wide flared lip and
//     the two enormous flat scroll handles that give it its nickname.
//   · LaLiga — slender silver amphora on a tall stem, ridged flared mouth.
//   · Copa del Rey — fluted bowl, angular handles, tall stepped lid.
//   · Supercopa de España — wide shallow dish on a slim waisted stem.
//
// Each is a lathed body (so the profile is the design), with handles built as
// flat ribbons extruded along a curve rather than plain torus sections.
import * as THREE from "three";
import { createMetalMaterial, createSurfaceMaterial } from "./shaders.js";

const SILVER = { color: 0xeef2f7, metalness: 0.88, roughness: 0.24 };
const SILVER_DK = { color: 0xc4ccd8, metalness: 0.85, roughness: 0.32 };
const GOLD = { color: 0xe6c072, metalness: 0.92, roughness: 0.3 };
const MARBLE_DARK = { color: 0x15141a, roughness: 0.3, metalness: 0.25 };

let matCache = null;
function mats() {
  if (!matCache) {
    matCache = {
      silver: createMetalMaterial({ ...SILVER, side: THREE.DoubleSide }),
      silverSolid: createMetalMaterial(SILVER),
      silverDk: createMetalMaterial(SILVER_DK),
      gold: createMetalMaterial(GOLD),
      base: createSurfaceMaterial(MARBLE_DARK),
    };
  }
  return matCache;
}

const lathe = (pts, mat, segs = 64) =>
  new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0005), y)), segs), mat);

/** A flat metal ribbon swept along a 3D curve — used for every handle. */
function ribbon(points, width, thickness, mat, closedEnds = true) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  // shape X runs along the curve's normal (in the plane of the sweep) and
  // shape Y along the binormal — so the ribbon's *width* is X, giving a flat
  // scroll seen broadside, like the real handles.
  const shape = new THREE.Shape();
  const w = width / 2, t = thickness / 2;
  shape.moveTo(-w, -t); shape.lineTo(w, -t); shape.lineTo(w, t); shape.lineTo(-w, t);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    extrudePath: curve, steps: 64, bevelEnabled: false, curveSegments: 8,
  });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

function plinth(rTop, rBot, h, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 40), mat);
  m.position.y = -h / 2;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/* ============================================================ UCL */

/** The European Cup. Everything is proportioned off the real trophy:
 *  73 cm tall, the bowl as deep as it is wide, and handles that stand
 *  clear of the body by more than half its radius. */
export function createEuropeanCup(scale = 1) {
  const g = new THREE.Group();
  const M = mats();

  // body profile, bottom (0) to lip (0.86) in trophy units
  const body = lathe([
    [0.00, 0.000], [0.255, 0.000], [0.275, 0.022], [0.262, 0.050],
    [0.150, 0.072], [0.112, 0.105], [0.098, 0.150],   // waisted stem
    [0.112, 0.195], [0.152, 0.250], [0.212, 0.320],   // bowl swells
    [0.272, 0.410], [0.312, 0.500], [0.336, 0.590],
    [0.352, 0.670], [0.366, 0.735], [0.392, 0.792],   // the wide flared lip
    [0.406, 0.828], [0.398, 0.845], [0.372, 0.836],
    [0.358, 0.800], [0.344, 0.740], [0.330, 0.660],   // inner wall back down
    [0.300, 0.540], [0.250, 0.430], [0.190, 0.340],
  ], M.silver);
  body.castShadow = true;
  g.add(body);

  // the ears: flat scrolls springing from under the lip, bulging well clear
  // of the bowl and curling back into the waist
  for (const s of [-1, 1]) {
    const ear = ribbon([
      [s * 0.330, 0.816, 0],
      [s * 0.540, 0.800, 0],
      [s * 0.672, 0.688, 0],
      [s * 0.700, 0.520, 0],
      [s * 0.620, 0.370, 0],
      [s * 0.450, 0.280, 0],
      [s * 0.300, 0.250, 0],
      [s * 0.205, 0.300, 0],
    ], 0.150, 0.034, M.silverSolid);
    g.add(ear);
  }

  // engraved band below the lip
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.354, 0.010, 10, 64), M.silverDk);
  band.position.y = 0.700; band.rotation.x = Math.PI / 2;
  g.add(band);

  g.add(plinth(0.255, 0.300, 0.10, M.base));
  g.scale.setScalar(scale);
  return g;
}

/* ============================================================ LaLiga */

export function createLaLigaTrophy(scale = 1) {
  const g = new THREE.Group();
  const M = mats();

  const body = lathe([
    [0.00, 0.000], [0.210, 0.000], [0.222, 0.030], [0.200, 0.058],
    [0.090, 0.085], [0.062, 0.140], [0.055, 0.210],     // long slim stem
    [0.075, 0.270], [0.130, 0.330], [0.196, 0.405],     // amphora body
    [0.232, 0.490], [0.240, 0.570], [0.222, 0.640],
    [0.186, 0.690], [0.168, 0.730], [0.196, 0.790],     // neck, then flared mouth
    [0.236, 0.845], [0.246, 0.872], [0.232, 0.878],
    [0.214, 0.850], [0.178, 0.795], [0.152, 0.735],
    [0.150, 0.690], [0.170, 0.640], [0.150, 0.520],
  ], M.silver);
  body.castShadow = true;
  g.add(body);

  // ridged collar under the mouth
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.176 + i * 0.006, 0.0075, 8, 56), M.silverDk);
    r.position.y = 0.700 + i * 0.022; r.rotation.x = Math.PI / 2;
    g.add(r);
  }
  // twin scroll handles from the shoulder down to the waist
  for (const s of [-1, 1]) {
    g.add(ribbon([
      [s * 0.180, 0.700, 0], [s * 0.310, 0.672, 0], [s * 0.372, 0.580, 0],
      [s * 0.352, 0.470, 0], [s * 0.262, 0.418, 0], [s * 0.180, 0.408, 0],
    ], 0.056, 0.022, M.silverSolid));
  }
  // gold crest medallion on the belly
  const med = new THREE.Mesh(new THREE.CircleGeometry(0.070, 32), M.gold);
  med.position.set(0, 0.520, 0.236); g.add(med);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.008, 8, 32), M.gold);
  ring.position.copy(med.position); g.add(ring);

  g.add(plinth(0.210, 0.258, 0.095, M.base));
  g.scale.setScalar(scale);
  return g;
}

/* ============================================================ Copa del Rey */

export function createCopaTrophy(scale = 1) {
  const g = new THREE.Group();
  const M = mats();

  const body = lathe([
    [0.00, 0.000], [0.235, 0.000], [0.250, 0.028], [0.232, 0.055],
    [0.110, 0.082], [0.088, 0.140], [0.108, 0.198],
    [0.185, 0.255], [0.240, 0.320], [0.268, 0.395],     // deep fluted bowl
    [0.276, 0.470], [0.268, 0.530], [0.252, 0.566],
    [0.240, 0.560], [0.244, 0.510], [0.236, 0.430],
    [0.200, 0.340], [0.150, 0.270],
  ], M.silver);
  body.castShadow = true;
  g.add(body);

  // a chased band where the real cup is fluted
  for (let i = 0; i < 2; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2705 - i * 0.004, 0.009, 10, 64), M.silverDk);
    ring.position.y = 0.415 + i * 0.075;
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }

  // angular handles
  for (const s of [-1, 1]) {
    g.add(ribbon([
      [s * 0.250, 0.545, 0], [s * 0.400, 0.540, 0], [s * 0.452, 0.455, 0],
      [s * 0.430, 0.360, 0], [s * 0.330, 0.310, 0], [s * 0.230, 0.300, 0],
    ], 0.064, 0.024, M.silverSolid));
  }

  // tall stepped lid with a finial — the Copa's signature
  const lid = lathe([
    [0.000, 0.566], [0.250, 0.566], [0.256, 0.588], [0.232, 0.604],
    [0.214, 0.628], [0.220, 0.652], [0.186, 0.672], [0.150, 0.716],
    [0.108, 0.768], [0.062, 0.820], [0.030, 0.856], [0.000, 0.872],
  ], M.silverSolid);
  lid.castShadow = true;
  g.add(lid);
  const knobStem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.020, 0.040, 14), M.gold);
  knobStem.position.y = 0.890; g.add(knobStem);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.038, 24, 18), M.gold);
  knob.position.y = 0.928; knob.castShadow = true; g.add(knob);

  g.add(plinth(0.235, 0.282, 0.095, M.base));
  g.scale.setScalar(scale);
  return g;
}

/* ============================================================ Supercopa */

export function createSupercopaTrophy(scale = 1) {
  const g = new THREE.Group();
  const M = mats();

  const body = lathe([
    [0.00, 0.000], [0.190, 0.000], [0.202, 0.026], [0.182, 0.052],
    [0.072, 0.080], [0.052, 0.170], [0.050, 0.280],     // tall slim waist
    [0.078, 0.340], [0.150, 0.396], [0.240, 0.452],     // wide shallow dish
    [0.316, 0.518], [0.348, 0.572], [0.352, 0.596],
    [0.336, 0.598], [0.300, 0.552], [0.236, 0.492],
    [0.160, 0.440], [0.100, 0.400],
  ], M.silver);
  body.castShadow = true;
  g.add(body);

  // gold band at the waist + open loop handles either side of the dish
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.014, 10, 40), M.gold);
  band.position.y = 0.300; band.rotation.x = Math.PI / 2;
  g.add(band);
  for (const s of [-1, 1]) {
    g.add(ribbon([
      [s * 0.330, 0.560, 0], [s * 0.452, 0.520, 0], [s * 0.472, 0.430, 0],
      [s * 0.396, 0.370, 0], [s * 0.280, 0.372, 0], [s * 0.180, 0.412, 0],
    ], 0.050, 0.020, M.silverSolid));
  }

  g.add(plinth(0.190, 0.232, 0.090, M.base));
  g.scale.setScalar(scale);
  return g;
}
