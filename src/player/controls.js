// Player controls.
//
// Two camera modes share one player: first person (eye at the player's head)
// and eagle eye (an orbit camera behind and above the visitor, who is then
// drawn in the room). V, or the on-screen button, switches between them and
// the camera blends across.
//
// Looking works with OR without pointer lock: if the browser grants the lock,
// the mouse moves the view directly; if it refuses it — or the player pressed
// Esc, or the lock is on its post-Esc cooldown — click-dragging still turns
// the view and the keys still walk. Nothing in here is allowed to leave the
// player stuck with dead controls.
import * as THREE from "three";
import { ROOM } from "../world/museum.js";

const EYE = 1.66;          // camera height in first person
const HEAD = 1.62;         // avatar head height, for the orbit target
const RADIUS = 0.36;
const SKIN = 0.05;         // stop a little short of a surface, never touching it
const SPEED = 4.4;
const SPRINT = 7.2;

export class PlayerControls {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.pos = new THREE.Vector3(0, 0, 0);   // player feet
    this.yaw = 0;
    this.pitchFP = 0;                         // look up/down, first person
    this.pitchEagle = 0.62;                   // camera elevation, eagle eye
    this.dist = 7.5;
    this.distTarget = 7.5;
    this.keys = new Set();
    this.active = false;       // roaming (set by main); independent of the lock
    this.locked = false;
    this.fpv = true;
    this.blend = 1;            // 1 = first person, 0 = eagle eye
    this.colliders = [];
    this.bobT = 0;
    this.vel = new THREE.Vector3();
    this.speed = 0;
    this.moveYaw = null;
    this.onViewChange = null;

