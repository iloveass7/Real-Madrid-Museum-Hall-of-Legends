// CR7 monument — built from real downloaded 3D models, not primitives.
//
//   body : Xbot.glb          (Mixamo rigged humanoid, three.js sample asset)
//   head : LeePerrySmith.glb (photo-scanned human head, three.js sample asset)
//
// Both are edited here: the body is re-posed through its skeleton into the
// "Siuu" landing stance and dressed in carved kit geometry, and the scanned
// head is cut at the neck, re-proportioned toward Ronaldo's squarer jaw /
// heavier brow and given his swept-up quiff. Everything is then rendered in
// a single weathered-stone material so it reads as one carved monument.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

// resolved against this module so it works from any page depth
const MODELS = new URL("../../assets/models/", import.meta.url).href;

/* ------------------------------------------------------------------ */
/* stone material                                                      */
/* ------------------------------------------------------------------ */

function stoneMaps(lib) {
  // fine granular relief + larger chisel facets
  const bump = lib.make("stone_bump", 512, 512, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const v = 120 + Math.random() * 26;
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 4 + Math.random() * 26;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const dark = Math.random() > 0.5;
      g.addColorStop(0, dark ? "rgba(70,70,70,.35)" : "rgba(210,210,210,.35)");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
  }, { linear: true, repeat: [3, 3] });

  const albedo = lib.make("stone_albedo", 512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#cfc8b8"; ctx.fillRect(0, 0, w, h);
    // soft marble veining / weather staining
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = `rgba(${140 + Math.random() * 40 | 0},${134 + Math.random() * 40 | 0},${120 + Math.random() * 40 | 0},.18)`;
      ctx.lineWidth = 1 + Math.random() * 7;
      ctx.beginPath();
      let x = Math.random() * w, y = 0;
      ctx.moveTo(x, y);
      while (y < h) { x += (Math.random() - 0.5) * 60; y += 30; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = `rgba(${90 + Math.random() * 60 | 0},${88 + Math.random() * 55 | 0},${80 + Math.random() * 50 | 0},.10)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
  }, { repeat: [2, 2] });

  return { bump, albedo };
}

export function stoneMaterial(lib, { color = 0xcbc4b4, rough = 0.86, bumpScale = 0.0016 } = {}) {
  const { bump, albedo } = stoneMaps(lib);
  return new THREE.MeshStandardMaterial({
    color, map: albedo, bumpMap: bump, bumpScale,
    roughness: rough, metalness: 0.02,
  });
}

/* ------------------------------------------------------------------ */
/* skeleton posing helpers                                             */
/* ------------------------------------------------------------------ */

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Rotate `bone` so the segment running to its first child bone points along
 *  `dir` in world space. Works regardless of the rig's local bone axes. */
function aim(bone, dir) {
  const child = bone.children.find((c) => c.isBone);
  if (!child) return;
  bone.updateWorldMatrix(true, true);
  const a = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
  const b = new THREE.Vector3().setFromMatrixPosition(child.matrixWorld);
  const from = b.sub(a).normalize();
  const to = dir.clone().normalize();
  if (from.lengthSq() < 1e-8) return;
  const qWorld = new THREE.Quaternion().setFromUnitVectors(from, to);
  const pq = new THREE.Quaternion();
  bone.parent.getWorldQuaternion(pq);
  const local = pq.clone().invert().multiply(qWorld).multiply(pq);
  bone.quaternion.premultiply(local);
  bone.updateMatrixWorld(true);
}

/** Extra spin of a bone about its own segment axis (for twist / foot flare). */
function twist(bone, radians) {
  const child = bone.children.find((c) => c.isBone);
  if (!child) return;
  bone.updateWorldMatrix(true, true);
  const a = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
  const b = new THREE.Vector3().setFromMatrixPosition(child.matrixWorld);
  const axis = b.sub(a).normalize();
  const qWorld = new THREE.Quaternion().setFromAxisAngle(axis, radians);
  const pq = new THREE.Quaternion();
  bone.parent.getWorldQuaternion(pq);
  bone.quaternion.premultiply(pq.clone().invert().multiply(qWorld).multiply(pq));
  bone.updateMatrixWorld(true);
}

/* ------------------------------------------------------------------ */
/* head: scanned bust -> Ronaldo                                        */
/* ------------------------------------------------------------------ */

/** Cut the scanned bust off below the jaw/neck and re-sculpt the face.    */
function sculptHead(geo) {
  geo = geo.toNonIndexed();
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const size = new THREE.Vector3(); bb.getSize(size);
  const ctr = new THREE.Vector3(); bb.getCenter(ctr);

  // recentre so the model sits at origin, and normalise scale to ~1 unit tall
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) - ctr.x, pos.getY(i) - bb.min.y, pos.getZ(i) - ctr.z);
  }
  const s = 1 / size.y;
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * s, pos.getY(i) * s, pos.getZ(i) * s);

  // Drop the shoulders/chest: keep only triangles above the neck line. The
  // bust is ~1 tall now; shoulders occupy roughly the bottom 38%.
  const CUT = 0.34;
  const keep = [];
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let t = 0; t < p.count; t += 3) {
    let above = 0;
    for (let k = 0; k < 3; k++) if (p.getY(t + k) > CUT) above++;
    if (above === 3) keep.push(t);
  }
  const np = new Float32Array(keep.length * 9);
  const nn = new Float32Array(keep.length * 9);
  const nu = uv ? new Float32Array(keep.length * 6) : null;
  keep.forEach((t, i) => {
    for (let k = 0; k < 3; k++) {
      const o = i * 9 + k * 3;
      np[o] = p.getX(t + k); np[o + 1] = p.getY(t + k); np[o + 2] = p.getZ(t + k);
      nn[o] = n.getX(t + k); nn[o + 1] = n.getY(t + k); nn[o + 2] = n.getZ(t + k);
      if (nu) { nu[i * 6 + k * 2] = uv.getX(t + k); nu[i * 6 + k * 2 + 1] = uv.getY(t + k); }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(np, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nn, 3));
  if (nu) g.setAttribute("uv", new THREE.BufferAttribute(nu, 2));

  /* --- re-proportion toward Ronaldo -------------------------------- */
  // Reference frame after the cut: y 0.34 (neck) .. 1.0 (crown),
  // face looks toward +z.
  const q = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < q.count; i++) {
    v.set(q.getX(i), q.getY(i), q.getZ(i));

    // 1. squarer, wider jaw + stronger chin (lower third of the head)
    const jaw = THREE.MathUtils.smoothstep(v.y, 0.62, 0.40);      // 0 above, 1 at chin
    v.x *= 1 + 0.16 * jaw;
    if (v.z > 0) v.z += 0.035 * jaw * THREE.MathUtils.smoothstep(v.z, 0.0, 0.25);
    v.y -= 0.018 * jaw;                                           // longer chin

    // 2. heavier brow ridge / deeper-set eyes
    const brow = Math.exp(-Math.pow((v.y - 0.70) / 0.045, 2));
    if (v.z > 0.10) v.z += 0.022 * brow;

    // 3. slightly narrower cheekbone-to-crown taper (athletic, lean face)
    const upper = THREE.MathUtils.smoothstep(v.y, 0.62, 0.95);
    v.x *= 1 - 0.05 * upper;

    // 4. neck thickened a touch so it meets the shoulders of the body
    const neck = THREE.MathUtils.smoothstep(v.y, 0.48, 0.34);
    v.x *= 1 + 0.10 * neck; v.z *= 1 + 0.10 * neck;

    q.setXYZ(i, v.x, v.y, v.z);
  }
  // weld + smooth: the scan comes in non-indexed, and flat face normals make
  // stone read as low-poly facets (and break the hair offset below).
  const welded = mergeVertices(g, 1e-5);
  simplifyFace(welded);
  welded.computeVertexNormals();
  welded.computeBoundingBox();
  return welded;
}

/** Carve the face down to monument simplicity.
 *
 *  The scan is a real head, so it has a modelled mouth bag and nostril
 *  tunnels: open cavities that catch no light. At statue scale they read as
 *  dark slots — the "moustache" across the lip and black dots under the nose.
 *  Smoothing can't fix that, because a cavity is a hole, not a wrinkle.
 *
 *  Measured on the model itself (tools/faceprobe.html): across the centre of
 *  the face the outer skin sits at z ≈ 0.29, while the mouth bag runs back to
 *  z ≈ 0.05 between y 0.46 and 0.61, and the nostrils bore back under the
 *  nose tip (the most forward point, y ≈ 0.63). So instead of guessing at
 *  anatomy, this finds anything sitting well behind the local skin surface
 *  and lifts it flush — the way a sculptor suggests a feature instead of
 *  carving through it. Brow, eyes, jaw and silhouette are left alone, so the
 *  head still reads as the same person. */
function simplifyFace(geo) {
  const pos = geo.attributes.position;
  const idx = geo.index;
  const n = pos.count;

  // the region allowed to be simplified: mouth and nose, below the eyes
  const inRegion = (x, y, z) =>
    z > 0.0 && y > 0.435 && y < 0.705 && Math.abs(x) < 0.155;

  /* --- 1. where is the outer skin? ------------------------------------ */
  // front-most z per grid cell across the face
  const CELL = 0.02;
  const key = (x, y) => `${Math.round(x / CELL)},${Math.round(y / CELL)}`;
  const front = new Map();
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (z < 0) continue;
    const k = key(x, y);
    const cur = front.get(k);
    if (cur === undefined || z > cur) front.set(k, z);
  }

  /* --- 2. which vertices are recessed behind it? ---------------------- */
  // shallow threshold over the mouth and nose (fill the lot), a deeper one
  // across the eyes so only the socket pockets go and the lids survive
  const depthAt = (y) => (y > 0.655 ? 0.055 : 0.022);
  const DEPTH = 0.055;                     // widest threshold, for skin sampling
  const recessed = new Uint8Array(n);
  const sx = [], sy = [], sz = [];
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (!inRegion(x, y, z)) continue;
    const surf = front.get(key(x, y));
    if (surf !== undefined && z < surf - depthAt(y)) recessed[i] = 1;
  }
  // intact skin around the cavities, used to rebuild the surface over them
  for (let i = 0; i < n; i++) {
    if (recessed[i]) continue;
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (z < 0.05 || Math.abs(x) > 0.26 || y < 0.40 || y > 0.72) continue;
    const surf = front.get(key(x, y));
    if (surf !== undefined && z > surf - DEPTH) { sx.push(x); sy.push(y); sz.push(z); }
  }

  /* --- 3. lift the cavities flush with the skin ----------------------- */
  const surfaceZ = (x, y) => {
    let num = 0, den = 0;
    for (let k = 0; k < sx.length; k++) {
      const dx = sx[k] - x, dy = sy[k] - y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0.010) continue;
      const wt = 1 / (d2 + 2e-5);
      num += sz[k] * wt; den += wt;
    }
    return den > 0 ? num / den : null;
  };
  for (let i = 0; i < n; i++) {
    if (!recessed[i]) continue;
    const target = surfaceZ(pos.getX(i), pos.getY(i));
    if (target === null) continue;
    // a hair behind the skin, so the filled fold never fights with it
    const z = Math.max(pos.getZ(i), target - 0.008);
    pos.setZ(i, z);
  }

  /* --- 4. blend the seam ---------------------------------------------- */
  const nbr = Array.from({ length: n }, () => []);
  for (let t = 0; t < idx.count; t += 3) {
    const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2);
    nbr[a].push(b, c); nbr[b].push(a, c); nbr[c].push(a, b);
  }
  const blend = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const f = THREE.MathUtils.smoothstep(z, -0.02, 0.08);
    const band = THREE.MathUtils.smoothstep(y, 0.42, 0.48) *
      (1 - THREE.MathUtils.smoothstep(y, 0.64, 0.72));
    const centre = 1 - THREE.MathUtils.smoothstep(Math.abs(x), 0.11, 0.20);
    blend[i] = Math.min(1, f * centre * band + (recessed[i] ? 1 : 0));
  }
  const px = new Float32Array(n), py = new Float32Array(n), pz = new Float32Array(n);
  for (let pass = 0; pass < 16; pass++) {
    for (let i = 0; i < n; i++) {
      if (blend[i] < 0.01) continue;
      let ax = 0, ay = 0, az = 0, k = 0;
      for (const j of nbr[i]) { ax += pos.getX(j); ay += pos.getY(j); az += pos.getZ(j); k++; }
      if (!k) continue;
      const lambda = 0.5 * blend[i];
      px[i] = pos.getX(i) + (ax / k - pos.getX(i)) * lambda;
      py[i] = pos.getY(i) + (ay / k - pos.getY(i)) * lambda;
      pz[i] = pos.getZ(i) + (az / k - pos.getZ(i)) * lambda;
    }
    for (let i = 0; i < n; i++) {
      if (blend[i] < 0.01) continue;
      pos.setXYZ(i, px[i], py[i], pz[i]);
    }
  }
  pos.needsUpdate = true;
}

/** Ronaldo's hair, carved straight off the skull it sits on: the scalp
 *  triangles of the head mesh are copied, pushed out along their normals
 *  (short back-and-sides) and swept up at the front into his quiff. */
function buildHair(headGeo, mat) {
  const p = headGeo.attributes.position, n = headGeo.attributes.normal;
  // headGeo is indexed after welding — walk the index buffer, not the
  // vertex array, or the "triangles" are random triples of vertices.
  const idx = headGeo.index;
  const tri = (t, k) => (idx ? idx.getX(t + k) : t + k);
  const triCount = idx ? idx.count : p.count;
  // hairline: high over the forehead, dropping at the temples and the nape
  const hairline = (x, z) => 0.900 - 0.045 * Math.min(1, Math.abs(x) / 0.19)
    - 0.075 * THREE.MathUtils.smoothstep(-z, 0.0, 0.18);
  const keep = [];
  for (let t = 0; t < triCount; t += 3) {
    let inside = 0;
    for (let k = 0; k < 3; k++) {
      const i = tri(t, k);
      // keep a generous skirt below the hairline; thickness fades to zero
      // there, so the cap melts into the skull instead of ending in spikes
      if (p.getY(i) > hairline(p.getX(i), p.getZ(i)) - 0.06) inside++;
    }
    if (inside === 3) keep.push(t);
  }
  const np = new Float32Array(keep.length * 9);
  const v = new THREE.Vector3(), nv = new THREE.Vector3();
  keep.forEach((t, i) => {
    for (let k = 0; k < 3; k++) {
      const j = tri(t, k);
      v.set(p.getX(j), p.getY(j), p.getZ(j));
      nv.set(n.getX(j), n.getY(j), n.getZ(j)).normalize();
      const over = v.y - hairline(v.x, v.z);
      const cover = THREE.MathUtils.smoothstep(over, -0.010, 0.012);  // crisp carved hairline
      const front = THREE.MathUtils.smoothstep(v.z, 0.00, 0.13);
      const crown = THREE.MathUtils.smoothstep(v.y, 0.89, 0.96) * (1 - THREE.MathUtils.smoothstep(v.y, 0.985, 1.01));
      // short faded sides, with the quiff swept up and forward at the front
      const quiff = front * crown;
      const thick = cover * (0.012 + 0.032 * quiff);
      v.addScaledVector(nv, thick);
      v.y += cover * quiff * 0.048;
      v.z += cover * quiff * 0.028;
      const o = i * 9 + k * 3;
      np[o] = v.x; np[o + 1] = v.y; np[o + 2] = v.z;
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(np, 3));
  const welded = mergeVertices(g, 1e-5);
  welded.computeVertexNormals();
  const m = new THREE.Mesh(welded, mat);
  m.castShadow = true;
  return m;
}

/* ------------------------------------------------------------------ */
/* carved kit: shirt, shorts, socks, boots                              */
/* ------------------------------------------------------------------ */

/** Attach a piece of kit to a bone so it follows the pose.
 *  `len` runs along the bone (bone local +Y in Mixamo rigs). */
function boneSleeve(bone, r0, r1, len, mat, offset = 0, open = false) {
  const geo = new THREE.CylinderGeometry(r1, r0, len, 22, 1, open);
  const m = new THREE.Mesh(geo, mat);
  m.position.y = offset + len / 2;
  m.castShadow = true;
  bone.add(m);
  return m;
}

/* ------------------------------------------------------------------ */
/* assembly: pose the rig, graft the head, carve the kit                */
/* ------------------------------------------------------------------ */

const HEIGHT = 2.1;               // heroic scale, slightly over life size

function assemble(figure, bodyGltf, headGltf, mats, lib, root3) {
  // The pose is aimed with world-space directions, so neutralise the
  // monument's own facing rotation while building and restore it after —
  // otherwise the figure ends up posed 90° across its own body.
  const savedQ = root3.quaternion.clone();
  root3.quaternion.identity();
  root3.updateMatrixWorld(true);
  const { stone, stoneKit } = mats;
  const root = bodyGltf.scene;

  /* --- material + scale --------------------------------------------- */
  let skinned = null;
  const bones = {};
  root.traverse((o) => {
    if (o.isMesh || o.isSkinnedMesh) {
      o.material = stone;
      o.castShadow = true; o.receiveShadow = true;
      o.frustumCulled = false;
      if (o.isSkinnedMesh) skinned = o;
    }
    if (o.isBone) bones[o.name.replace("mixamorig", "")] = o;
  });

  /* --- give the mannequin an athlete's mass ---------------------------
     The sample rig is a slim artist's dummy. Inflating the bind-pose mesh
     along its normals (most on the limbs, least on the head/hands) turns it
     into the heavier, carved musculature a monument needs — and it closes
     the panel gaps at the joints. */
  if (skinned) {
    const geo = skinned.geometry;
    const pos = geo.attributes.position, nrm = geo.attributes.normal;
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      n.set(nrm.getX(i), nrm.getY(i), nrm.getZ(i)).normalize();
      const arms = THREE.MathUtils.smoothstep(Math.abs(v.x), 0.22, 0.55);   // out along the arms
      const legs = THREE.MathUtils.smoothstep(-v.y, -0.95, -0.15);          // down the legs
      const head = THREE.MathUtils.smoothstep(v.y, 1.45, 1.62);
      const amount = (0.014 + 0.013 * arms + 0.010 * legs) * (1 - 0.9 * head);
      v.addScaledVector(n, amount);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
  }

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const s = HEIGHT / (box.max.y - box.min.y);
  root.scale.setScalar(s);
  root.position.y = -box.min.y * s;
  figure.add(root);
  root.updateMatrixWorld(true);

  /* --- pose: the "Siuu" landing stance ------------------------------ */
  // legs: planted wide, knees locked, toes flared out
  for (const side of [1, -1]) {
    const L = side > 0 ? "Left" : "Right";
    aim(bones[L + "UpLeg"], V(side * 0.19, -1, 0.02));
    aim(bones[L + "Leg"], V(side * 0.10, -1, -0.02));
    aim(bones[L + "Foot"], V(side * 0.28, -0.22, 0.93));
    // arms: driven down and swept behind, opening into the celebration
    aim(bones[L + "Shoulder"], V(side * 1, 0.10, -0.06));
    aim(bones[L + "Arm"], V(side * 0.60, -0.74, -0.30));
    aim(bones[L + "ForeArm"], V(side * 0.50, -0.74, -0.44));
    aim(bones[L + "Hand"], V(side * 0.46, -0.72, -0.52));
    twist(bones[L + "Arm"], side * 0.5);
    // clenched fists: fold the fingers away, a carved fist replaces them
    for (const f of ["Thumb", "Index", "Middle", "Ring", "Pinky"]) {
      const b = bones[`${L}Hand${f}1`];
      if (b) b.scale.setScalar(0.18);
    }
  }
  // spine: chest lifted, slight backward lean; chin up
  aim(bones.Spine, V(0, 1, -0.07));
  aim(bones.Spine1, V(0, 1, -0.04));
  aim(bones.Spine2, V(0, 1, 0.03));
  aim(bones.Neck, V(0, 1, 0.05));
  aim(bones.Head, V(0, 1, 0.13));
  if (bones.HeadTop_End) bones.Head.scale.setScalar(0.02);   // hide the blank Xbot head
  root.updateMatrixWorld(true);

  /* --- joint positions in figure space ------------------------------ */
  const jp = (name) => {
    const b = bones[name];
    const p = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
    return figure.worldToLocal(p);
  };
  figure.updateMatrixWorld(true);
  const J = {};
  for (const n of ["Hips", "Spine1", "Spine2", "Neck", "Head", "HeadTop_End",
    "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
    "RightShoulder", "RightArm", "RightForeArm", "RightHand",
    "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase", "LeftToe_End",
    "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase", "RightToe_End"]) {
    if (bones[n]) J[n] = jp(n);
  }

  /* --- grafted head -------------------------------------------------- */
  const headGeo = sculptHead(headGltf.scene.getObjectByProperty("isMesh", true).geometry);
  // the kept part of the bust runs y 0.34 (neck) .. 1.0 (crown); a real head
  // is ~1/7.6 of standing height chin-to-crown.
  const headH = (HEIGHT / 6.2) / 0.66;
  const headPivot = new THREE.Group();
  headPivot.position.set(0, J.Neck.y - 0.012, J.Neck.z + 0.010);
  headPivot.rotation.x = -0.26;                    // chin lifted with the roar
  figure.add(headPivot);

  const headMesh = new THREE.Mesh(headGeo, stone);
  headMesh.castShadow = true;
  headMesh.scale.setScalar(headH);
  headMesh.position.y = -0.34 * headH;             // put the cut on the neck joint
  headPivot.add(headMesh);

  const hair = buildHair(headGeo, stoneMaterial(lib, { color: 0xa9a292, rough: 0.9 }));
  hair.scale.setScalar(headH);
  hair.position.y = headMesh.position.y;
  headPivot.add(hair);

  /* --- carved limbs --------------------------------------------------
     The rig gives the proportions and the pose; the visible surface is
     carved here so the figure reads as sculpted stone rather than as the
     jointed mannequin underneath. */
  const orient = (m, a, b) => {
    m.position.copy(a).lerp(b, 0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
  };

  /** Muscled limb section between two joints: radius follows a bulge curve. */
  const muscle = (a, b, rA, rMid, rB, mat, bulge = 0.45, over = 0.06) => {
    const dir = b.clone().sub(a);
    const len = dir.length() * (1 + over * 2);
    const A = a.clone().addScaledVector(dir, -over), B = b.clone().addScaledVector(dir, over);
    const pts = [];
    const N = 16;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      // blend end radii through a mid bulge (biceps, calves, quads)
      const r = u < bulge
        ? THREE.MathUtils.lerp(rA, rMid, THREE.MathUtils.smoothstep(u, 0, bulge))
        : THREE.MathUtils.lerp(rMid, rB, THREE.MathUtils.smoothstep(u, bulge, 1));
      pts.push(new THREE.Vector2(Math.max(r, 0.004), -len / 2 + len * u));
    }
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), mat);
    m.castShadow = true;
    orient(m, A, B);
    figure.add(m);
    return m;
  };

  const knob = (p, r, mat, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), mat);
    m.position.copy(p); m.scale.set(sx, sy, sz); m.castShadow = true;
    figure.add(m);
    return m;
  };

  for (const side of [1, -1]) {
    const L = side > 0 ? "Left" : "Right";
    const sh = J[L + "Arm"], el = J[L + "ForeArm"], wr = J[L + "Hand"];
    const hip = J[L + "UpLeg"], kn = J[L + "Leg"], an = J[L + "Foot"];
    // joint masses: fill the mannequin's panel gaps so the limbs read as
    // one continuous carved form
    knob(sh.clone().add(V(side * 0.014, 0.016, 0)), 0.080, stoneKit, 1.0, 1.0, 0.90);
    knob(el, 0.056, stone, 1, 1.10, 1);
    knob(wr, 0.046, stone, 1, 1.1, 1);
    knob(kn, 0.072, stone, 1, 1.0, 1.02);
    knob(an, 0.056, stone, 1, 1, 1);
    knob(hip.clone().add(V(0, 0.01, 0)), 0.085, stone, 1, 1, 0.95);
  }

  /* --- carved kit -----------------------------------------------------
     Everything below is fitted to the *posed* body: the skinned vertices are
     measured so each piece of kit sits a few millimetres proud of the limb
     it covers, the way carved cloth does, instead of floating around it. */

  // posed vertex cloud (figure space), tagged with its dominant bone
  const verts = [];
  if (skinned) {
    const boneNames = skinned.skeleton.bones.map((b) => b.name.replace("mixamorig", ""));
    const si = skinned.geometry.attributes.skinIndex, sw = skinned.geometry.attributes.skinWeight;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < skinned.geometry.attributes.position.count; i += 2) {
      skinned.getVertexPosition(i, tmp);
      skinned.localToWorld(tmp);
      figure.worldToLocal(tmp);
      let best = 0, bw = -1;
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        if (w > bw) { bw = w; best = si.getComponent(i, k); }
      }
      verts.push({ p: tmp.clone(), bone: boneNames[best] || "" });
    }
  }

  /** 88th-percentile distance from the a→b axis, over vertices in [t0,t1]. */
  const measure = (a, b, t0, t1, match) => {
    const ax = b.clone().sub(a), len2 = ax.lengthSq();
    const d = [];
    const rel = new THREE.Vector3();
    for (const { p, bone } of verts) {
      if (match && !match.test(bone)) continue;
      rel.copy(p).sub(a);
      const t = rel.dot(ax) / len2;
      if (t < t0 || t > t1) continue;
      d.push(rel.sub(ax.clone().multiplyScalar(t)).length());
    }
    if (!d.length) return 0.06;
    d.sort((x, y) => x - y);
    return d[Math.floor(d.length * 0.88)];
  };

  /** A sheath of cloth over a limb: radius(u) drives a lathe that closes
   *  against the limb at both ends, so there are no floating tube rims. */
  const sheath = (a, b, t0, t1, radius, mat) => {
    const p0 = a.clone().lerp(b, t0), p1 = a.clone().lerp(b, t1);
    const len = p0.distanceTo(p1);
    const pts = [];
    const N = 22;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      pts.push(new THREE.Vector2(Math.max(radius(u), 0.002), -len / 2 + len * u));
    }
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 30), mat);
    m.castShadow = true;
    m.position.copy(p0).lerp(p1, 0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), p1.clone().sub(p0).normalize());
    figure.add(m);
    return m;
  };

  const shoulderY = (J.LeftArm.y + J.RightArm.y) / 2;
  const neckY = J.Neck.y;
  const shirtBot = J.Hips.y - 0.10;

  /* shirt: profile traced off the torso itself, then offset outward */
  const TORSO = /^(Hips|Spine|Spine1|Spine2)$/;
  const rows = 16;
  const prof = [[0.001, shirtBot]];
  for (let i = 0; i <= rows; i++) {
    const y = shirtBot + (neckY + 0.01 - shirtBot) * (i / rows);
    const slab = verts.filter(({ p, bone }) => TORSO.test(bone) && Math.abs(p.y - y) < 0.035);
    let r = 0.16;
    if (slab.length > 6) {
      const d = slab.map(({ p }) => Math.hypot(p.x, (p.z - J.Hips.z) / 0.80)).sort((a2, b2) => a2 - b2);
      r = d[Math.floor(d.length * 0.9)];
    }
    // cloth sits ~1cm proud, and the hem tucks in at the very bottom
    const u = i / rows;
    const taper = u > 0.88 ? THREE.MathUtils.smoothstep(u, 0.88, 1) : 0;
    // cap the radius near the top: revolving the shoulder width would make
    // a circular cape instead of a shirt
    const shoulderFade = THREE.MathUtils.smoothstep(y, shoulderY - 0.16, shoulderY + 0.06);
    const capped = Math.min(r, 0.205 - 0.055 * shoulderFade);
    prof.push([capped * (1 - 0.55 * taper) + 0.011, y]);
  }
  const shirt = new THREE.Mesh(
    new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 46),
    stoneKit
  );
  shirt.scale.z = 0.80;
  shirt.castShadow = true;
  figure.add(shirt);

  // rolled collar closing the neck hole
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.016, 12, 34), stoneKit);
  collar.position.set(0, neckY + 0.012, J.Neck.z * 0.4);
  collar.rotation.x = Math.PI / 2;
  collar.scale.z = 0.86;
  collar.castShadow = true;
  figure.add(collar);

  for (const side of [1, -1]) {
    const L = side > 0 ? "Left" : "Right";
    const sh = J[L + "Arm"], el = J[L + "ForeArm"], wr = J[L + "Hand"];
    const hip = J[L + "UpLeg"], kn = J[L + "Leg"], an = J[L + "Foot"];

    // short sleeve: from the shoulder to mid-bicep, flaring into a hem
    const armR = measure(sh, el, 0.15, 0.55, new RegExp(`^${L}(Arm|ForeArm)$`)) + 0.010;
    // starts tucked under the deltoid so there is no floating rim, and
    // finishes in a hem that tapers back onto the bicep
    sheath(sh, el, -0.06, 0.52, (u) =>
      armR * (0.66 + 0.34 * THREE.MathUtils.smoothstep(u, 0.0, 0.22))
        + 0.018 * THREE.MathUtils.smoothstep(u, 0.60, 0.90)
        - armR * 0.50 * THREE.MathUtils.smoothstep(u, 0.93, 1), stoneKit);

    // shorts leg: hip to mid-thigh, hem flared then tucked
    const thighR = measure(hip, kn, 0.15, 0.55, new RegExp(`^${L}(UpLeg|Leg)$`)) + 0.012;
    sheath(hip, kn, -0.08, 0.46, (u) =>
      thighR + 0.010 * THREE.MathUtils.smoothstep(u, 0.55, 0.90)
        - thighR * 0.42 * THREE.MathUtils.smoothstep(u, 0.93, 1), stoneKit);

    // sock: rolled top below the knee down to the ankle
    const calfR = measure(kn, an, 0.25, 0.7, new RegExp(`^${L}(Leg|Foot)$`)) + 0.020;
    sheath(kn, an, 0.16, 0.99, (u) =>
      calfR * (1 - 0.40 * THREE.MathUtils.smoothstep(u, 0, 0.06))
        + 0.014 * Math.exp(-Math.pow((u - 0.10) / 0.07, 2))
        - calfR * 0.30 * THREE.MathUtils.smoothstep(u, 0.9, 1), stoneKit);

    // boot: a rounded foot-shaped mass over ankle and toes
    const tip = J[L + "Toe_End"] || J[L + "ToeBase"];
    const bootAxis = tip.clone().sub(an);
    const boot = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.058, Math.max(bootAxis.length() * 1.05, 0.06), 6, 20),
      stoneKit
    );
    boot.position.copy(an).lerp(tip, 0.52).add(V(0, -0.008, 0));
    boot.quaternion.setFromUnitVectors(V(0, 1, 0), bootAxis.clone().normalize());
    boot.scale.set(1.10, 1, 0.80);
    boot.castShadow = true;
    figure.add(boot);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.016, bootAxis.length() * 1.5 + 0.05), stoneKit);
    sole.position.copy(an).lerp(tip, 0.5).setY(0.010);
    sole.rotation.y = Math.atan2(bootAxis.x, bootAxis.z);
    sole.castShadow = true;
    figure.add(sole);
    const heel = new THREE.Mesh(new THREE.SphereGeometry(0.055, 18, 14), stoneKit);
    heel.position.copy(an).add(V(0, 0.004, -0.030));
    heel.scale.set(1.0, 1.05, 0.95);
    heel.castShadow = true;
    figure.add(heel);

    // clenched fist
    const dir = wr.clone().sub(el).normalize();
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.050, 20, 16), stone);
    fist.position.copy(wr).add(dir.clone().multiplyScalar(0.032));
    fist.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
    fist.scale.set(1, 1.2, 0.9);
    fist.castShadow = true;
    figure.add(fist);
  }

  // shorts waistband wrapping the hips, traced off the body like the shirt
  const hipR = measure(J.Hips.clone().add(V(0, 0.12, 0)), J.Hips.clone().add(V(0, -0.12, 0)), 0.1, 0.9, TORSO) + 0.010;
  const waist = new THREE.Mesh(new THREE.CylinderGeometry(hipR * 0.99, hipR * 1.0, 0.13, 36), stoneKit);
  waist.position.set(0, J.Hips.y + 0.005, J.Hips.z);
  waist.scale.z = 0.84;
  waist.castShadow = true;
  figure.add(waist);

  /* --- number 7 carved on the back, crest on the chest --------------- */
  const sevenShape = new THREE.Shape();
  sevenShape.moveTo(-0.055, 0.085);
  sevenShape.lineTo(0.058, 0.085);
  sevenShape.lineTo(0.058, 0.060);
  sevenShape.lineTo(0.004, -0.085);
  sevenShape.lineTo(-0.030, -0.085);
  sevenShape.lineTo(0.026, 0.058);
  sevenShape.lineTo(-0.055, 0.058);
  sevenShape.closePath();
  const seven = new THREE.Mesh(
    new THREE.ExtrudeGeometry(sevenShape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 }),
    stone
  );
  const backR = Math.max(...prof.map(([r]) => r)) * 0.80;
  seven.position.set(0, shirtBot + (shoulderY - shirtBot) * 0.66, -backR + 0.004);
  seven.rotation.y = Math.PI;
  seven.castShadow = true;
  figure.add(seven);

  const crest = new THREE.Mesh(
    new THREE.CircleGeometry(0.042, 32),
    new THREE.MeshStandardMaterial({ map: lib.crest(), transparent: true, roughness: 0.8, color: 0xbfb8a6 })
  );
  crest.position.set(-0.075, shirtBot + (shoulderY - shirtBot) * 0.84, backR - 0.006);
  crest.rotation.y = -0.35;
  figure.add(crest);

  root3.quaternion.copy(savedQ);
  root3.updateMatrixWorld(true);
}

/* ------------------------------------------------------------------ */
/* main build                                                          */
/* ------------------------------------------------------------------ */

export function buildStatue(lib, anchor) {
  const g = new THREE.Group();
  g.position.copy(anchor);
  g.rotation.y = -Math.PI / 2;              // face west, into the hall

  const MARBLE_DARK = { color: 0x17161c, roughness: 0.28, metalness: 0.25 };
  const mk = (geo, props, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(props));
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    return m;
  };

  /* ---------------- plinth ---------------- */
  const base = mk(new THREE.BoxGeometry(2.3, 0.34, 2.3), MARBLE_DARK, 0, 0.17, 0);
  base.userData.solid = true;
  base.name = "statue-plinth";
  g.add(base);
  const column = mk(new THREE.CylinderGeometry(0.66, 0.80, 0.94, 34), { color: 0xd9d2c2, roughness: 0.4 }, 0, 0.81, 0);
  g.add(column);
  const cap = mk(new THREE.CylinderGeometry(0.82, 0.68, 0.14, 34), MARBLE_DARK, 0, 1.35, 0);
  g.add(cap);
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(1.34, 0.36),
    new THREE.MeshStandardMaterial({ map: lib.plaque("CRISTIANO RONALDO", "2009–2018 · 450 goals"), roughness: 0.6 })
  );
  plaque.position.set(0, 0.86, 0.805);
  g.add(plaque);

  const FEET_Y = 1.42;                       // top of the plinth cap

  /* ---------------- figure (loaded async) ---------------- */
  const figure = new THREE.Group();
  figure.position.y = FEET_Y;
  g.add(figure);

  const stone = stoneMaterial(lib);
  const stoneKit = stoneMaterial(lib, { color: 0xd8d2c3, rough: 0.8 });
  const loader = new GLTFLoader();

  const ready = Promise.all([
    loader.loadAsync(MODELS + "Xbot.glb"),
    loader.loadAsync(MODELS + "LeePerrySmith.glb"),
  ]).then(([body, head]) => {
    assemble(figure, body, head, { stone, stoneKit }, lib, g);
  }).catch((e) => console.error("statue models failed:", e));

  /* ---------------- velvet rope ---------------- */
  const postMat = new THREE.MeshStandardMaterial({ color: 0xd8b25c, metalness: 0.9, roughness: 0.3 });
  const postPos = [[-1.45, -1.45], [1.45, -1.45], [1.45, 1.45], [-1.45, 1.45]];
  for (const [x, z] of postPos) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.95, 12), postMat);
    p.position.set(x, 0.475, z); p.castShadow = true; g.add(p);
    const knob = mk(new THREE.SphereGeometry(0.055, 12, 10), { color: 0xd8b25c, metalness: 0.9, roughness: 0.3 }, x, 0.97, z);
    g.add(knob);
  }
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x7e1123, roughness: 0.75 });
  for (let i = 0; i < 4; i++) {
    const a = postPos[i], b = postPos[(i + 1) % 4];
    const curve = new THREE.QuadraticBezierCurve3(
      V(a[0], 0.92, a[1]), V((a[0] + b[0]) / 2, 0.62, (a[1] + b[1]) / 2), V(b[0], 0.92, b[1])
    );
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.028, 8), ropeMat));
  }

  /* ---------------- animated spotlights ---------------- */
  const keySpot = new THREE.SpotLight(0xfff1d2, 190, 24, Math.PI / 8, 0.45, 1.7);
  keySpot.position.set(-3.6, 5.4, 3.2);
  keySpot.castShadow = true;
  keySpot.shadow.mapSize.set(1024, 1024);
  keySpot.shadow.bias = -0.0004;
  const fillSpot = new THREE.SpotLight(0xb9d2ff, 95, 20, Math.PI / 7.2, 0.55, 1.7);
  fillSpot.position.set(3.4, 4.6, -2.6);
  const target = new THREE.Object3D();
  target.position.set(0, 2.6, 0);
  g.add(keySpot, fillSpot, target);
  keySpot.target = target; fillSpot.target = target;

  for (const [x, z] of [[-1.9, 1.9], [1.9, -1.9]]) {
    g.add(mk(new THREE.CylinderGeometry(0.09, 0.12, 0.14, 12), { color: 0x222233, roughness: 0.6 }, x, 0.07, z));
  }

  const hit = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.6, 3.4), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 2.1, 0);
  g.add(hit);

  const colliders = [
    new THREE.Box3(V(anchor.x - 0.95, 0, anchor.z - 0.95), V(anchor.x + 0.95, 4.4, anchor.z + 0.95)),
  ];

  function update(t) {
    const a = Math.sin(t) * 0.85, b = Math.cos(t * 0.77) * 0.85;
    target.position.set(a * 0.55, 2.6 + Math.sin(t * 0.63) * 0.5, b * 0.55);
    keySpot.position.set(-3.6 + Math.sin(t * 0.4) * 1.1, 5.2 + Math.sin(t * 0.31) * 0.5, 3.2 + Math.cos(t * 0.4) * 1.1);
    fillSpot.position.set(3.4 + Math.cos(t * 0.47) * 1.1, 4.6 + Math.cos(t * 0.36) * 0.45, -2.6 + Math.sin(t * 0.47) * 1.1);
    keySpot.intensity = 175 + Math.sin(t * 2.1) * 35;
    fillSpot.intensity = 86 + Math.cos(t * 1.7) * 22;
  }

  return { group: g, hit, colliders, update };
}
