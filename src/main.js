// Real Madrid Museum — Hall of Legends
// FPS-style walkthrough built on Three.js / WebGL.
import * as THREE from "three";
import { TextureLibrary } from "./world/textures.js";
import { buildMuseum, ROOM } from "./world/museum.js";
import {
  buildUCLExhibit, buildDomesticExhibit, buildPainting,
} from "./world/exhibits.js";
import { buildStatue } from "./world/statue.js";
import { buildFlags } from "./world/flags.js";
import { PlayerControls } from "./player/controls.js";
import { createAvatar } from "./player/avatar.js";
import { Magazine } from "./ui/magazine.js";
import { setManifest, buildUCLPages, buildBallonPages, buildDomesticPages } from "./ui/pages.js";

/* ------------------------------------------------ renderer / scene */
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0c12);
scene.fog = new THREE.Fog(0x0a0c12, 26, 60);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 90);

/* environment reflections for the metals (procedural mini env) */
{
  const env = new THREE.Scene();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mk = (c, i, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c }));
    m.material.color.multiplyScalar(i);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    env.add(m);
  };
  mk(0x8fa3bf, 0.5, 0, 0, -8, 14, 8);            // cool back wall
  mk(0xfff1d0, 2.4, -4, 6, 2, 3, 0.4, 3);        // warm key panels
  mk(0xfff1d0, 2.0, 5, 6, -3, 3, 0.4, 3);
  mk(0xc9a96a, 1.1, 0, -6, 3, 8, 0.5, 2);        // gold floor bounce
  mk(0x33415e, 0.9, -7, 0, 0, 0.5, 8, 8);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.09).texture;
  pmrem.dispose();
}

/* ------------------------------------------------ world */
const lib = new TextureLibrary(renderer);
await lib.init();                    // photo manifest must load before textures are bound
setManifest(lib.photoSources);
const museum = buildMuseum(scene, lib);
const ucl = buildUCLExhibit(lib, museum.anchors.ucl);
const domestic = buildDomesticExhibit(lib, museum.anchors.domestic);
const statue = buildStatue(lib, museum.anchors.statue);
const painting = buildPainting(lib, museum.anchors.painting);
const flags = buildFlags(lib, ROOM);
scene.add(flags.group);
scene.add(ucl.group, domestic.group, statue.group, painting.group);



/** Collision boxes taken from the props themselves, so anything marked solid
 *  is solid — no hand-written box to forget (which is exactly how the
 *  centrepiece cup ended up walkable). Rebuilt once the statue's models land. */
function solidColliders(...roots) {
  const boxes = [];
  for (const root of roots) {
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.userData.solid) return;
      const box = new THREE.Box3().setFromObject(o);
      if (box.isEmpty()) return;
      box.max.y = Math.max(box.max.y, 0.9);      // waist height at minimum
      boxes.push(box);
    });
  }
  return boxes;
}

const colliders = [
  ...museum.colliders,
  ...ucl.colliders,
  ...domestic.colliders,
  ...statue.colliders,
  ...solidColliders(ucl.group, domestic.group, statue.group),
];

/* ------------------------------------------------ interaction targets */
function tagInteractable(group, hit, id) {
  hit.userData.interactId = id;
  group.traverse((o) => { if (!o.userData.interactId) o.userData.interactId = id; });
  hit.userData.interactId = id;
}
tagInteractable(ucl.group, ucl.hit, "ucl");
tagInteractable(domestic.group, domestic.hit, "domestic");
tagInteractable(statue.group, statue.hit, "statue");

// painting: tag whole group so looking at the frame also counts
painting.group.traverse((o) => (o.userData.interactId = "painting"));

const interactables = [
  { id: "ucl", object: ucl.hit, prompt: "Press <b>E</b> — UCL Trophy Room Magazine" },
  { id: "domestic", object: domestic.hit, prompt: "Press <b>E</b> — Domestic Honours Album" },
  { id: "statue", object: statue.hit, prompt: "Press <b>E</b> — Ballon d'Or Gallery" },
  { id: "painting", object: painting.hit, prompt: "Press <b>E</b> — Bernabéu: Past & Present" },
];

/* ------------------------------------------------ player + controls */
const controls = new PlayerControls(camera, canvas);
controls.colliders = colliders;
controls.setPose(-14, -8.2, -Math.PI / 2 - 0.35); // inside entrance, looking into hall

// the visitor you see in eagle-eye view
const avatar = createAvatar();
avatar.setFacing(-Math.PI / 2 - 0.35);
scene.add(avatar.group);

const hud = document.getElementById("hud");
const promptEl = document.getElementById("prompt");
const splash = document.getElementById("splash");
const viewBtn = document.getElementById("view-btn");

let mode = "splash"; // splash | roam | magazine
let currentTarget = null;

const magazine = new Magazine(() => {
  setMode("roam");
  controls.requestLock();
});

function setMode(next) {
  mode = next;
  controls.active = next === "roam";
  if (next !== "roam") promptEl.classList.add("hidden");
}

function setView(fpv) {
  controls.setView(fpv);
  if (viewBtn) viewBtn.textContent = fpv ? "Eagle eye  (V)" : "First person  (V)";
  document.body.classList.toggle("eagle", !fpv);
  if (fpv && mode === "roam") controls.requestLock();
}

