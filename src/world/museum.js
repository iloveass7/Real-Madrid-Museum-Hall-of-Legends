// Museum room: floor, walls, ceiling, entrance, columns, wall posters.
// Room inner extents: x ∈ [-20, 20], z ∈ [-13, 13], ceiling y = 6.
import * as THREE from "three";

export const ROOM = { w: 40, d: 26, h: 6, x0: -20, x1: 20, z0: -13, z1: 13 };

export function buildMuseum(scene, lib) {
  const group = new THREE.Group();
  const colliders = [];

  const texFloor = lib.marbleFloor();
  const texWall = lib.wall();
  const texCeil = lib.ceiling();
  const texCarpet = lib.carpet();
  const texWood = lib.wood();

  const matFloor = new THREE.MeshStandardMaterial({ map: texFloor, roughness: 0.25, metalness: 0.05 });
  const matWall = new THREE.MeshStandardMaterial({ map: texWall, roughness: 0.9 });
  const matCeil = new THREE.MeshStandardMaterial({ map: texCeil, roughness: 0.95 });
  const matCarpet = new THREE.MeshStandardMaterial({ map: texCarpet, roughness: 0.98 });
  const matWood = new THREE.MeshStandardMaterial({ map: texWood, roughness: 0.55 });
  const matGold = new THREE.MeshStandardMaterial({ color: 0xc9a96a, metalness: 0.85, roughness: 0.3 });
  const matMarbleDark = new THREE.MeshStandardMaterial({ color: 0x17161c, roughness: 0.3, metalness: 0.2 });

  /* ---------------- floor / ceiling ---------------- */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), matFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), matCeil);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = ROOM.h;
  group.add(ceil);

  // carpet runners (a cross leading from the entrance to each wing)
  const carpetA = new THREE.Mesh(new THREE.PlaneGeometry(30, 3.2), matCarpet);
  carpetA.rotation.x = -Math.PI / 2; carpetA.rotation.z = Math.PI / 2;
  carpetA.position.set(0.5, 0.012, 0);
  carpetA.receiveShadow = true;
  group.add(carpetA);

  const carpetB = new THREE.Mesh(new THREE.PlaneGeometry(24, 3.2), matCarpet);
  carpetB.rotation.x = -Math.PI / 2;
  carpetB.position.set(-2, 0.013, 0);
  carpetB.receiveShadow = true;
  group.add(carpetB);

  /* ---------------- walls ---------------- */
  const T = 0.5;
  function wall(w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matWall);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    group.add(m);
    const b = new THREE.Box3().setFromObject(m);
    colliders.push(b);
    return m;
  }
  wall(ROOM.w + T * 2, ROOM.h, T, 0, ROOM.h / 2, ROOM.z0 - T / 2); // north
  wall(ROOM.w + T * 2, ROOM.h, T, 0, ROOM.h / 2, ROOM.z1 + T / 2); // south
  wall(T, ROOM.h, ROOM.d + T * 2, ROOM.x0 - T / 2, ROOM.h / 2, 0); // west
  wall(T, ROOM.h, ROOM.d + T * 2, ROOM.x1 + T / 2, ROOM.h / 2, 0); // east

  /* ---------------- columns ---------------- */
  const colGeo = new THREE.CylinderGeometry(0.32, 0.38, ROOM.h, 20);
  const capGeo = new THREE.CylinderGeometry(0.48, 0.4, 0.22, 20);
  const matCol = new THREE.MeshStandardMaterial({ color: 0xe4e3df, roughness: 0.45 });
  const colPositions = [
    [-14, -9], [-14, 9], [-6, -11], [-6, 11],
    [0, -9], [0, 9], [18, -9], [18, 9],
  ];
  for (const [x, z] of colPositions) {
    const c = new THREE.Mesh(colGeo, matCol);
    c.position.set(x, ROOM.h / 2, z);
    c.castShadow = true; c.receiveShadow = true;
    group.add(c);
    const cap = new THREE.Mesh(capGeo, matGold);
    cap.position.set(x, ROOM.h - 0.15, z);
    group.add(cap);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.18, 20), matMarbleDark);
    base.position.set(x, 0.09, z);
    group.add(base);
    colliders.push(new THREE.Box3(
      new THREE.Vector3(x - 0.45, 0, z - 0.45),
      new THREE.Vector3(x + 0.45, ROOM.h, z + 0.45)
    ));
  }

  /* ---------------- entrance (north-west corner) ---------------- */
  const door = new THREE.Group();
  door.position.set(-14, 0, ROOM.z0 + 0.06);
  // frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.6, 0.3), matWood);
  frame.position.y = 1.8;
  door.add(frame);
  // two glass door leaves
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0xbfd4e6, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1,
  });
  for (const s of [-1, 1]) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.3, 3.1, 0.08), matGlass);
    leaf.position.set(s * 0.68, 1.65, 0.12);
    door.add(leaf);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 10), matGold);
    bar.position.set(s * 0.2, 1.65, 0.2);
    door.add(bar);
  }
  // crest above door
  const crestTex = lib.crest();
  const crest = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 48),
    new THREE.MeshBasicMaterial({ map: crestTex, transparent: true })
  );
  crest.position.set(0, 4.4, 0.1);
  door.add(crest);
  const doorPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.8),
    new THREE.MeshStandardMaterial({ map: lib.plaque("ENTRANCE", "Hall of Legends"), roughness: 0.5 })
  );
  doorPlaque.position.set(0, 3.7, 0.09);
  door.add(doorPlaque);
  group.add(door);

  /* ---------------- wall posters ---------------- */
  const posterDefs = [
    // [key, opts, x, z, rotY, w, h]
    ["poster_hala", { kicker: "Hala Madrid", title: "¡Hala\nMadrid!", sub: "y nada más" }, -10, ROOM.z0 + 0.28, 0, 1.7, 2.3],
    ["poster_kings", { kicker: "Kings of Europe", title: "15 European\nCups", sub: "No one comes close", photo: "ucl_trophy" }, -5, ROOM.z0 + 0.28, 0, 1.7, 2.3],
    ["poster_1902", { kicker: "Est. 1902", title: "A Century\nof Glory", sub: "The most decorated club in history" }, -5, ROOM.z1 - 0.28, Math.PI, 1.7, 2.3],
    ["poster_galacticos", { kicker: "Los Galácticos", title: "Figo · Zidane\nRonaldo · Beckham", sub: "The project that changed football" }, -10, ROOM.z1 - 0.28, Math.PI, 1.7, 2.3],
    ["poster_cr7", { kicker: "450 goals", title: "Cristiano\nRonaldo", sub: "Legend — 2009 · 2018", photo: "cr7" }, ROOM.x1 - 0.28, -8.5, -Math.PI / 2, 1.7, 2.3],
    ["poster_decima", { kicker: "Lisbon 2014", title: "La\nDécima", sub: "The 93rd minute that shook Europe" }, ROOM.x1 - 0.28, 8.5, -Math.PI / 2, 1.7, 2.3],
  ];

  for (const [key, opts, x, z, rotY, w, h] of posterDefs) {
    const tex = lib.poster(key, opts);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.07), matWood);
    frame.position.set(x, 2.6, z);
    frame.rotation.y = rotY;
    frame.castShadow = true;
    group.add(frame);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })
    );
    face.position.set(x, 2.6, z);
    face.rotation.y = rotY;
    face.translateZ(0.05);
    group.add(face);
  }

  // big crest medallions flanking the hall
  for (const [x, z, rotY] of [[-14, ROOM.z1 - 0.3, Math.PI], [ROOM.x0 + 0.3, -5, Math.PI / 2]]) {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 48),
      new THREE.MeshBasicMaterial({ map: crestTex, transparent: true })
    );
    m.position.set(x, 4.1, z);
    m.rotation.y = rotY;
    group.add(m);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 12, 48), matGold);
    ring.position.copy(m.position);
    ring.rotation.y = rotY;
    group.add(ring);
  }

  /* ---------------- ambient & general lighting ---------------- */
  // cool, neutral gallery wash — the warm gold spotlights on each exhibit
  // (set up per-exhibit in exhibits.js) then read as deliberate accent
  // lighting against it, instead of everything being uniformly warm/amber.
  const hemi = new THREE.HemisphereLight(0xf2f6ff, 0x2b2d33, 0.55);
  group.add(hemi);
  const amb = new THREE.AmbientLight(0xffffff, 0.18);
  group.add(amb);

  // ceiling row lights — cool white LED wash
  for (const x of [-12, -4, 4, 12]) {
    for (const z of [-6.5, 6.5]) {
      const s = new THREE.SpotLight(0xe6edff, 24, 16, Math.PI / 5.4, 0.55, 1.6);
      s.position.set(x, ROOM.h - 0.15, z);
      s.target.position.set(x, 0, z);
      group.add(s, s.target);
    }
  }
  // door sconces — kept as a warm accent either side of the entrance
  for (const s of [-1.9, 1.9]) {
    const p = new THREE.PointLight(0xffd9a0, 7, 7, 1.8);
    p.position.set(-14 + s, 2.6, ROOM.z0 + 0.7);
    group.add(p);
  }

  scene.add(group);

  return {
    group,
    colliders,
    anchors: {
      ucl: new THREE.Vector3(10, 0, ROOM.z0 + 1.35),
      domestic: new THREE.Vector3(10, 0, ROOM.z1 - 1.35),
      statue: new THREE.Vector3(ROOM.x1 - 1.8, 0, 0),
      painting: new THREE.Vector3(ROOM.x0 + 0.42, 2.4, 0),
      door: new THREE.Vector3(-14, 0, ROOM.z0),
    },
  };
}
