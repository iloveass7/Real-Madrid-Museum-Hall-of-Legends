# Real Madrid Museum — Features Implementation Guide (Code Map)

> A complete, file-by-file technical reference detailing **how** and **where** every feature of the **Real Madrid Museum — Hall of Legends** is implemented in the codebase.

---

## Table of Contents

1. [Architecture & Subsystem Overview](#1-architecture--subsystem-overview)
2. [Feature Implementation Matrix](#2-feature-implementation-matrix)
3. [Deep-Dive: How and Where Features are Implemented](#3-deep-dive-how-and-where-features-are-implemented)
   - [Feature 01: 3D Scene Architecture & Gallery Structure](#feature-01-3d-scene-architecture--gallery-structure)
   - [Feature 02: Procedural & Photo-Based PBR Texturing System](#feature-02-procedural--photo-based-pbr-texturing-system)
   - [Feature 03: Dual-Mode Camera System (FPV & Eagle-Eye Orbit)](#feature-03-dual-mode-camera-system-fpv--eagle-eye-orbit)
   - [Feature 04: Camera-Relative Locomotion & Exponential Damping](#feature-04-camera-relative-locomotion--exponential-damping)
   - [Feature 05: Mouse-Look (Pointer Lock API & Click-and-Drag Fallback)](#feature-05-mouse-look-pointer-lock-api--click-and-drag-fallback)
   - [Feature 06: AABB Collision Detection, Clamping & Anti-Stuck Solver](#feature-06-aabb-collision-detection-clamping--anti-stuck-solver)
   - [Feature 07: Dynamic Layered Lighting & PCF Soft Shadows](#feature-07-dynamic-layered-lighting--pcf-soft-shadows)
   - [Feature 08: Custom GLSL Vertex Shader for Cloth Simulation](#feature-08-custom-glsl-vertex-shader-for-cloth-simulation)
   - [Feature 09: Procedurally Lathed & Swept Trophy Silverware](#feature-09-procedurally-lathed--swept-trophy-silverware)
   - [Feature 10: Cristiano Ronaldo Statue (glTF Rigging & Composite Sculpting)](#feature-10-cristiano-ronaldo-statue-gltf-rigging--composite-sculpting)
   - [Feature 11: Interactive Exhibits & Proximity / Line-of-Sight Raycasting](#feature-11-interactive-exhibits--proximity--line-of-sight-raycasting)
   - [Feature 12: Historical Data Archives & Digital Magazine Modal System](#feature-12-historical-data-archives--digital-magazine-modal-system)
   - [Feature 13: Animated Visitor Avatar (Walk Cycle & Turn-to-Face)](#feature-13-animated-visitor-avatar-walk-cycle--turn-to-face)
   - [Feature 14: Santiago Bernabéu Time-Travel Painting Cross-Fade](#feature-14-santiago-bernabéu-time-travel-painting-cross-fade)
   - [Feature 15: Baked PMREM Studio Environment Map](#feature-15-baked-pmrem-studio-environment-map)
   - [Feature 16: ACES Filmic Tone Mapping & Atmospheric Fog](#feature-16-aces-filmic-tone-mapping--atmospheric-fog)
   - [Feature 17: Window-Resize & Screen DPI Responsive Rendering](#feature-17-window-resize--screen-dpi-responsive-rendering)
   - [Feature 18: Automated Headless Testing & Screenshot QA Tooling](#feature-18-automated-headless-testing--screenshot-qa-tooling)
   - [Feature 19: Sprint Movement & Footstep Head-Bobbing](#feature-19-sprint-movement--footstep-head-bobbing)
   - [Feature 20: Mobile / Touch Control Fallbacks & Boot Guard Protocol](#feature-20-mobile--touch-control-fallbacks--boot-guard-protocol)
4. [File-to-Feature Quick Index](#4-file-to-feature-quick-index)

---

## 1. Architecture & Subsystem Overview

The project is structured into three clean layers: **World/3D Scene**, **Player Systems**, and **UI/Data**, orchestrated by [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js):

```
Browser (index.html, styles.css)
 │
 ├── Core Orchestrator: src/main.js
 │    ├── Scene Graph (THREE.Scene, Fog, Tone Mapping, PMREM Env Map)
 │    ├── Game / Render Loop (requestAnimationFrame, step(dt), Clock clamping)
 │    └── Interaction Coordinator (HUD prompt raycasting, Exhibit modals)
 │
 ├── World Subsystem: src/world/
 │    ├── museum.js    <- Enclosed hall (walls, columns, doors, carpet cross, gallery wash)
 │    ├── textures.js  <- TextureLibrary (procedural 2D canvas synthesis + photo overlays)
 │    ├── trophies.js  <- Parametric silverware (LatheGeometry & extruded CatmullRom handles)
 │    ├── exhibits.js  <- UCL 15-cup wall, domestic pedestals, Bernabéu time-travel frame
 │    ├── statue.js    <- CR7 monument (Mixamo skeletal re-posing + scanned head + stone PBR)
 │    └── flags.js     <- Club banners (Custom GLSL vertex shader onBeforeCompile)
 │
 ├── Player Subsystem: src/player/
 │    ├── controls.js  <- PlayerControls (FPS / Orbit dual-cam, AABB collision, drag-look)
 │    └── avatar.js    <- Third-person 3D visitor avatar (procedural mesh + walk swing)
 │
 └── UI & Data Subsystem:
      ├── src/ui/magazine.js <- Modal controller (paging, anti-flash guard, keyboard listeners)
      ├── src/ui/pages.js    <- HTML page generators with procedural SVG/Canvas fallback cards
      └── src/data/history.js<- Static curated records (15 UCL finals, 8 Ballon d'Or, trophies)
```

---

## 2. Feature Implementation Matrix

| # | Feature | Status | Primary Code Files | Key Functions / Symbols |
|---|---|---|---|---|
| **1** | 3D Scene Architecture & Gallery Construction | **Implemented** | [`src/world/museum.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/museum.js)<br>[`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js) | `buildMuseum()`, `ROOM`, `wall()`, `colGeo` |
| **2** | Procedural + Photo-Based PBR Texturing | **Implemented** | [`src/world/textures.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/textures.js)<br>[`assets/manifest.json`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/assets/manifest.json) | `TextureLibrary`, `make()`, `init()`, `_paint()` |
| **3** | Dual-Mode Camera (FPV / Eagle-Eye Orbit) | **Implemented** | [`src/player/controls.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/controls.js)<br>[`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js) | `_updateCamera()`, `setView()`, `smoothstep()` |
| **4** | Camera-Relative Locomotion & Exponential Damping | **Implemented** | [`src/player/controls.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/controls.js) | `_move()`, `_bindInput()`, `keys` Set |
| **5** | Mouse-Look (Pointer Lock & Drag Fallback) | **Implemented** | [`src/player/controls.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/controls.js)<br>[`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js) | `_look()`, `requestLock()`, `releaseLock()`, `pointerdown/move/up` |
| **6** | AABB Collision Detection & Anti-Stuck Solver | **Implemented** | [`src/player/controls.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/controls.js)<br>[`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js) | `_blocked()`, `_unstick()`, `solidColliders()`, `THREE.Box3` |
| **7** | Dynamic Layered Lighting & PCF Soft Shadows | **Implemented** | [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js)<br>[`src/world/museum.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/museum.js)<br>[`src/world/statue.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/statue.js) | `PCFSoftShadowMap`, `HemisphereLight`, `SpotLight`, `PointLight` |
| **8** | Custom GLSL Vertex Shader for Club Banners | **Implemented** | [`src/world/flags.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/flags.js) | `clothMaterial()`, `onBeforeCompile`, `wave(uv)` |
| **9** | Procedurally Lathed & Swept Trophy Models | **Implemented** | [`src/world/trophies.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/trophies.js) | `createEuropeanCup()`, `ribbon()`, `lathe()`, `CatmullRomCurve3` |
| **10** | Cristiano Ronaldo Statue (glTF Rig & Stone Shader)| **Implemented** | [`src/world/statue.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/statue.js) | `buildStatue()`, `aim()`, `twist()`, `stoneMaterial()`, `stoneMaps()` |
| **11** | Interactive Exhibits & Raycasting Detection | **Implemented** | [`src/player/controls.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/controls.js)<br>[`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js) | `pickInteractable()`, `updatePrompt()`, `activate()` |
| **12** | Historical Data Archives & Digital Magazine Reader | **Implemented** | [`src/ui/magazine.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/ui/magazine.js)<br>[`src/ui/pages.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/ui/pages.js)<br>[`src/data/history.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/data/history.js) | `Magazine`, `show()`, `render()`, `buildUCLPages()`, `fallbackCard()` |
| **13** | Animated Eagle-Eye Visitor Avatar | **Implemented** | [`src/player/avatar.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/avatar.js) | `createAvatar()`, `update()`, shoulder/hip pivots |
| **14** | Santiago Bernabéu Painting Cross-Fade | **Implemented** | [`src/world/exhibits.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/exhibits.js) | `buildPainting()`, `toggle()`, `update()`, `planeNew.material.opacity` |
| **15** | Baked PMREM Studio Reflection Environment Map | **Implemented** | [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js) | `THREE.PMREMGenerator`, `fromScene()`, `scene.environment` |
| **16** | ACES Filmic Tone Mapping & Atmospheric Fog | **Implemented** | [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js) | `renderer.toneMapping`, `renderer.toneMappingExposure`, `THREE.Fog` |
| **17** | Window-Resize & High-DPI Responsive Rendering | **Implemented** | [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js) | `addEventListener("resize")`, `renderer.setPixelRatio` |
| **18** | Headless Testing & Screenshot Automation | **Implemented** | [`tools/selftest.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/tools/selftest.js)<br>[`tools/collisiontest.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/tools/collisiontest.js)<br>[`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js) | `window.__museum.step()`, Playwright runner |
| **19** | Sprint Movement & Footstep Head-Bobbing | **Implemented** | [`src/player/controls.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/controls.js) | `SPRINT`, `bobT`, `Math.sin(this.bobT) * 0.028` |
| **20** | Mobile / Touch Control Fallbacks & Boot Guard | **Partial / Resilient** | [`index.html`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/index.html)<br>[`src/player/controls.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/controls.js) | Boot guard diagnostics; pointerdown touch drag fallback |

---

## 3. Deep-Dive: How and Where Features are Implemented

---

### Feature 01: 3D Scene Architecture & Gallery Structure

#### Where:
- **File:** [`src/world/museum.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/museum.js#L5-L181)
- **Anchors & Scene Graph wiring:** [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js#L56-L64)

#### How:
1. **Gallery Dimensions:** Defined by the `ROOM` constant (lines 5–6):
   $$\text{Width } (X) = 40 \quad [-20, 20], \quad \text{Depth } (Z) = 26 \quad [-13, 13], \quad \text{Height } (Y) = 6$$
2. **Floor and Ceiling:**
   - Floor: `PlaneGeometry(40, 26)` rotated by $-\pi/2$ on the X-axis, textured with high-resolution polished Carrara marble terrazzo (`roughness: 0.25, metalness: 0.05`), with `receiveShadow = true` (lines 27–30).
   - Ceiling: `PlaneGeometry(40, 26)` rotated by $+\pi/2$ at $Y = 6$, textured with an acoustic/LED grid pattern (lines 32–35).
   - Carpet Cross: Two intersecting runners (`carpetA` of $30 \times 3.2$ and `carpetB` of $24 \times 3.2$) elevated by $Y = 0.012$ to prevent Z-fighting (lines 38–48).
3. **Walls & Colliders:**
   - Four perimeter slabs (`BoxGeometry`) with wall thickness $T = 0.5$. Each wall mesh pushes a pre-computed `THREE.Box3` bounding volume into `colliders[]` (lines 51–64).
4. **Architectural Columns:**
   - 8 structural columns arranged in pairs at $X \in \{-14, -6, 0, 18\}$ and $Z \in \{-9/11, 9/11\}$.
   - Built from three elements: dark marble fluted plinth (`CylinderGeometry`), shaft (`CylinderGeometry`, roughness 0.45), and gold ionic-styled capital (`CylinderGeometry`, lines 67–89).
5. **Entrance Doors & Glass Material:**
   - Located at $X = -14, Z = -13$. Wooden frame with dual glass leaves using `MeshPhysicalMaterial({ transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1 })` and brass grab-bars (lines 91–110).
6. **Gallery Wall Posters:**
   - 6 historical club posters (`poster_hala`, `poster_kings`, `poster_1902`, `poster_galacticos`, `poster_cr7`, `poster_decima`) framed in dark mahogany wood along the gallery perimeter (lines 115–140).

---

### Feature 02: Procedural & Photo-Based PBR Texturing System

#### Where:
- **Core Library Class:** [`src/world/textures.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/textures.js#L17-L226)
- **Asset Index / Manifest:** [`assets/manifest.json`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/assets/manifest.json)
- **Downloader Tooling:** [`tools/download_assets.py`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/tools/download_assets.py)

#### How:
1. **Zero-Dependency Bootstrapping (`TextureLibrary.make()`):**
   - Renders procedural textures directly onto an off-screen HTML5 `<canvas>` element (lines 37–53).
   - Wraps the canvas in `THREE.CanvasTexture(canvas)`. Configures maximum hardware anisotropy (`renderer.capabilities.getMaxAnisotropy()`) for sharp oblique viewing angles.
2. **Procedural Generators:**
   - `marbleFloor()`: Draws tile grids, random Perlin-style mineral specks, and multi-layered marble veining (lines 160–205).
   - `wood()`: Simulates mahogany/oak grain using layered Bézier curves (lines 240–280).
   - `crest()` & `drawCrest()`: Mathematically draws the Real Madrid badge: royal crown, gold roundel, mulberry diagonal band, and interlaced RMCF monogram (lines 20–88).
   - `plaque()`: Gold border gradients with engraved serif text styling (lines 330–365).
3. **Asynchronous Non-Blocking Photo Upgrade (`_paint()`):**
   - At boot, `await lib.init()` loads `assets/manifest.json` (lines 27–34).
   - If an archival image exists (e.g., Wikimedia photos in `assets/img/`), an `Image` is fetched in the background. Once loaded, `ctx.drawImage()` paints the real photo over the procedural canvas, and `texture.needsUpdate = true` signals the GPU to update the texture buffer (lines 61–105).
   - If offline or files are missing, the procedural textures remain permanently without throwing errors.

---

### Feature 03: Dual-Mode Camera System (FPV & Eagle-Eye Orbit)

#### Where:
- **Camera Controller:** [`src/player/controls.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/controls.js#L278-L315)
- **Mode Toggle & View Binding:** [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js#L142-L148)

#### How:
1. **Single Camera Object Architecture:**
   - Both modes share one `THREE.PerspectiveCamera(72, aspect, 0.1, 90)` (main.js, line 30), preventing viewport blackouts or re-allocations.
2. **Continuous Interpolation (`blend` factor):**
   - `this.blend` lerps continuously between `1.0` (First-Person View) and `0.0` (Eagle-Eye):
     $$\text{blend} \leftarrow \text{blend} + (\text{target} - \text{blend}) \cdot \min(1, 6 \cdot dt)$$
   - Uses Hermite smoothstep easing: $S(x) = x^2 (3 - 2x)$ (lines 281–284).
3. **Eagle-Eye Spherical Orbit Trigonometry:**
   - Focuses on a target point slightly below the avatar's head: $\vec{T} = (x, 1.27, z)$.
   - Camera position is calculated on a sphere of radius `this.dist` (clamped between 3.2m and 16m):
     $$x_{\text{orbit}} = T_x + \sin(\text{yaw}) \cdot \cos(\text{pitch}_{\text{eagle}}) \cdot \text{dist}$$
     $$y_{\text{orbit}} = T_y + \sin(\text{pitch}_{\text{eagle}}) \cdot \text{dist}$$
     $$z_{\text{orbit}} = T_z + \cos(\text{yaw}) \cdot \cos(\text{pitch}_{\text{eagle}}) \cdot \text{dist}$$
   - **Boundary Clamping:** Clamps $x_{\text{orbit}}$ and $z_{\text{orbit}}$ within the room boundaries so the camera can never clip outside the museum walls (lines 298–301).
4. **Dynamic FOV Cross-Fade:**
   - Linearly interpolates FOV between $52^\circ$ (tight third-person view) and $72^\circ$ (wide first-person view), updating the projection matrix only when changed (lines 313–315).

---

### Feature 04: Camera-Relative Locomotion & Exponential Damping

#### Where:
- **File:** [`src/player/controls.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/controls.js#L170-L221)

#### How:
1. **Key State Tracking:**
   - Keydown and keyup events add/remove keys (`KeyW`, `KeyA`, `KeyS`, `KeyD`, `ArrowUp`, etc.) into a `Set()`, decoupling movement from operating-system key-repeat rates (lines 80–90).
2. **Cardinal Normalization & 2D Yaw Rotation:**
   - Normalizes held keys into $(\text{fwd}, \text{strafe})$ so diagonal motion does not exceed cardinal walking speed:
     $$d_x = \text{strafe} \cdot \cos(\text{yaw}) - \text{fwd} \cdot \sin(\text{yaw})$$
     $$d_z = -\text{strafe} \cdot \sin(\text{yaw}) - \text{fwd} \cdot \cos(\text{yaw})$$
3. **Frame-Rate Independent Velocity Damping:**
   - Smoothly accelerates and decelerates using an analytical exponential decay:
     $$\vec{v} \leftarrow \text{lerp}\left(\vec{v}, \, \vec{d} \cdot \text{speed}, \, 1 - e^{-12 \cdot dt}\right)$$
   - This ensures movement feels equally responsive at 30 fps, 60 fps, or 144 fps without jerking (line 195).

---

### Feature 05: Mouse-Look (Pointer Lock API & Click-and-Drag Fallback)

#### Where:
- **File:** [`src/player/controls.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/controls.js#L92-L162)
- **Lock Management:** [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js#L158, #L166-L176)

#### How:
1. **Pointer Lock API:**
   - Calls `canvas.requestPointerLock()`. Reads raw `e.movementX` and `e.movementY`.
   - **Post-Lock Jump Protection:** Automatically discards the very first event after pointer-lock engagement (`this._skipNextMove = true`) to discard any cursor center-warp spike (lines 100–104).
   - **Delta Clamping:** Clamps raw movement deltas to $\pm 160\text{px}$ to prevent view flips on CPU spikes.
2. **Pitch Clamping:**
   - Vertical look angle `pitchFP` is clamped to $[-1.45, 1.45]$ radians ($\approx \pm 83^\circ$) to prevent camera inversion (line 159).
3. **Drag-to-Look Fallback (Zero-Lock Reliance):**
   - Listens for `pointerdown`, `pointermove`, and `pointerup`.
   - If pointer lock is denied, canceled by `Esc`, or running in an unsupported browser, dragging on the canvas updates yaw and pitch smoothly with sensitivity factor $0.0032$ (lines 115–140).
   - A movement threshold ($\le 14\text{px}$) differentiates between a brief look-drag and an intentional left-click interaction.

---

### Feature 06: AABB Collision Detection, Clamping & Anti-Stuck Solver

#### Where:
- **Physics Solver:** [`src/player/controls.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/controls.js#L197-L276)
- **Collider Extraction:** [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js#L70-L91)

#### How:
1. **Dynamic Geometry-Derived Colliders (`solidColliders()`):**
   - Automatically computes `THREE.Box3` bounding boxes from the actual visual meshes marked `userData.solid = true`. If a model changes position, its collision boundary updates automatically (main.js, lines 70–83).
2. **Axis-Separated Clamping (`_blocked()`):**
   - Player movement is separated into X and Z updates rather than a single 2D vector step.
   - For each axis, the player's bounding radius ($R = \text{RADIUS} + \text{SKIN} = 0.41\text{m}$) is checked against the collider's extent. If penetrating, the player is clamped to the boundary face they entered from, eliminating the common bug of teleporting sideways around corners (lines 225–248).
3. **Dual-Pass Re-Check:**
   - Runs two sequential passes: clamping on the X-axis can push the player into an adjacent Z-aligned obstacle; the second pass resolves any newly created intersection (lines 210–213).
4. **Deepest-Penetration Unstick Routine (`_unstick()`):**
   - If the player somehow spawns or clips inside an obstacle, the routine calculates the minimum penetration depth across all overlapping boxes:
     $$\text{depth} = \min(x - x_{\min}, \, x_{\max} - x, \, z - z_{\min}, \, z_{\max} - z)$$
   - Rather than popping the player instantly, it gently eases them out along the shallowest axis at $3.6\text{ m/s}$ until clear (lines 254–276).

---

### Feature 07: Dynamic Layered Lighting & PCF Soft Shadows

#### Where:
- **Renderer Setup:** [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js#L21-L24)
- **Ambient & Ceiling Grid:** [`src/world/museum.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/museum.js#L143-L167)
- **Exhibit Spotlights:** [`src/world/exhibits.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/exhibits.js#L110-L125, #L160-L170)
- **Dynamic Monument Lights:** [`src/world/statue.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/statue.js#L815-L855)

#### How:
1. **Shadow Engine:**
   - Enables `renderer.shadowMap.enabled = true` using `THREE.PCFSoftShadowMap` for antialiased, soft contact shadows beneath trophies, pedestals, and columns (main.js, line 22).
2. **Layered Illumination Structure:**
   - **Base Wash:** `HemisphereLight(0xf2f6ff, 0x2b2d33, 0.55)` delivers a cool gallery skylight/ground bounce, while `AmbientLight(0xffffff, 0.18)` prevents shadow areas from crushing to absolute black.
   - **Ceiling Grid:** 8 downward-directed `SpotLight(0xe6edff, 24, 16, Math.PI / 5.4)` units wash the main walking runners.
   - **Entrance Sconces:** 2 warm `PointLight(0xffd9a0, 7, 7, 1.8)` lamps flank the entry doors.
   - **Exhibit Accent Lights:** Warm spotlights (`#ffe9c4`, `#fff0d4`) illuminate each silverware pedestal.
3. **Animated Orbiting Spotlights:**
   - In `src/world/statue.js`, three dynamic spotlights orbit around the Cristiano Ronaldo monument in real time:
     $$x(t) = \text{anchor}_x + \cos(t \cdot \omega_i) \cdot r_i, \quad z(t) = \text{anchor}_z + \sin(t \cdot \omega_i) \cdot r_i$$
   - Spotlights slowly shift colors over time, creating shifting bronze and stone highlights across the statue's muscular anatomy.

---

### Feature 08: Custom GLSL Vertex Shader for Cloth Simulation

#### Where:
- **File:** [`src/world/flags.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/flags.js#L205-L254)

#### How:
1. **Shader Injection via `onBeforeCompile`:**
   - Patches Three.js's native `MeshStandardMaterial` instead of writing an isolated raw shader, allowing the animated cloth to automatically participate in PBR lighting, roughness maps, and receive/cast PCF shadows (lines 212–252).
2. **Wave Equation with Slack & Edge Attenuation:**
   - Displaces vertex position along the surface normal using two travelling sine waves:
     $$\text{slack} = (1.0 - uv.y)^{1.35}, \quad \text{edge} = 0.45 + 0.55 \cdot |uv.x - 0.5| \cdot 2.0$$
     $$p_1 = \sin(7.0 \cdot uv.x + 2.2 \cdot uv.y - 1.7 \cdot t + \text{seed})$$
     $$p_2 = \sin(3.1 \cdot uv.x - 4.0 \cdot uv.y + 1.15 \cdot t + 1.7 \cdot \text{seed})$$
     $$\Delta z = (0.42 \cdot p_1 + 0.58 \cdot p_2) \cdot \text{slack} \cdot \text{edge} \cdot 0.12$$
   - The slack term ensures the cloth is pinned rigidly at the top rod ($uv.y = 1.0$) and flaps freely at the hem ($uv.y = 0.0$).
3. **Analytical Normal Derivation:**
   - Rather than re-approximating normals across neighboring triangles, partial derivatives $\frac{\partial z}{\partial x}$ and $\frac{\partial z}{\partial y}$ are derived analytically inside GLSL:
     $$\vec{N} = \text{normalize}\begin{pmatrix} -\frac{\partial z}{\partial x}, & -\frac{\partial z}{\partial y}, & 1.0 \end{pmatrix}$$
   - Injected into `#include <beginnormal_vertex>`, causing specular highlights to billow realistically across the cloth folds (lines 228–244).
4. **Hem Lift & Sway:**
   - In `#include <begin_vertex>`, pulls vertices vertically toward the viewer as displacement increases:
     $$\Delta y = -|\Delta z| \cdot 0.25 \cdot (1.0 - uv.y)^2$$
   - Adds realistic gravity lift as the banner hem billows (lines 248–250).

---

### Feature 09: Procedurally Lathed & Swept Trophy Silverware

#### Where:
- **Silverware Geometries:** [`src/world/trophies.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/trophies.js#L60-L234)
- **Exhibit Mounting:** [`src/world/exhibits.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/exhibits.js#L77-L108, #L130-L160)

#### How:
1. **Revolved Lathe Bodies (`THREE.LatheGeometry`):**
   - Each trophy's profile is hand-tuned from authentic silhouette cross-sections:
     - **European Cup ("La Orejona"):** 25-point profile from base plinth, waisted stem, swelling belly, to the distinctive flared outer/inner lip (lines 70–79).
     - **La Liga Trophy:** Tall slender amphora on an elongated flute with a stepped rim (lines 140–165).
     - **Copa del Rey:** Wide fluted urn with a stepped pedestal and football finial lid (lines 170–205).
     - **Supercopa de España:** Broad shallow chalice on a narrow brass waist (lines 210–234).
2. **Swept Ribbon Handles (`ribbon()`):**
   - Real trophy handles are flat scrolls, not round circular tubes.
   - Handles are constructed using `THREE.CatmullRomCurve3` with an extruded rectangular `THREE.Shape`. The extrusion aligns along the curve's normal/binormal frame, creating flat scrollwork broadside to the viewer (lines 36–51).

---

### Feature 10: Cristiano Ronaldo Statue (glTF Rigging & Composite Sculpting)

#### Where:
- **File:** [`src/world/statue.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/statue.js#L18-L860)

#### How:
1. **glTF Asset Integration:**
   - Uses `GLTFLoader` to import Mixamo rigged skeleton (`Xbot.glb`) and scanned head geometry (`LeePerrySmith.glb`) from `assets/models/` (lines 12–16, 750–790).
2. **Quaternion Skeletal Re-Posing:**
   - Implements two orientation helpers, `aim(bone, dir)` and `twist(bone, angle)`:
     - Calculates world vectors between parent and child joints using `bone.matrixWorld`.
     - Computes the quaternion delta required to point the bone segment toward the target pose:
       $$q = \text{Quaternion().setFromUnitVectors}(\vec{v}_{\text{current}}, \vec{v}_{\text{target}})$$
     - Premultiplies the delta onto the bone's local quaternion: $\text{bone.quaternion} \leftarrow q \cdot \text{bone.quaternion}$ (lines 78–120).
   - Transforms the default Mixamo T-pose into Cristiano Ronaldo's iconic "Siuu" celebration stance (spread legs, arched back, down-thrust arms).
3. **Procedural Athletic Kit Mesh:**
   - Generates carved shorts, shirt sleeves, socks, and boots dynamically between joint positions (`LeftUpLeg`, `LeftLeg`, `Spine`, etc.) using interpolated tube geometries, ensuring the clothing conforms to the re-posed skeleton (lines 280–420).
4. **Head Reshaping & Weathered Stone PBR Material:**
   - Slices the scanned head at the neck, widens the jawline, sharpens the brow ridges, and attaches hand-modeled swept hair quiff geometry using `BufferGeometryUtils.mergeVertices` (lines 450–550).
   - Unifies all geometries under `stoneMaterial()`: a procedural dual-layer texture combining 512×512 granular chisel noise bump mapping with subtle marble vein albedo stains (lines 22–68).

---

### Feature 11: Interactive Exhibits & Proximity / Line-of-Sight Raycasting

#### Where:
- **Raycasting Engine:** [`src/player/controls.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/controls.js#L317-L330)
- **Prompt Logic & Triggers:** [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js#L220-L253, #L182-L218)

#### How:
1. **Line-of-Sight Raycasting (`pickInteractable`):**
   - Casts a `THREE.Raycaster` from the player's eye height along the camera forward vector:
     $$\vec{O} = \text{controls.eye}(), \quad \vec{D} = \text{controls.forward}(), \quad \text{range} = 4.6\text{m}$$
   - Checks against invisible interactive bounding hitboxes registered for each exhibit (controls.js, lines 318–325).
2. **Proximity Fallbacks:**
   - In `updatePrompt()`:
     - Santiago Bernabéu painting uses direct proximity check ($\text{distance} < 3.6\text{m}$) so approaching it triggers the prompt regardless of mouse pitch (main.js, lines 233–236).
     - CR7 statue includes a radial fallback ($\text{distance} < 4.2\text{m}$) to ensure reliable interaction with the large monument (lines 241–243).
3. **Action Dispatcher (`activate(id)`):**
   - Pressing **`E`** or left-clicking when an exhibit is targeted executes `activate()`:
     - `ucl`: Opens European Cup 15-chapter magazine.
     - `statue`: Opens Ballon d'Or winners gallery.
     - `domestic`: Opens Spanish domestic honours album.
     - `painting`: Toggles historical Bernabéu painting in-place (lines 190–218).

---

### Feature 12: Historical Data Archives & Digital Magazine Modal System

#### Where:
- **Data Repository:** [`src/data/history.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/data/history.js)
- **Modal Controller:** [`src/ui/magazine.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/ui/magazine.js)
- **HTML Page Builders:** [`src/ui/pages.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/ui/pages.js)

#### How:
1. **Curated Football Historical Data:**
   - `UCL_FINALS`: Array of all 15 European Cup victories (year, opponent, score, venue, match notes from 1956 Stade de Reims to 2024 Borussia Dortmund).
   - `BALLON_DOR`: 8 Real Madrid winners (Di Stéfano, Kopa, Figo, Ronaldo Nazário, Cannavaro, Cristiano Ronaldo, Modrić, Benzema).
   - `LA_LIGA`, `COPA_DEL_REY`, `SUPERCOPA`: Title counts, championship year lists, and historical summaries.
2. **Modal Controller (`Magazine`):**
   - Controls `#magazine` overlay, `#mag-page` DOM container, and `#mag-prev` / `#mag-next` buttons (magazine.js, lines 10–35).
   - **Debounced Anti-Flash Guard:** Tracks `openedAt = performance.now()`. Ignores clicks within 350ms of opening to prevent the opening click from instantly dismissing the modal (lines 38–45).
   - Disables `PlayerControls` when open, releases pointer lock, and consumes arrow/escape keys so inputs do not leak to the 3D player (lines 48–60).
3. **Procedural Fallback Cards (`fallbackCard()`):**
   - In `src/ui/pages.js`, if an archival image has not been downloaded, `fallbackCard()` dynamically generates a 2D canvas card with dark blue gradients, gold borders, silver trophy silhouettes, and an "ARCHIVE IMAGE" watermark, cached in a `Map()` to prevent re-rendering (lines 20–60).

---

### Feature 13: Animated Visitor Avatar (Walk Cycle & Turn-to-Face)

#### Where:
- **File:** [`src/player/avatar.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/avatar.js#L10-L165)
- **Render Loop Updates:** [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js#L289-L291)

#### How:
1. **Procedural Humanoid Primitives:**
   - Built entirely without external assets using Three.js primitives:
     - Torso: Tapered `LatheGeometry` forming the Real Madrid home shirt with navy collar and number "7" back decal.
     - Head: `SphereGeometry` with stylized hair cap and skin tone material.
     - Limbs: `CapsuleGeometry` legs, white shorts, white socks, and dark boots.
   - Arms and legs are parented to shoulder and hip pivot `Group`s so rotational transformations swing naturally around the joints (lines 25–95).
2. **Walk Cycle Animation:**
   - Advances a walk-phase angle: $\phi \leftarrow \phi + dt \cdot \text{speed} \cdot 4.2$.
   - Applies alternating sine rotations to opposing limbs:
     $$\text{leg}_{\text{left}}.rotation.x = \sin(\phi) \cdot 0.65, \quad \text{leg}_{\text{right}}.rotation.x = -\sin(\phi) \cdot 0.65$$
     $$\text{arm}_{\text{left}}.rotation.x = -\sin(\phi) \cdot 0.55, \quad \text{arm}_{\text{right}}.rotation.x = \sin(\phi) \cdot 0.55$$
3. **Turn-to-Face Movement Direction:**
   - When moving, the avatar smoothly rotates its Y-axis yaw toward the velocity vector using shortest-arc angle interpolation:
     $$\Delta \theta = \text{normalizeAngle}(\text{moveYaw} - \text{currentFacing})$$
     $$\text{currentFacing} \leftarrow \text{currentFacing} + \Delta \theta \cdot \min(1, 10 \cdot dt)$$
4. **First-Person Invisibility:**
   - In `main.js`, `avatar.group.visible = controls.blend < 0.86`, ensuring the avatar automatically disappears when transitioning to first-person view (line 291).

---

### Feature 14: Santiago Bernabéu Time-Travel Painting Cross-Fade

#### Where:
- **File:** [`src/world/exhibits.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/exhibits.js#L180-L260)

#### How:
1. **Dual Overlapping Canvas Planes:**
   - On the west wall anchor, creates two identical rectangular meshes within an ornate mahogany picture frame:
     - `planeOld`: Textured with 1947 classic stadium art (`stadiumArt("old")`).
     - `planeNew`: Textured with 2024 renovated stadium art (`stadiumArt("new")`) placed $0.002\text{m}$ forward, configured with `transparent: true, opacity: 0.0` (lines 195–225).
2. **Cross-Fade State Machine:**
   - Calling `painting.toggle()` inverts `showNew = !showNew`.
   - In `painting.update(dt)`, target opacity lerps smoothly:
     $$\text{opacity} \leftarrow \text{opacity} + (\text{target} - \text{opacity}) \cdot \min(1, 4.0 \cdot dt)$$
3. **Picture Light Intensity Modulation:**
   - Above the frame, a gold picture light (`SpotLight`) dynamically flares its intensity up during the cross-fade transition and returns to normal resting brightness once settled, providing interactive visual feedback (lines 245–258).

---

### Feature 15: Baked PMREM Studio Environment Map

#### Where:
- **File:** [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js#L32-L50)

#### How:
1. **Zero-HDRI File Architecture:**
   - Rather than forcing the browser to download a heavy 10–20 MB `.hdr` environment file over the network, a virtual studio lighting rig is constructed using an offscreen `THREE.Scene()` containing five emissive colored boxes (lines 33–46):
     - Cool soft back wall: `0x8fa3bf`
     - Two warm key light panels: `0xfff1d0` (intensity 2.4 and 2.0)
     - Warm gold floor-bounce panel: `0xc9a96a` (intensity 1.1)
     - Navy fill panel: `0x33415e`
2. **PMREM Convolution:**
   - Passes the offscreen scene to `THREE.PMREMGenerator(renderer)`:
     ```js
     const pmrem = new THREE.PMREMGenerator(renderer);
     scene.environment = pmrem.fromScene(env, 0.09).texture;
     pmrem.dispose();
     ```
   - Automatically bakes pre-filtered radiance maps for all rough and polished PBR surfaces. Gold trim and silver trophies receive believable studio reflections at zero network cost.

---

### Feature 16: ACES Filmic Tone Mapping & Atmospheric Fog

#### Where:
- **File:** [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js#L23-L28)

#### How:
1. **Tone Mapping Configuration:**
   - `renderer.toneMapping = THREE.ACESFilmicToneMapping` (line 23).
   - `renderer.toneMappingExposure = 1.12` (line 24).
   - Compresses high-dynamic-range spotlight intensities into displayable sRGB color space, ensuring specular glints on silver cups do not clip to harsh flat white while preserving dark wood grain in the shadow zones.
2. **Linear Atmospheric Fog:**
   - `scene.fog = new THREE.Fog(0x0a0c12, 26, 60)` (line 28).
   - Starts at 26 world units and fully saturates at 60 units to matching background color `#0a0c12`.
   - Distant gallery walls fade softly into the shadows rather than abruptly hard-clipping against the camera far frustum plane.

---

### Feature 17: Window-Resize & Screen DPI Responsive Rendering

#### Where:
- **File:** [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js#L19-L20, #L256-L260)

#### How:
1. **DPI Scaling & GPU Throttling:**
   - Configures pixel density with `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` (line 20).
   - Clamps high-DPI Retina/4K displays to a maximum factor of 2.0, preventing mobile/integrated GPUs from filling excessive pixel buffers while preserving sharp text and edges.
2. **Viewport Resize Listener:**
   ```js
   addEventListener("resize", () => {
     camera.aspect = window.innerWidth / window.innerHeight;
     camera.updateProjectionMatrix();
     renderer.setSize(window.innerWidth, window.innerHeight);
   });
   ```
   - Dynamically recomputes camera aspect ratio, projection matrix, and canvas drawing surface dimensions whenever the browser window or dev tools panel changes size.

---

### Feature 18: Automated Headless Testing & Screenshot QA Tooling

#### Where:
- **Deterministic Step Hook:** [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js#L263-L275, #L298)
- **Functional Self-Test:** [`tools/selftest.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/tools/selftest.js)
- **Collision Regression Test:** [`tools/collisiontest.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/tools/collisiontest.js)
- **Screenshot Automation:** [`tools/shots.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/tools/shots.js)

#### How:
1. **Decoupled Simulation Engine (`window.__museum.step`):**
   - Physics and world updates are decoupled from `requestAnimationFrame` into `step(dt)` (main.js, lines 285–296).
   - Exposes `window.__museum.step(dt, n)`, allowing headless browsers to advance physics deterministically by exact millisecond intervals without waiting on real-time hardware timers.
2. **Headless Playwright Suite:**
   - Launches Chromium via `playwright-core` to verify:
     - Exhibit detection and prompt triggers.
     - Magazine modal opening and page-turning data fidelity.
     - Bernabéu painting state transitions.
     - Walking directly into every column, wall, and pedestal to confirm AABB collision stops forward progress without clipping.

---

### Feature 19: Sprint Movement & Footstep Head-Bobbing

#### Where:
- **File:** [`src/player/controls.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/controls.js#L20-L21, #L220, #L287-L288)

#### How:
1. **Sprint Speed Multiplier:**
   - Default walking speed: $\text{SPEED} = 4.4\text{ units/s}$.
   - Holding **`Shift`** engages sprinting: $\text{SPRINT} = 7.2\text{ units/s}$ (lines 20–21).
2. **Footstep Bobbing Oscillator:**
   - In `_move()`, an accumulator advances whenever horizontal speed exceeds $0.45\text{ m/s}$:
     $$\text{bobT} \leftarrow \text{bobT} + dt \cdot (\text{sprint} \, ? \, 11.5 : 8.5)$$
   - In `_updateCamera()`, a small vertical displacement is added to the first-person camera eye height:
     $$\Delta y_{\text{bob}} = \sin(\text{bobT}) \cdot 0.028\text{m}$$
     $$\text{camera.position.y} = \text{EYE} + \Delta y_{\text{bob}}$$
   - Creates a subtle, realistic walking sensation without inducing motion sickness (lines 287–288).

---

### Feature 20: Mobile / Touch Control Fallbacks & Boot Guard Protocol

#### Where:
- **Fail-Safe Boot Guard:** [`index.html`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/index.html#L38-L82)
- **Touch-Compatible Pointer Fallback:** [`src/player/controls.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/controls.js#L115-L135)
- **Static HTTP Server:** [`tools/server.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/tools/server.js)

#### How:
1. **Inline Non-Module Boot Guard:**
   - An inline vanilla script in `index.html` runs before any ES module loads.
   - Listens for `window.addEventListener("error")` and `unhandledrejection`.
   - Starts a 12-second watchdog timer: if the 3D scene does not fire the `museum-ready` event within 12 seconds, or if the page was opened directly via the `file://` protocol (blocking ES modules), the splash card is replaced with a clear diagnostic error panel explaining how to launch with `npm start` (index.html, lines 40–80).
2. **Pointer Event Unification:**
   - `controls.js` attaches to standard `pointerdown`, `pointermove`, and `pointerup` events rather than legacy mouse events.
   - On touchscreens, dragging a finger on the canvas turns the camera via the drag-to-look fallback, and tapping exhibits triggers interaction.
   - *Note on Status:* Marked as "Not Implemented / Partial" in the project feature table because dedicated dual virtual on-screen analog joysticks (left thumb movement, right thumb look) were omitted in favor of desktop keyboard/mouse controls.

---

## 4. File-to-Feature Quick Index

| Source File | Lines | Implemented Features & Core Responsibilities |
|---|---|---|
| [`src/main.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/main.js) | 1–310 | **Core Orchestrator:** Renderer, PMREM reflections (F15), Fog/Tone mapping (F16), Resize handler (F17), Scene building, AABB collider collection (F06), Interaction raycasting (F11), Render loop (F18), Mode management. |
| [`src/world/museum.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/museum.js) | 1–182 | **Gallery Architecture (F01, F07):** `ROOM` extents, marble floor, LED ceiling, carpet cross, 4 boundary walls, 8 columns, glass entrance doors, 6 wall posters, ambient/spot lighting. |
| [`src/world/textures.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/textures.js) | 1–625 | **Texturing Pipeline (F02):** `TextureLibrary` class, procedural canvas generators (marble, wood, carpet, crest, plaque, poster, stadium art), asynchronous Wikimedia photo overlay binding (`_paint`). |
| [`src/world/trophies.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/trophies.js) | 1–235 | **3D Silverware Models (F09):** `createEuropeanCup()`, `createLaLigaTrophy()`, `createCopaTrophy()`, `createSupercopaTrophy()`, `LatheGeometry` silhouettes, extruded `CatmullRomCurve3` ribbon handles. |
| [`src/world/exhibits.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/exhibits.js) | 1–262 | **Exhibit Installations (F07, F09, F11, F14):** `buildUCLExhibit()` (15 lathed cups + centerpiece + year chips), `buildDomesticExhibit()` (3 pedestals), `buildPainting()` (morphing Bernabéu artwork + pulse light). |
| [`src/world/statue.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/statue.js) | 1–860 | **Cristiano Ronaldo Monument (F07, F10):** GLTF import (`Xbot.glb`, `LeePerrySmith.glb`), quaternion bone re-posing (`aim()`, `twist()`), athletic kit mesh generator, procedural stone bump/vein PBR shader, orbiting spotlights. |
| [`src/world/flags.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/world/flags.js) | 1–326 | **Club Banners (F08):** 9 banners, GLSL vertex shader injection via `onBeforeCompile`, travelling sine waves with slack & edge falloff, GPU analytical normal reconstruction, real logo fallback loader. |
| [`src/player/controls.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/controls.js) | 1–350 | **Locomotion & Camera Engine (F03, F04, F05, F06, F11, F19, F20):** Dual camera FPV/Eagle blending, spherical orbit trigonometry, camera-relative movement, exponential damping, Pointer Lock & drag fallback, axis-separated AABB clamping, anti-stuck easing, footstep bobbing, raycasting. |
| [`src/player/avatar.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/player/avatar.js) | 1–165 | **Visitor Character (F13):** Procedural 3D humanoid in Real Madrid home kit, shoulder/hip limb pivots, sine wave walk cycle, shortest-arc turn-to-face rotation. |
| [`src/ui/magazine.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/ui/magazine.js) | 1–105 | **Modal System (F12):** Magazine overlay controller, page switching, anti-flash click guard, keyboard navigation consumption. |
| [`src/ui/pages.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/ui/pages.js) | 1–280 | **Page Layouts & Fallbacks (F02, F12):** HTML page builders for UCL, Ballon d'Or, and domestic honors; procedural canvas fallback card renderer (`fallbackCard`). |
| [`src/data/history.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/src/data/history.js) | 1–159 | **Curated Archives (F12):** Curated databases for all 15 UCL finals, 8 Ballon d'Or winners in white, and domestic competition statistics. |
| [`index.html`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/index.html) | 1–125 | **HTML Shell & Diagnostics (F20):** WebGL canvas, HUD overlays, splash card, import map, fail-safe boot guard script. |
| [`styles.css`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/styles.css) | 1–460 | **Styling & HUD UI:** Premium dark museum typography, splash screen fade transitions, magazine reader styling, responsive layouts. |
| [`tools/server.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/tools/server.js) | 1–55 | **Static HTTP Server:** Zero-dependency Node.js server streaming correct MIME types for `.js`, `.glb`, `.css`, and `.json`. |
| [`tools/selftest.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/tools/selftest.js) | 1–145 | **Automated Functional QA (F18):** Playwright headless test script driving scene navigation, exhibits, and modal checks. |
| [`tools/collisiontest.js`](file:///f:/4.2/computer%20graphics%20lab/Real-Madrid-Museum-Hall-of-Legends/tools/collisiontest.js) | 1–170 | **Collision Testing (F06, F18):** Automated regression suite verifying boundary walls, columns, and pedestal collision integrity. |