/* ------------------------------------------------ entering the museum
   Entering never depends on the pointer lock: the lock is requested, but if
   the browser refuses it (or the player presses Esc later) drag-to-look and
   the keyboard keep working, so the controls can't end up dead. */
function enterMuseum() {
  if (mode !== "splash") return;
  splash.classList.add("fade");
  hud.classList.remove("hidden");
  setMode("roam");
  controls.requestLock();
  setTimeout(() => splash.classList.add("hidden"), 700);
}
document.getElementById("enter-btn").addEventListener("click", enterMuseum);
splash.addEventListener("click", enterMuseum);

// clicking the scene re-acquires the lock; a click that wasn't a drag counts
// as an interaction (handled through the controls so dragging never fires it)
canvas.addEventListener("click", () => {
  if (mode === "roam" && controls.fpv && !controls.locked) controls.requestLock();
});
controls.onClick = () => {
  if (mode === "roam" && currentTarget) activate(currentTarget.id);
};
document.addEventListener("mousedown", (e) => {
  if (mode === "roam" && controls.locked && currentTarget && e.button === 0) {
    activate(currentTarget.id);
  }
});

if (viewBtn) {
  viewBtn.addEventListener("click", (e) => { e.stopPropagation(); setView(!controls.fpv); });
}

document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (mode === "splash" && (k === "enter" || k === " " || k === "e")) { enterMuseum(); return; }
  if (mode !== "roam") return;
  if (k === "e" && currentTarget) activate(currentTarget.id);
  else if (k === "v") setView(!controls.fpv);
});

function activate(id) {
  if (id === "ucl") {
    setMode("magazine");
    controls.releaseLock();
    magazine.show({
      kicker: "European Cup · UEFA Champions League",
      title: "The Fifteen — Kings of Europe",
      pages: buildUCLPages(),
    });
  } else if (id === "statue") {
    setMode("magazine");
    controls.releaseLock();
    magazine.show({
      kicker: "Individual Glory",
      title: "Ballon d'Or Winners in White",
      pages: buildBallonPages(),
    });
  } else if (id === "domestic") {
    setMode("magazine");
    controls.releaseLock();
    magazine.show({
      kicker: "Spanish Football",
      title: "Domestic Honours",
      pages: buildDomesticPages(),
    });
  } else if (id === "painting") {
    painting.toggle(); // stays in roam mode; the artwork morphs in place
  }
}

/* ------------------------------------------------ proximity + prompt */
const statuePos = museum.anchors.statue.clone();
const paintingPos = museum.anchors.painting.clone();

function updatePrompt() {
  if (mode !== "roam") {
    promptEl.classList.add("hidden");
    return;
  }
  currentTarget = null;
  let found = null;

  // painting works on proximity (per spec) and needs a shorter range
  const player = controls.eye();
  const dPaint = player.distanceTo(paintingPos);
  if (dPaint < 3.6) {
    found = interactables.find((i) => i.id === "painting");
  } else {
    const pick = controls.pickInteractable(interactables.filter((i) => i.id !== "painting"), 4.6);
    if (pick) found = pick.item;
    // statue: generous proximity fallback (its hit box is thin vs. the ray)
    if (!found && player.distanceTo(statuePos) < 4.2) {
      found = interactables.find((i) => i.id === "statue");
    }
  }

  if (found) {
    currentTarget = found;
    promptEl.innerHTML = found.prompt;
    promptEl.classList.remove("hidden");
  } else {
    promptEl.classList.add("hidden");
  }
}

/* ------------------------------------------------ resize + loop */
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// debug/testing hooks (harmless in production)
window.__museum = {
  activate,
  setView,
  enter: enterMuseum,
  lib,
  warp(x, z, yaw = 0, pitch = 0) { controls.setPose(x, z, yaw, pitch); },
  get mode() { return mode; },
  get target() { return currentTarget?.id ?? null; },
  paintingNew: () => painting.isNew(),
  get fpv() { return controls.fpv; },
  get player() { return controls.pos.toArray(); },
  scene, camera, renderer, controls, avatar, THREE,
};

// tell the boot guard in index.html that the scene is alive
dispatchEvent(new Event("museum-ready"));

const clock = new THREE.Clock();
let simTime = 0;

/** One step of world logic. Split out from the render loop so tests can drive
 *  the museum deterministically without waiting on the compositor. */
function step(dt) {
  simTime += dt;
  const t = simTime;
  controls.update(dt);
  avatar.group.position.set(controls.pos.x, 0, controls.pos.z);
  avatar.update(dt, mode === "roam" ? controls.speed : 0, controls.moveYaw);
  avatar.group.visible = controls.blend < 0.86;
  statue.update(t, dt);
  flags.update(t);
  painting.update(dt);
  updatePrompt();
}

window.__museum.step = (dt = 1 / 60, n = 1) => { for (let i = 0; i < n; i++) step(dt); };

function loop() {
  requestAnimationFrame(loop);
  // A long stall (tab switch, a GC pause, the statue models decoding) would
  // otherwise be integrated as one huge step and lurch the player forward.
  // Treat anything over 120 ms as a dropped frame instead.
  const raw = clock.getDelta();
  step(raw > 0.12 ? 1 / 60 : Math.min(raw, 0.05));
  renderer.render(scene, camera);
}
loop();