    this._drag = null;
    this._bindInput();
  }

  /* ----------------------------------------------------------- input */

  _bindInput() {
    const dom = this.dom;

    // pointer-lock look
    document.addEventListener("mousemove", (e) => {
      if (!this.active || !this.locked) return;
      // The first event after the lock is granted often carries a huge
      // movement delta (the jump from wherever the cursor was), which snaps
      // the view. Drop it, and cap the rest so a spike can't whip the camera.
      if (this._freshLock) { this._freshLock = false; return; }
      const cap = 160;
      this._look(
        THREE.MathUtils.clamp(e.movementX, -cap, cap),
        THREE.MathUtils.clamp(e.movementY, -cap, cap),
        0.0021
      );
    });

    // drag look — the fallback whenever the pointer lock is not held
    dom.addEventListener("pointerdown", (e) => {
      if (!this.active || this.locked || e.button !== 0) return;
      this._drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId };
      dom.classList.add("dragging");
      try { dom.setPointerCapture(e.pointerId); } catch { /* not fatal */ }
    });
    dom.addEventListener("pointermove", (e) => {
      if (!this._drag) return;
      const dx = e.clientX - this._drag.x, dy = e.clientY - this._drag.y;
      this._drag.x = e.clientX; this._drag.y = e.clientY;
      this._drag.moved += Math.abs(dx) + Math.abs(dy);
      this._look(dx, dy, 0.0032);
    });
    const endDrag = (e) => {
      if (!this._drag) return;
      const wasClick = this._drag.moved < 6;
      try { dom.releasePointerCapture(this._drag.id); } catch { /* fine */ }
      this._drag = null;
      dom.classList.remove("dragging");
      if (wasClick && this.onClick) this.onClick();
    };
    dom.addEventListener("pointerup", endDrag);
    dom.addEventListener("pointercancel", endDrag);
    dom.addEventListener("pointerleave", endDrag);

    // zoom the eagle-eye camera
    dom.addEventListener("wheel", (e) => {
      if (this.fpv) return;
      this.distTarget = THREE.MathUtils.clamp(this.distTarget + e.deltaY * 0.006, 3.2, 16);
      e.preventDefault();
    }, { passive: false });

    document.addEventListener("keydown", (e) => {
      const k = normalizeKey(e.key);
      if (k) {
        this.keys.add(k);
        if (["forward", "back", "left", "right"].includes(k)) e.preventDefault();
      }
    });
    document.addEventListener("keyup", (e) => {
      const k = normalizeKey(e.key);
      if (k) this.keys.delete(k);
    });
    window.addEventListener("blur", () => this.keys.clear());

    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === dom;
      this._freshLock = this.locked;
      if (!this.locked) this.keys.clear();
    });
    // a denied lock must never break anything: drag-look simply takes over
    document.addEventListener("pointerlockerror", () => { this.locked = false; });
  }

  _look(dx, dy, k) {
    this.yaw -= dx * k;
    if (this.fpv) {
      this.pitchFP = THREE.MathUtils.clamp(this.pitchFP - dy * k, -1.45, 1.45);
    } else {
      this.pitchEagle = THREE.MathUtils.clamp(this.pitchEagle + dy * k, 0.12, 1.32);
    }
  }

  /* ----------------------------------------------------------- state */

  setPose(x, z, yaw, pitch = 0) {
    this.pos.set(x, 0, z);
    this.yaw = yaw;
    this.pitchFP = pitch;
  }

  setView(fpv) {
    if (this.fpv === fpv) return;
    this.fpv = fpv;
    if (!fpv) this.releaseLock();          // eagle eye reads better unlocked
    this.onViewChange?.(fpv);
  }

  toggleView() { this.setView(!this.fpv); }

  /** Ask for pointer lock, but never depend on getting it. */
  requestLock() {
    if (!this.fpv) return;
    if (document.pointerLockElement === this.dom) return;
    try {
      const r = this.dom.requestPointerLock();
      if (r && typeof r.catch === "function") r.catch(() => { this.locked = false; });
    } catch { this.locked = false; }
  }

  releaseLock() {
    if (document.pointerLockElement === this.dom) document.exitPointerLock();
  }

  /** Eye point and forward direction — what interaction is tested from. */
  eye(target = new THREE.Vector3()) {
    return target.set(this.pos.x, EYE, this.pos.z);
  }

  forward(target = new THREE.Vector3()) {
    const p = this.fpv ? this.pitchFP : 0;
    return target.set(
      -Math.sin(this.yaw) * Math.cos(p), Math.sin(p), -Math.cos(this.yaw) * Math.cos(p)
    ).normalize();
  }

  /* ----------------------------------------------------------- update */

  update(dt) {
    if (this.active) this._move(dt);
    this._updateCamera(dt);
  }

  _move(dt) {
    const fwd = Number(this.keys.has("forward")) - Number(this.keys.has("back"));
    const strafe = Number(this.keys.has("right")) - Number(this.keys.has("left"));
    const sprint = this.keys.has("sprint");
    const speed = sprint ? SPRINT : SPEED;

    const dir = new THREE.Vector3();
    if (fwd || strafe) {
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      dir.set(-sin * fwd + cos * strafe, 0, -cos * fwd - sin * strafe);
      if (dir.lengthSq() > 0) dir.normalize();
    }
    this.vel.lerp(dir.multiplyScalar(speed), 1 - Math.exp(-12 * dt));

    // Move one axis at a time and stop at the face we actually approached.
    // Resolving both axes at once (and pushing out of whichever face happens
    // to be nearest) is what used to teleport the player sideways when they
    // clipped the corner of an exhibit's box.
    const fromX = this.pos.x, fromZ = this.pos.z;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    // room bounds first, so the collision passes below get the final say —
    // clamping afterwards could shove the player back inside an exhibit
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, ROOM.x0 + 0.6, ROOM.x1 - 0.6);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, ROOM.z0 + 0.6, ROOM.z1 - 0.6);
    // two passes: clamping one axis against one box can slide the player into
    // a neighbouring box, so re-check both once more
    for (let pass = 0; pass < 2; pass++) {
      if (this._blocked("x", fromX)) this.vel.x = 0;
      if (this._blocked("z", fromZ)) this.vel.z = 0;
    }

    this._unstick(dt);

    this.speed = Math.hypot(this.vel.x, this.vel.z);
    this.moveYaw = this.speed > 0.25 ? Math.atan2(this.vel.x, this.vel.z) : null;

    this.bobT += dt * (sprint ? 11.5 : 8.5) * (this.speed > 0.45 ? 1 : 0);
  }

  /** Stop `axis` at the face of any box the step just entered.
   *  `from` is the coordinate on that axis before the step. */
  _blocked(axis, from) {
    const other = axis === "x" ? "z" : "x";
    const R = RADIUS + SKIN;
    let hit = false;
    for (const box of this.colliders) {
      if (box.max.y < 0.35) continue;
      const o = this.pos[other];
      if (o < box.min[other] - R || o > box.max[other] + R) continue;            // beside it
      const lo = box.min[axis] - R, hi = box.max[axis] + R;
      const v = this.pos[axis];
      if (v <= lo || v >= hi) continue;                                          // clear of it
      // overlapping: go back to the side we came from
      if (from <= lo) { this.pos[axis] = lo; hit = true; }
      else if (from >= hi) { this.pos[axis] = hi; hit = true; }
      else {
        // We began this frame already inside this slab, so we came in through
        // the *other* axis and that one does the stopping. Just cancel this
        // frame's motion along here. Undoing one step can never be a jump —
        // snapping to the nearest face (the obvious alternative) can.
        if (this.pos[axis] !== from) { this.pos[axis] = from; hit = true; }
      }
    }
    return hit;
  }

  /** If the player is somehow inside a box — warped there, or the layout
   *  changed under them — ease out of the *deepest* one at walking pace.
   *  One box per frame: pushing out of several at once can compound into
   *  exactly the kind of jump this is here to avoid. */
  _unstick(dt) {
    let worst = null, worstDepth = 0, axis = "", sign = 0;
    for (const box of this.colliders) {
      if (box.max.y < 0.35) continue;
      const loX = box.min.x - RADIUS - SKIN, hiX = box.max.x + RADIUS + SKIN;
      const loZ = box.min.z - RADIUS - SKIN, hiZ = box.max.z + RADIUS + SKIN;
      if (this.pos.x <= loX || this.pos.x >= hiX || this.pos.z <= loZ || this.pos.z >= hiZ) continue;
      const dxl = this.pos.x - loX, dxh = hiX - this.pos.x;
      const dzl = this.pos.z - loZ, dzh = hiZ - this.pos.z;
      const depth = Math.min(dxl, dxh, dzl, dzh);
      if (depth > worstDepth) {
        worstDepth = depth; worst = box;
        if (depth === dxl) { axis = "x"; sign = -1; }
        else if (depth === dxh) { axis = "x"; sign = 1; }
        else if (depth === dzl) { axis = "z"; sign = -1; }
        else { axis = "z"; sign = 1; }
      }
    }
    if (!worst) return;
    const stepOut = Math.min(worstDepth, 3.6 * dt);     // a slow walk out
    this.pos[axis] += sign * stepOut;
    this.vel.set(0, 0, 0);
  }

  _updateCamera(dt) {
    const cam = this.camera;
    // smooth the switch between the two cameras
    const want = this.fpv ? 1 : 0;
    this.blend += (want - this.blend) * Math.min(1, dt * 6);
    if (Math.abs(want - this.blend) < 0.002) this.blend = want;   // settle exactly
    const b = smoothstep(this.blend);
    this.dist += (this.distTarget - this.dist) * Math.min(1, dt * 5);

    const bob = this.speed > 0.45 ? Math.sin(this.bobT) * 0.028 : 0;
    const eye = new THREE.Vector3(this.pos.x, EYE + bob, this.pos.z);

    // eagle eye: orbit around the visitor's head
    const target = new THREE.Vector3(this.pos.x, HEAD - 0.35, this.pos.z);
    const cp = Math.cos(this.pitchEagle);
    const orbit = new THREE.Vector3(
      target.x + Math.sin(this.yaw) * cp * this.dist,
      target.y + Math.sin(this.pitchEagle) * this.dist,
      target.z + Math.cos(this.yaw) * cp * this.dist
    );
    // keep the eagle camera inside the room so it never sits behind a wall
    orbit.x = THREE.MathUtils.clamp(orbit.x, ROOM.x0 + 1.0, ROOM.x1 - 1.0);
    orbit.z = THREE.MathUtils.clamp(orbit.z, ROOM.z0 + 1.0, ROOM.z1 - 1.0);
    orbit.y = THREE.MathUtils.clamp(orbit.y, 1.4, ROOM.h - 0.45);

    if (b === 1) cam.position.copy(eye);
    else cam.position.lerpVectors(orbit, eye, b);

    // aim: blend between looking from the eye and looking at the visitor
    const fpLook = eye.clone().add(this.forward().multiplyScalar(5));
    const eagleLook = target;
    const look = new THREE.Vector3().lerpVectors(eagleLook, fpLook, b);
    cam.up.set(0, 1, 0);
    cam.lookAt(look);

    const fov = THREE.MathUtils.lerp(52, 72, b);
    if (Math.abs(cam.fov - fov) > 0.02) { cam.fov = fov; cam.updateProjectionMatrix(); }
  }

  /** Nearest interactable along the player's line of sight. */
  pickInteractable(interactables, maxDist = 4.6) {
    const ray = new THREE.Raycaster(this.eye(), this.forward(), 0.1, maxDist);
    const hits = ray.intersectObjects(interactables.map((i) => i.object), true);
    for (const h of hits) {
      let obj = h.object;
      while (obj && !obj.userData.interactId) obj = obj.parent;
      if (obj) {
        return {
          item: interactables.find((i) => i.id === obj.userData.interactId),
          point: h.point, distance: h.distance,
        };
      }
    }
    return null;
  }
}

// kept so older imports still resolve
export { PlayerControls as FPSControls };

const smoothstep = (x) => x * x * (3 - 2 * x);

function normalizeKey(k) {
  switch (k) {
    case "w": case "W": case "ArrowUp": return "forward";
    case "s": case "S": case "ArrowDown": return "back";
    case "a": case "A": case "ArrowLeft": return "left";
    case "d": case "D": case "ArrowRight": return "right";
    case "Shift": return "sprint";
    default: return null;
  }
}
