// The visitor you see in eagle-eye view: a small figure in the home kit that
// walks, turns to face the way you are moving, and is hidden in first person.
import * as THREE from "three";
import { createSurfaceMaterial } from "../world/shaders.js";

const WHITE = 0xf3f4f7;
const NAVY = 0x18255c;
const SKIN = 0xd9a87c;
const HAIR = 0x22160e;
const SOCK = 0xf3f4f7;
const BOOT = 0x14161d;

function mat(color, rough = 0.72) {
  return createSurfaceMaterial({ color, roughness: rough, metalness: 0.02 });
}

/** A limb that pivots from its top joint, so it swings like a real one. */
function limb(parent, x, y, z, len, r, material) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len - r * 2, 4, 12), material);
  m.position.y = -len / 2;
  m.castShadow = true;
  pivot.add(m);
  parent.add(pivot);
  return pivot;
}

export function createAvatar() {
  const g = new THREE.Group();
  const mWhite = mat(WHITE), mNavy = mat(NAVY, 0.8), mSkin = mat(SKIN, 0.66),
    mHair = mat(HAIR, 0.85), mSock = mat(SOCK, 0.85), mBoot = mat(BOOT, 0.45);

  /* torso: tapered, with the kit's collar */
  const torso = new THREE.Mesh(
    new THREE.LatheGeometry([
      [0.001, 0.82], [0.175, 0.82], [0.185, 0.90], [0.172, 1.02],
      [0.190, 1.14], [0.205, 1.26], [0.183, 1.34], [0.120, 1.38], [0.070, 1.40],
    ].map(([r, y]) => new THREE.Vector2(r, y)), 28),
    mWhite
  );
  torso.scale.z = 0.72;
  torso.castShadow = true;
  g.add(torso);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.016, 8, 20), mNavy);
  collar.position.y = 1.40; collar.rotation.x = Math.PI / 2; collar.scale.z = 0.8;
  g.add(collar);

  // shorts
  const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.20, 0.26, 24), mNavy);
  shorts.position.y = 0.80; shorts.scale.z = 0.76; shorts.castShadow = true;
  g.add(shorts);

  /* head */
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 24, 18), mSkin);
  head.position.set(0, 1.55, 0.01);
  head.scale.set(0.92, 1.06, 0.96);
  head.castShadow = true;
  g.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.056, 0.07, 14), mSkin);
  neck.position.y = 1.43; g.add(neck);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.128, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), mHair
  );
  hair.position.set(0, 1.565, -0.004);
  hair.scale.set(0.95, 1.0, 0.98);
  g.add(hair);

  /* limbs */
  const arms = [
    limb(g, -0.205, 1.30, 0, 0.54, 0.052, mSkin),
    limb(g, 0.205, 1.30, 0, 0.54, 0.052, mSkin),
  ];
  // short sleeves over the shoulders
  for (const s of [-1, 1]) {
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.062, 0.16, 16), mWhite);
    sleeve.position.set(s * 0.205, 1.24, 0);
    sleeve.castShadow = true;
    g.add(sleeve);
  }
  const legs = [
    limb(g, -0.092, 0.80, 0, 0.80, 0.062, mSkin),
    limb(g, 0.092, 0.80, 0, 0.80, 0.062, mSkin),
  ];
  // socks + boots ride on the leg pivots so they swing with them
  for (let i = 0; i < 2; i++) {
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.052, 0.26, 14), mSock);
    sock.position.y = -0.60; legs[i].add(sock);
    const boot = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.10, 4, 12), mBoot);
    boot.rotation.x = Math.PI / 2;
    boot.position.set(0, -0.775, 0.045);
    boot.castShadow = true;
    legs[i].add(boot);
  }

  // a 7 on the back, because of course
  const seven = new THREE.Mesh(
    new THREE.PlaneGeometry(0.11, 0.15),
    createSurfaceMaterial({ color: NAVY, roughness: 0.8, transparent: true })
  );
  seven.position.set(0, 1.14, -0.146);
  seven.rotation.y = Math.PI;
  g.add(seven);

  let walk = 0;
  let facing = 0;

  /** dt, current speed (m/s) and the direction of travel (radians, or null). */
  function update(dt, speed, moveYaw) {
    const moving = speed > 0.25;
    walk += dt * (2.0 + speed * 1.9) * (moving ? 1 : 0);
    const swing = moving ? Math.sin(walk) * Math.min(0.85, 0.22 + speed * 0.12) : 0;
    legs[0].rotation.x = swing;
    legs[1].rotation.x = -swing;
    arms[0].rotation.x = -swing * 0.8;
    arms[1].rotation.x = swing * 0.8;
    arms[0].rotation.z = 0.10;
    arms[1].rotation.z = -0.10;
    // little bounce in the step
    g.position.y = moving ? Math.abs(Math.sin(walk)) * 0.035 : 0;

    if (moveYaw !== null && moving) {
      let d = moveYaw - facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      facing += d * Math.min(1, dt * 11);
    }
    g.rotation.y = facing;
  }

  function setFacing(y) { facing = y; g.rotation.y = y; }

  return { group: g, update, setFacing };
}
