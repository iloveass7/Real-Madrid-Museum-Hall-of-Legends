# Real Madrid Museum — Hall of Legends: Project Documentation

> A browser-based, first-person 3D museum built entirely on **Three.js / WebGL** with zero build tools — just a minimal Node.js static server and vanilla ES modules.

---

## Table of Contents

1. [What the Project Is](#1-what-the-project-is)
2. [How to Run It](#2-how-to-run-it)
3. [High-Level Architecture](#3-high-level-architecture)
4. [File-by-File Reference](#4-file-by-file-reference)
5. [Full Boot Dataflow](#5-full-boot-dataflow)
6. [Game Loop Dataflow](#6-game-loop-dataflow)
7. [User Interaction Dataflow](#7-user-interaction-dataflow)
8. [Asset Pipeline](#8-asset-pipeline)
9. [Texture System](#9-texture-system)
10. [Collision System](#10-collision-system)
11. [Controls and Camera System](#11-controls-and-camera-system)
12. [Magazine / Overlay System](#12-magazine--overlay-system)
13. [Key Constants and Configuration](#13-key-constants-and-configuration)
14. [Testing and Dev Tools](#14-testing-and-dev-tools)

---

## 1. What the Project Is

A **walkaround 3D museum** themed around Real Madrid CF.  
Players move through a large hall in first-person (or toggle to eagle-eye view) and can interact with four exhibits:

| Exhibit | Location | Interaction |
|---------|----------|-------------|
| UCL Trophy Room | North wall, east side | Opens magazine with all 15 European Cup finals |
| Domestic Honours | South wall, east side | Opens magazine with La Liga, Copa del Rey, Supercopa stats |
| Cristiano Ronaldo Statue | East wall | Opens magazine with Ballon d'Or winners |
| Bernabeu Painting | West wall | Toggles painting between 1947 classic stadium and 2024 renovated version |

Everything is rendered in WebGL via Three.js. **No textures are loaded from disk by default** — all surfaces are drawn procedurally on HTML `<canvas>` elements. Real photos (downloaded from Wikimedia Commons) are optionally painted on top when available.

---

## 2. How to Run It

```bash
# 1. Install Three.js (the only runtime dependency)
npm install

# 2. (Optional) Download real Wikimedia photos for the museum
npm run assets          # calls:  python tools/download_assets.py

# 3. Start the local dev server
npm start               # calls:  node server.js
#    → open http://localhost:5173
```

> **Why can't I just open `index.html` directly?**
> Browsers block ES module imports and texture fetches over `file://`. The server is needed so the correct MIME types are served and CORS is satisfied.

### NPM Scripts

| Command | What it runs | Purpose |
|---------|-------------|---------|
| `npm start` | `node server.js` | Starts the static HTTP server on port 5173 |
| `npm run assets` | `python tools/download_assets.py` | Downloads Wikimedia photos, writes `assets/manifest.json` |

---

## 3. High-Level Architecture

```
Browser
  |
  |-- index.html          <- entry point, DOM skeleton, boot guard
  |-- styles.css          <- all visual styling (splash, HUD, magazine overlay)
  `-- src/
      |-- main.js         <- ORCHESTRATOR: wires everything together, runs the game loop
      |
      |-- world/
      |   |-- textures.js <- TextureLibrary: generates all textures on <canvas>
      |   |-- museum.js   <- room geometry (floor/walls/ceiling/door/columns/posters)
      |   |-- exhibits.js <- UCL wall, domestic trophies display, Bernabeu painting
      |   |-- statue.js   <- CR7 monument (loads GLB models, re-poses skeleton)
      |   |-- trophies.js <- 3D trophy geometry (UCL cup, La Liga, Copa, Supercopa)
      |   `-- flags.js    <- waving fabric banners with custom vertex shader
      |
      |-- player/
      |   |-- controls.js <- PlayerControls: movement, collision, camera, raycasting
      |   `-- avatar.js   <- animated figure visible in eagle-eye view
      |
      |-- ui/
      |   |-- magazine.js <- Magazine: overlay open/close/paginate controller
      |   `-- pages.js    <- HTML builders for each magazine's pages
      |
      `-- data/
          `-- history.js  <- Static data: all UCL finals, Ballon d'Or winners, league records

Node.js (server side)
  `-- server.js           <- Zero-dependency static HTTP file server

Python (tooling)
  `-- tools/
      `-- download_assets.py <- Wikimedia Commons downloader -> assets/manifest.json

Assets
  `-- assets/
      |-- manifest.json   <- slug -> { file path, Wikimedia source title }
      |-- img/            <- downloaded .jpg/.png photos (git-ignored)
      `-- models/
          |-- Xbot.glb    <- Mixamo humanoid rig (body of the CR7 statue)
          `-- LeePerrySmith.glb <- photoscanned head (base for CR7's head)
```

---

## 4. File-by-File Reference

### `server.js`
- **What it does:** A zero-dependency Node.js HTTP server (no Express, no Vite).
- **How it works:** Maps URL paths directly to the filesystem starting at the project root. Serves correct `Content-Type` headers for `.js`, `.css`, `.glb`, `.json`, `.jpg`, `.webp`, etc.
- **Port:** `process.env.PORT || 5173`
- **Key function:** `http.createServer((req, res) => ...)` — decodes URL, resolves to a file, streams it with `createReadStream().pipe(res)`.

### `index.html`
- **What it does:** The sole HTML page. Defines the DOM structure for the 3D canvas, splash screen, HUD, and magazine overlay.
- **Key elements:**

| Element ID | Purpose |
|------------|---------|
| `#scene` | The `<canvas>` Three.js renders into |
| `#splash` | Fullscreen entry screen shown on load |
| `#enter-btn` | "CLICK TO ENTER" button |
| `#hud` | In-museum heads-up display (crosshair, prompt, brand, view button) |
| `#crosshair` | Center dot in first-person view |
| `#prompt` | "Press E — ..." interaction hint |
| `#view-btn` | Toggles eagle-eye / first-person view |
| `#magazine` | The full-screen magazine overlay |
| `#mag-page` | Where page HTML is injected |
| `#mag-prev` / `#mag-next` | Page navigation buttons |

- **Boot guard (inline `<script>`):** A non-module script that listens for the `museum-ready` event. If the module graph fails or times out (12 seconds), it injects an error message into the splash card so the user knows what happened.
- **Import map:** Maps `"three"` and `"three/addons/"` to local `node_modules`, so ES modules work without a bundler.

### `styles.css`
- **What it does:** All visual styling. Covers the splash card, HUD elements, the magazine overlay, page layouts, and responsive behaviour.
- **Notable classes:** `.hidden` (toggled to show/hide HUD and overlays), `.eagle` (body class toggled when in eagle-eye mode), `.pg-hero` (magazine two-column layout), `.mini-trophies` (dots timeline of UCL wins).

---

### `src/main.js` — The Orchestrator

This is the heart of the application. It imports everything, wires it together, and runs the render loop.

**What it does, in order:**

1. Creates the Three.js `WebGLRenderer`, `Scene`, and `PerspectiveCamera`.
2. Builds a procedural environment map for metal reflections.
3. Creates a `TextureLibrary` instance and calls `await lib.init()` — this loads `assets/manifest.json` and paints any available real photos onto the procedural canvases.
4. Calls `setManifest(lib.photoSources)` so the magazine page builders know which photo slugs are available.
5. Calls the world builders: `buildMuseum`, `buildUCLExhibit`, `buildDomesticExhibit`, `buildStatue`, `buildPainting`, `buildFlags`.
6. Collects all collision boxes from the world builders into a single `colliders[]` array.
7. Tags each interactable group with an `interactId` string via `tagInteractable()`.
8. Creates `PlayerControls` and `Avatar`.
9. Sets up event listeners for entering the museum, clicking, keyboard, and the view toggle button.
10. Defines the `activate(id)` function — called when the player presses E or clicks an exhibit.
11. Defines `updatePrompt()` — called every frame to raycasting-check what the player is looking at.
12. Defines `step(dt)` — one tick of simulation logic.
13. Defines `loop()` — the `requestAnimationFrame` render loop.
14. Fires `museum-ready` event (tells the boot guard the scene is alive).
15. Calls `loop()` to start the render loop.

**Mode state machine:**

```
"splash"  --[Enter / Space / E]-->  "roam"
"roam"    --[E on exhibit]-------->  "magazine"
"magazine"--[E / Esc / click]----->  "roam"
```

**Key functions in `main.js`:**

| Function | Trigger | What it does |
|----------|---------|-------------|
| `enterMuseum()` | Click on splash / Enter / Space / E | Hides splash, shows HUD, sets mode to `"roam"`, requests pointer lock |
| `activate(id)` | E key or mouse click when near exhibit | Opens magazine for ucl/statue/domestic; toggles painting for painting |
| `setMode(next)` | Called by activate / magazine close | Updates `mode`, enables/disables controls |
| `setView(fpv)` | V key or view button | Switches first-person <-> eagle-eye |
| `updatePrompt()` | Every frame | Raycasts forward to find nearby interactable; shows/hides prompt text |
| `step(dt)` | Every frame | Updates controls, avatar, statue, flags, painting, spinning door cup |
| `loop()` | requestAnimationFrame | Clamps delta time, calls `step()`, calls `renderer.render()` |
| `solidColliders(...roots)` | Once at boot | Traverses groups for `userData.solid` meshes and creates Box3 colliders |

---

### `src/world/textures.js` — TextureLibrary

**What it does:** Generates every single texture in the museum procedurally using the HTML5 Canvas 2D API, then optionally replaces them with real downloaded photos.

**Class: `TextureLibrary`**

| Method | Returns | What it draws |
|--------|---------|--------------|
| `marbleFloor()` | Texture | Polished terrazzo floor with tile grid and flecks |
| `carpet()` | Texture | Dark navy carpet with gold borders and "RM" monogram |
| `wall()` | Texture | Clean white gallery wall with subtle plaster noise |
| `ceiling()` | Texture | LED panel ceiling grid |
| `wood()` | Texture | Light ash/oak with bezier grain lines |
| `crest(size)` | Texture | Real Madrid crest (gold ring, white roundel, RM monogram, crown) |
| `plaque(title, sub)` | Texture | Gold-bordered dark plaque with title and subtitle |
| `poster(key, opts)` | Texture | Gallery poster: paper background, real logo PNG watermark (9% opacity), title, frame rules. The real logo is loaded asynchronously after the poster canvas is first drawn. |
| `stadiumArt(kind)` | Texture | 'old' = classic Bernabeu at dusk / 'new' = renovated 2024 stadium at night |
| `noiseBump()` | Texture (linear) | Fine noise for metal bump maps |
| `streaks()` | Texture (linear) | Vertical polish streaks for roughness maps |
| `soccerBall()` | Texture | Gold football pentagon pattern (used on Copa del Rey lid) |
| `trophyCard(key, title, sub)` | Texture | Dark fallback card with silver cup silhouette and text |

**Photo binding flow:**
```
lib.init()
  `- fetch("assets/manifest.json")
       `- photoSources = { slug: { file, source }, ... }
            `- for each pending binding -> _paint(binding)
                  `- new Image(); img.src = meta.file
                        `- onload: drawImage onto canvas -> texture.needsUpdate = true
```

The key insight: textures are always rendered procedurally first. Real photos are painted on top asynchronously without blocking the scene from rendering.

---

### `src/world/museum.js` — Room Builder

**Exported:** `buildMuseum(scene, lib)`, `ROOM`

**`ROOM` constant:**
```js
{ w: 40, d: 26, h: 6, x0: -20, x1: 20, z0: -13, z1: 13 }
// w=width, d=depth, h=ceiling height
// x0/x1 = west/east wall X coords
// z0/z1 = north/south wall Z coords
```

**What `buildMuseum` builds:**
- Floor (marble), ceiling (LED panels), two carpet runners
- Four walls (each a BoxGeometry; a collision box is registered per wall)
- 8 columns with gold caps and dark marble bases
- Entrance door: wood frame, two glass leaves, gold handle bars, Real Madrid crest above, "ENTRANCE / Hall of Legends" plaque
- 6 wall posters: Hala Madrid, Kings of Europe, A Century of Glory, Los Galacticos, CR7, La Decima
- Hemisphere light + ambient light
- 8 ceiling spotlights (cool white LED)
- 2 warm door sconces (point lights)

> **Note:** The decorative wall crest medallions (CircleGeometry + gold TorusGeometry rings) were removed. The entrance door crest and the waving banner crests still remain.

**Returns:**
```js
{
  group,       // THREE.Group added to scene
  colliders,   // Box3[] for walls and columns
  anchors: {
    ucl,       // Vector3 — where UCL exhibit is placed
    domestic,  // Vector3 — where domestic exhibit is placed
    statue,    // Vector3 — where CR7 statue is placed
    painting,  // Vector3 — where Bernabeu painting is placed
    door,      // Vector3 — entrance door position
  }
}
```

---

### `src/world/exhibits.js` — Exhibit Builders

**Exported:** `buildUCLExhibit`, `buildDomesticExhibit`, `buildPainting`

#### `buildUCLExhibit(lib, anchor)`
- Builds a large trophy wall backboard (wood, gold trim).
- Places 15 European Cup 3D models (`createEuropeanCup`) on two shelves.
- Each cup has a year chip below it (1956-2024).
- One giant centrepiece cup on its own pedestal in front.
- Three warm spotlights illuminate the wall.
- Returns `{ group, hit, colliders }` — `hit` is an invisible BoxGeometry used for raycasting.

#### `buildDomesticExhibit(lib, anchor)`
- Three pedestals: La Liga trophy, Copa del Rey trophy, Supercopa trophy.
- Each pedestal has a wood body, dark marble cap, and a plaque.
- Each trophy is lit by its own warm spotlight.

#### `buildPainting(lib, anchor)`
- A framed painting on the west wall.
- Two overlapping plane meshes: `planeOld` (1947 Bernabeu) and `planeNew` (2024 Bernabeu).
- `toggle()` flips which is shown by cross-fading `planeNew.material.opacity`.
- `update(dt)` animates the fade and pulses the picture light during transitions.
- Returns `{ group, hit, colliders: [], toggle, update, isNew }`.

---

### `src/world/statue.js` — CR7 Monument

**What it does:** Loads two real GLB files (`Xbot.glb`, `LeePerrySmith.glb`), re-poses the skeleton into the "Siuu" celebration pose, replaces the head with the photoscanned version (heavily modified toward Ronaldo's features), and applies a weathered stone material to everything so it looks like a carved monument.

**Key functions:**

| Function | Purpose |
|----------|---------|
| `stoneMaterial(lib, opts)` | Creates a MeshStandardMaterial with procedural stone bump + albedo |
| `stoneMaps(lib)` | Generates noise bump and marble veining albedo textures |
| `aim(bone, dir)` | Rotates a rig bone to point its child segment along a world-space direction |
| `buildStatue(lib, anchor)` | Main builder: loads GLBs, poses body, attaches head, adds spotlights |
| `statue.update(t, dt)` | Animates 3 animated spotlights that orbit the statue, changes colour over time |

**Asset loading flow:**
```
buildStatue(lib, anchor)
  `- GLTFLoader.load("assets/models/Xbot.glb")
        `- onLoad: poseBody() -> aim() each bone of the skeleton
             `- GLTFLoader.load("assets/models/LeePerrySmith.glb")
                  `- onLoad: attachHead() -> carve/scale head mesh, merge geometries
                       `- colliders registered
```

The statue group is added to the scene immediately (so the pedestal/base appear right away), and the GLB body/head appear once loaded asynchronously.

---

### `src/world/trophies.js` — 3D Trophy Models

**Exported:** `createEuropeanCup`, `createLaLigaTrophy`, `createCopaTrophy`, `createSupercopaTrophy`

Each trophy is built from:
- **Lathed body** (`THREE.LatheGeometry`) — the profile curve defines the silhouette.
- **Ribbon handles** (custom `ribbon()` function) — flat metal strips extruded along a `CatmullRomCurve3`.
- **Marble base** — dark cylinder under each trophy.

| Trophy | Key Features |
|--------|-------------|
| European Cup | Deep bowl, wide flared lip, two enormous scroll "ears" |
| La Liga | Slender silver amphora on tall stem, ridged flared mouth |
| Copa del Rey | Fluted bowl, angular handles, tall stepped lid with soccerBall finial |
| Supercopa | Wide shallow dish on slim waisted stem |

---

### `src/world/flags.js` — Waving Banners

**Exported:** `buildFlags(lib, ROOM)`, `drawCrest(ctx, cx, cy, r)`

**How the cloth simulation works:**
- The flag mesh is a finely-tessellated `PlaneGeometry` (many subdivisions).
- The standard MeshStandardMaterial is patched with custom GLSL injected into the `onBeforeCompile` hook.
- The vertex shader displaces each vertex using a sum of sine waves based on `time` and `uv.x` (along the flag's width), creating a realistic wave.
- Normals are analytically recomputed from the same wave function so lighting on the fabric is correct.
- `flags.update(t)` passes the current simulation time to the shader uniform each frame.

**Banner crest — real logo PNG:**  
`bannerTexture()` now loads `assets/img/real_madrid_logo.png` (the official Real Madrid CF badge) asynchronously. The banner renders immediately using the procedural `drawCrest()` fallback, then swaps to the real PNG once the image loads and marks the Three.js texture for GPU re-upload. If the file is missing the procedural crest is kept permanently.

**Banner placement:**  
Banners hang on the north wall (z0) and south wall (z1) at x positions `−17.2`, `−0.6`, and `6.4`, plus two navy banners flanking the east-wall statue and two white banners on the west wall either side of the entrance.  
> **Note:** The south-wall banner at `x = 6.4` was removed because it visually overlapped the Domestic Honours exhibit. The matching north-wall banner at the same x position is retained.

`drawCrest(ctx, cx, cy, r)` — standalone canvas function that draws the full Real Madrid crest (gold ring, RMCF monogram, mulberry band, crown). Still used internally as the instant fallback when the real logo PNG has not yet loaded.

---

### `src/player/controls.js` — PlayerControls

**Class: `PlayerControls`**

Manages everything player-related: movement, camera, pointer lock, and interactable detection.

**Two camera modes:**

| Mode | Description |
|------|-------------|
| First-person (FPV) | Camera at eye height (1.66 m), looks where mouse points |
| Eagle-eye | Orbit camera behind and above the avatar, zooms with scroll wheel |

**Input handling:**

| Input | Handler | Effect |
|-------|---------|--------|
| `W/A/S/D` or `Arrow keys` | `keydown/keyup` | Walk forward/back/left/right |
| `Shift` | `keydown/keyup` | Sprint (faster movement) |
| Mouse move (pointer locked) | `mousemove` | Turns head/camera in FPV |
| Click-drag (no lock) | `pointerdown/move/up` | Drag-to-look fallback |
| Scroll wheel | `wheel` | Zoom eagle-eye camera distance |

**Movement physics (`_move(dt)`):**
1. Reads key state, computes direction vector.
2. Lerps velocity toward target direction x speed (smooth acceleration).
3. Moves X axis, clamps to room bounds, resolves collisions.
4. Moves Z axis, clamps to room bounds, resolves collisions.
5. Two collision resolution passes to handle corner cases.
6. `_unstick(dt)` slowly eases the player out if they're somehow inside a collider.

**Camera update (`_updateCamera(dt)`):**
- `blend` value: `1` = full FPV, `0` = full eagle-eye.
- When switching views, `blend` smoothly lerps (6x per second) between the two extremes.
- Camera position is `lerp(orbitPos, eyePos, smoothstep(blend))`.
- Field of view also lerps: 52 degrees (eagle) to 72 degrees (FPV).
- Head bob: small vertical sine wave applied when walking in FPV.

**Key method: `pickInteractable(interactables, maxDist)`**
- Casts a `THREE.Raycaster` from the player's eye along the forward direction.
- Returns the first interactable hit within `maxDist`.

---

### `src/player/avatar.js` — Walking Figure

**Exported:** `createAvatar()`

The figure you see from eagle-eye view. Built entirely from Three.js primitives:
- Torso: `LatheGeometry` for a tapered football shirt shape.
- Head: `SphereGeometry` with skin material + separate hair hemisphere.
- Neck, collar, shorts, socks, boots: cylinders and capsules.
- Arms & legs: `CapsuleGeometry` limbs attached to pivot `Group`s at the shoulders/hips so they swing naturally.
- "7" on the back: small dark plane geometry.

**`update(dt, speed, moveYaw)`** — called every frame:
- Animates leg/arm swing with `sin(walk)`, scaled by speed.
- Smoothly turns the figure to face the direction of travel.
- Small vertical bounce when walking.

---

### `src/ui/magazine.js` — Magazine Overlay

**Class: `Magazine`**

Manages the full-screen magazine overlay. All DOM references are grabbed once in the constructor.

**Key methods:**

| Method | Trigger | What it does |
|--------|---------|-------------|
| `show({ kicker, title, pages, startAt })` | `activate()` in main.js | Sets pages array, updates title/kicker, removes `hidden` class, calls `render()` |
| `render()` | `show()`, `next()`, `prev()` | Injects `page.html` into `#mag-page`, updates page counter, enables/disables nav buttons |
| `next()` | Right arrow / L key / next button | Increments index, calls `render()` |
| `prev()` | Left arrow / H key / prev button | Decrements index, calls `render()` |
| `close()` | E / Esc / click backdrop / click page | Adds `hidden` class, calls `onClosed()` callback which calls `setMode("roam")` in main.js |

**Anti-flash guard:** `openedAt` timestamp prevents the same click that opens the magazine from immediately closing it (350 ms debounce window on page clicks).

---

### `src/ui/pages.js` — Page Content Builders

**Exported:** `buildUCLPages()`, `buildBallonPages()`, `buildDomesticPages()`, `setManifest(m)`

Each builder returns an array of `{ html: "..." }` objects. The HTML is injected directly into `#mag-page`.

| Builder | Data source | Pages |
|---------|------------|-------|
| `buildUCLPages()` | `UCL_FINALS` from history.js | One page per European Cup final (15 pages) |
| `buildBallonPages()` | `BALLON_DOR` from history.js | One page per Ballon d'Or winner (8 pages) |
| `buildDomesticPages()` | `LA_LIGA`, `COPA_DEL_REY`, `SUPERCOPA` | One page per competition (3 pages) |

**Photo lookup:** `photoFor(slug, alt, fbLabel, fbSub)` checks `MANIFEST` (set by `setManifest()`). If the photo was downloaded, it renders `<img src="assets/img/...">`. If not, it uses `fallbackCard()` — a canvas-generated image encoded as a data URL.

**Fallback card:** Draws a dark blue card with a silver cup silhouette, gold border, the label/sub text, and "ARCHIVE IMAGE" watermark. Results are cached in `fbCache` (Map) so the same card is not re-drawn every time the page is visited.

---

### `src/data/history.js` — Static Data

Pure data, no logic. Exported constants:

| Export | Type | Contents |
|--------|------|---------|
| `UCL_FINALS` | Array (15 items) | `{ year, edition, opponent, score, venue, note }` for each European Cup final |
| `BALLON_DOR` | Array (8 items) | `{ player, years[], img, role, note }` for each Ballon d'Or winner in white |
| `LA_LIGA` | Object | `{ name, count: 36, blurb, years[] }` |
| `COPA_DEL_REY` | Object | `{ name, count: 20, blurb, years[] }` |
| `SUPERCOPA` | Object | `{ name, count: 13, blurb, years[] }` |

---

### `tools/download_assets.py` — Asset Downloader

**Run with:** `python tools/download_assets.py`
Or for specific slugs: `python tools/download_assets.py cr7 modric`

**What it does:**
1. Reads `assets/manifest.json` (if it exists) to skip already-downloaded assets.
2. For each slug in `QUERIES`, searches the Wikimedia Commons API (`commons.wikimedia.org/w/api.php`) with up to 3 fallback search queries.
3. Picks the widest image that is JPEG or PNG and at least 500px wide.
4. Downloads a 1600px-wide thumbnail rendition to `assets/img/<slug>.jpg`.
5. Updates `assets/manifest.json` with `{ file, source }` for each successfully downloaded asset.

**Rate limiting:** 3-second pause between API calls. Retries up to 4x on HTTP 429 with exponential backoff.

**Slug to file mapping:**

All slugs are pre-registered in `assets/manifest.json`. Dropping the matching image file into `assets/img/` is sufficient — no code changes needed.

| Slug | Expected file | Used in |
|------|-------------|--------|
| `bernabeu_old` | `bernabeu_old.jpg` | Bernabeu painting (1947 view) |
| `bernabeu_new` | `bernabeu_new.jpg` | Bernabeu painting (2024 view) |
| `ucl_trophy` | `ucl_trophy.jpg` | "Kings of Europe" wall poster |
| `copa_trophy` | `copa_trophy.jpg` | Copa del Rey domestic magazine page |
| `laliga_trophy` | `laliga_trophy.jpg` | La Liga domestic magazine page |
| `spanish_super_cup` | `spanish_super_cup.jpg` | Supercopa domestic magazine page |
| `real_madrid_logo` | `real_madrid_logo.png` | Banner crest + poster watermark |
| `cr7` | `cr7.jpg` | CR7 wall poster + Ballon d'Or page |
| `distefano` | `distefano.jpg` | Ballon d'Or page |
| `kopa` | `kopa.jpg` | Ballon d'Or page |
| `figo` | `figo.jpg` | Ballon d'Or page |
| `ronaldo9` | `ronaldo9.jpg` | Ballon d'Or page |
| `cannavaro` | `cannavaro.jpg` | Ballon d'Or page |
| `modric` | `modric.jpg` | Ballon d'Or page |
| `benzema` | `benzema.jpg` | Ballon d'Or page |
| `final_1956` | `final_1956.jpg` | UCL magazine page — 1956 final |
| `final_1957` | `final_1957.jpg` | UCL magazine page — 1957 final |
| `final_1958` | `final_1958.jpg` | UCL magazine page — 1958 final |
| `final_1959` | `final_1959.jpg` | UCL magazine page — 1959 final |
| `final_1960` | `final_1960.jpg` | UCL magazine page — 1960 final |
| `final_1966` | `final_1966.jpg` | UCL magazine page — 1966 final |
| `final_1998` | `final_1998.png` | UCL magazine page — 1998 final ✅ downloaded |
| `final_2000` | `final_2000.jpg` | UCL magazine page — 2000 final |
| `final_2002` | `final_2002.jpg` | UCL magazine page — 2002 final |
| `final_2014` | `final_2014.jpg` | UCL magazine page — 2014 final ✅ downloaded |
| `final_2016` | `final_2016.jpg` | UCL magazine page — 2016 final ✅ downloaded |
| `final_2017` | `final_2017.jpg` | UCL magazine page — 2017 final |
| `final_2018` | `final_2018.jpg` | UCL magazine page — 2018 final ✅ downloaded |
| `final_2022` | `final_2022.jpg` | UCL magazine page — 2022 final ✅ downloaded |
| `final_2024` | `final_2024.jpg` | UCL magazine page — 2024 final |

---

## 5. Full Boot Dataflow

```
npm start
  `- node server.js
       `- HTTP server listening on :5173

Browser -> GET /
  `- server.js -> streams index.html

Browser parses index.html:
  |-- Inline boot guard script registers:
  |    - window "museum-ready" listener
  |    - window "error" listener
  |    - window "unhandledrejection" listener
  |    - 12-second timeout -> fail("Loading timed out.")
  |
  `-- <script type="module" src="src/main.js">
       |
       |-- Three.js imports resolved via importmap -> node_modules/three/
       |
       |-- new TextureLibrary(renderer)
       |    `- records max anisotropy from GPU
       |
       |-- await lib.init()
       |    `- fetch("assets/manifest.json")
       |         |-- [success] photoSources = parsed JSON
       |         `-- [fail/offline] photoSources = {} (procedural only)
       |
       |-- setManifest(lib.photoSources)
       |    `- pages.js MANIFEST updated for photo lookup
       |
       |-- buildMuseum(scene, lib)
       |    |-- lib.marbleFloor() -> TextureLibrary.make("floor", ...) -> CanvasTexture
       |    |-- lib.wall(), lib.ceiling(), lib.carpet(), lib.wood()
       |    |-- Creates geometry: floor, ceiling, walls, columns, door, posters
       |    `-- Returns { group, colliders, anchors }
       |
       |-- buildUCLExhibit(lib, anchors.ucl)
       |    |-- lib.wood(), lib.plaque(...)
       |    |-- 15x createEuropeanCup(0.5) from trophies.js
       |    `-- Returns { group, hit, colliders }
       |
       |-- buildDomesticExhibit(lib, anchors.domestic)
       |    |-- createLaLigaTrophy, createCopaTrophy, createSupercopaTrophy
       |    `-- Returns { group, hit, colliders }
       |
       |-- buildStatue(lib, anchors.statue)
       |    |-- stoneMaterial(lib) -> procedural stone bump + albedo textures
       |    |-- GLTFLoader.load("assets/models/Xbot.glb") -> async
       |    |    `- onLoad: poseBody() -> aims every bone into "Siuu" stance
       |    |         `- GLTFLoader.load("assets/models/LeePerrySmith.glb") -> async
       |    |              `- onLoad: attachHead() -> carves + attaches head
       |    `-- Returns { group, hit, colliders, update }
       |         (statue base appears immediately; body/head appear when models load)
       |
       |-- buildPainting(lib, anchors.painting)
       |    |-- lib.stadiumArt("old") + lib.stadiumArt("new")
       |    |    `- TextureLibrary auto-binds to "bernabeu_old"/"bernabeu_new" slugs
       |    |         `- if manifest has them -> _paint() -> load Image -> drawImage on canvas
       |    `-- Returns { group, hit, colliders:[], toggle, update, isNew }
       |
       |-- buildFlags(lib, ROOM)
       |    |-- Draws crest textures via drawCrest()
       |    |-- Creates tessellated PlaneGeometry meshes
       |    |-- Patches MeshStandardMaterial vertex shader for wave displacement
       |    `-- Returns { group, update }
       |
       |-- Collects all colliders into colliders[]
       |
       |-- new PlayerControls(camera, canvas)
       |    `- _bindInput() registers all keyboard/mouse/pointer events
       |
       |-- createAvatar() -> builds figure from primitives
       |
       |-- new Magazine(onClosed) -> grabs DOM elements, registers events
       |
       |-- Registers click on #enter-btn -> enterMuseum()
       |
       |-- dispatchEvent(new Event("museum-ready"))  <- boot guard stops 12s timeout
       |
       `-- loop() -> starts requestAnimationFrame render loop
```

---

## 6. Game Loop Dataflow

Every animation frame (target 60 fps):

```
loop()
  |-- clock.getDelta() -> raw dt
  |-- if dt > 0.12: use 1/60 (clamp long stalls / tab switches)
  |
  `-- step(dt)
       |-- simTime += dt
       |
       |-- controls.update(dt)
       |    |-- _move(dt)    [if active/roaming]
       |    |    |-- Read key state -> compute direction
       |    |    |-- Lerp velocity
       |    |    |-- Move X -> clamp room -> resolve collisions
       |    |    |-- Move Z -> clamp room -> resolve collisions
       |    |    `-- _unstick() if inside a collider
       |    `-- _updateCamera(dt)
       |         |-- Smooth blend FPV <-> eagle-eye
       |         |-- Compute eye/orbit positions
       |         `-- camera.lookAt(blended target)
       |
       |-- avatar.group.position.set(controls.pos.x, 0, controls.pos.z)
       |-- avatar.update(dt, speed, moveYaw)
       |    |-- Animate leg/arm swing
       |    `-- Rotate figure to face movement direction
       |-- avatar.group.visible = controls.blend < 0.86  [hidden in FPV]
       |
       |-- statue.update(t, dt)
       |    `- Animate 3 orbiting spotlights (position + colour)
       |
       |-- flags.update(t)
       |    `- Update "time" shader uniform -> cloth waves animate
       |
       |-- painting.update(dt)
       |    `- If fading: advance opacity, pulse picture light
       |
       |-- doorCup.rotation.y = t * 0.6   [slow spin on entrance cup]
       |
       `-- updatePrompt()
            |-- if mode != "roam": hide prompt, return
            |-- Check painting proximity (< 3.6m from anchor)
            |-- controls.pickInteractable([ucl, domestic, statue]) via Raycaster
            |-- Check statue proximity fallback (< 4.2m)
            `-- if found: show prompt HTML, set currentTarget
                 else: hide prompt

  `-- renderer.render(scene, camera)
```

---

## 7. User Interaction Dataflow

### Entering the Museum
```
User clicks "CLICK TO ENTER" (or presses Enter / Space / E on splash)
  `- enterMuseum()
       |-- splash.classList.add("fade")     -> CSS fade-out animation
       |-- hud.classList.remove("hidden")   -> HUD appears
       |-- setMode("roam")                  -> controls.active = true
       |-- controls.requestLock()           -> requests browser pointer lock
       `-- setTimeout(700ms) -> splash.classList.add("hidden")
```

### Walking Around
```
W / A / S / D pressed
  `- keydown -> keys.add("forward"|"back"|"left"|"right")
       `- controls._move(dt) [every frame]
            `- velocity lerped toward target -> player moves
```

### Looking Around
```
[With pointer lock]  mousemove -> controls._look(dx, dy, 0.0021)
[Without lock]       pointerdown+move on canvas -> controls._look(dx, dy, 0.0032)
  `- yaw -= dx * k
  `- pitchFP -= dy * k  (clamped +/- 1.45 rad)
```

### Approaching an Exhibit
```
Every frame: updatePrompt()
  `- controls.pickInteractable() -> Raycaster from eye along forward
       `- if hit.userData.interactId matches an interactable:
            promptEl.innerHTML = found.prompt   ("Press E -- UCL Trophy Room Magazine")
            promptEl.classList.remove("hidden")
            currentTarget = found
```

### Pressing E on an Exhibit
```
keydown "e" -> if currentTarget: activate(currentTarget.id)
  |
  |-- id === "ucl":
  |    setMode("magazine") -> controls.active = false
  |    controls.releaseLock()
  |    magazine.show({ kicker, title, pages: buildUCLPages() })
  |         `- buildUCLPages()
  |              `- UCL_FINALS.map(...) -> 15 pages with photoFor(slug) or fallbackCard
  |
  |-- id === "statue":
  |    magazine.show({ pages: buildBallonPages() })
  |         `- BALLON_DOR.map(...) -> 8 pages
  |
  |-- id === "domestic":
  |    magazine.show({ pages: buildDomesticPages() })
  |         `- 3 pages (La Liga, Copa del Rey, Supercopa)
  |
  `-- id === "painting":
       painting.toggle() -> showNew = !showNew
            `- painting.update(dt) fades planeNew opacity over time
```

### Navigating the Magazine
```
Arrow Right / L key / ">" button -> magazine.next()
  `- index++ -> render() -> #mag-page.innerHTML = pages[index].html

Arrow Left / H key / "<" button -> magazine.prev()
  `- index-- -> render()

E / Esc / click backdrop / click page -> magazine.close()
  `- root.classList.add("hidden")
  `- onClosed() -> setMode("roam") -> controls.active = true -> controls.requestLock()
```

### Toggling Eagle-Eye View
```
V key pressed  (or "Eagle eye (V)" button clicked)
  `- setView(!controls.fpv)
       |-- controls.setView(fpv)
       |    `- if !fpv: releaseLock() [eagle reads better without lock]
       |-- viewBtn.textContent updated
       `-- document.body.classList.toggle("eagle", !fpv)  [CSS adjustments]

Every frame: _updateCamera(dt)
  `- blend smoothly lerps: 1.0 (FPV) <-> 0.0 (eagle-eye) at rate 6/s
```

---

## 8. Asset Pipeline

```
tools/download_assets.py
  |
  |-- For each slug in QUERIES{}:
  |    |-- Search Wikimedia Commons API (up to 3 query strings per slug)
  |    |-- Pick widest JPEG/PNG >= 500px
  |    |-- Download 1600px thumbnail -> assets/img/<slug>.jpg
  |    `-- Record in manifest: { file: "assets/img/<slug>.jpg", source: "File:..." }
  |
  `-- Write assets/manifest.json

assets/manifest.json  (served by server.js as a static file)
  |
  `- lib.init() -> fetch("/assets/manifest.json")
       `- photoSources = parsed JSON
            `- _paint() called for each slug that has a canvas binding
                 |-- new Image()
                 |-- img.src = meta.file  (e.g. "assets/img/cr7.jpg")
                 `-- onload: drawImage onto canvas -> texture.needsUpdate = true
                      `- Three.js re-uploads canvas to GPU next render frame
```

**Offline / no assets downloaded:** Every texture and page image has a procedural fallback. The museum is always fully functional without any downloaded photos.

---

## 9. Texture System

All textures use the same pattern through `TextureLibrary.make(key, w, h, drawFn, opts)`:

1. **First call:** creates a `<canvas>`, calls `drawFn(ctx, w, h)`, wraps it in `THREE.CanvasTexture`.
2. **Subsequent calls with same key:** returns cached texture (no re-draw).
3. **Auto-bind:** `make()` automatically calls `bindPhoto(key, key)` — if the manifest has a slug matching the key, the real photo will be painted over the canvas when it loads.

**Repeating textures** use `opts.repeat: [s, t]` which sets `THREE.RepeatWrapping` and `texture.repeat`.

**Linear color space** for bump/roughness maps: `opts.linear: true` uses `THREE.NoColorSpace` (avoids gamma correction artifacts on greyscale maps).

---

## 10. Collision System

Built from `Box3` objects in world space.

**Sources of colliders:**

| Source | How collected |
|--------|-------------|
| `museum.js` walls | `new THREE.Box3().setFromObject(wallMesh)` in the `wall()` helper |
| `museum.js` columns | Manually sized Box3 (x+-0.45, z+-0.45, full height) |
| `exhibits.js` UCL backboard | `back.userData.solid = true` -> `solidColliders()` in main.js |
| `exhibits.js` UCL exhibit | Manually sized Box3 around the whole exhibit |
| `exhibits.js` domestic exhibit | Manually sized Box3 |
| Pedestals | `g.userData.solid = true` -> `solidColliders()` auto-derives Box3 |

**`solidColliders(...roots)` in main.js:**
Traverses Three.js groups for meshes with `userData.solid = true`, calls `setFromObject()` on each, and enforces a minimum `max.y` of 0.9 (waist height) so very flat objects still block the player.

**Resolution (in `controls._move`):**
1. Move X.
2. Clamp X to room bounds.
3. `_blocked("x", fromX)` — for every collider, if player overlaps on X but came from outside, push them back to the face they entered.
4. Move Z.
5. Clamp Z to room bounds.
6. `_blocked("z", fromZ)` — same for Z.
7. Two full passes of both axes to handle corner clips.

---

## 11. Controls and Camera System

### Key values

| Constant | Value | Meaning |
|----------|-------|---------|
| `EYE` | 1.66 m | Camera Y in first-person |
| `HEAD` | 1.62 m | Avatar head Y for eagle-eye orbit target |
| `RADIUS` | 0.36 m | Player capsule radius for collision |
| `SKIN` | 0.05 m | Extra gap kept from surfaces |
| `SPEED` | 4.4 m/s | Walk speed |
| `SPRINT` | 7.2 m/s | Sprint speed (hold Shift) |

### Key bindings

| Key | Action |
|-----|--------|
| W / Arrow Up | Move forward |
| S / Arrow Down | Move backward |
| A / Arrow Left | Strafe left |
| D / Arrow Right | Strafe right |
| Shift | Sprint |
| E | Interact / close magazine |
| V | Toggle eagle-eye / first-person |
| Esc | Release pointer lock (drag-to-look takes over) |
| Left / Right arrows (in magazine) | Previous / next page |
| H / L (in magazine) | Previous / next page (vim-style) |

---

## 12. Magazine / Overlay System

```
Magazine constructor
  `- Grabs: #magazine, #mag-page, #mag-title, #mag-kicker,
            #mag-counter, #mag-prev, #mag-next, #mag-close
  `- Registers: prev/next buttons, close button, backdrop click,
                page click (350ms debounce), keyboard events

magazine.show({ kicker, title, pages })
  `- pages[] = array of { html: "..." }
  `- render() injects pages[index].html into #mag-page

Page builders return html strings containing:
  - .pg-hero: two-column hero layout (photo left, info right)
  - .page-photo: full-bleed photo with onerror fallback to data URL
  - .page-year, .page-score, .page-meta, .page-text, .page-note
  - .mini-trophies: dots for UCL page tracker
  - .player-name, .player-years: for Ballon d'Or pages
  - .tally-big, .year-grid: for domestic pages
```

---

## 13. Key Constants and Configuration

| Location | Constant | Value | Notes |
|----------|----------|-------|-------|
| `museum.js` | `ROOM` | `{w:40, d:26, h:6, ...}` | Hall dimensions in world units |
| `controls.js` | `EYE` | `1.66` | First-person camera height |
| `controls.js` | `SPEED` | `4.4` | Walk speed m/s |
| `controls.js` | `SPRINT` | `7.2` | Sprint speed m/s |
| `controls.js` | `RADIUS` | `0.36` | Collision radius |
| `main.js` | Starting pose | `(-14, -8.2, -pi/2-0.35)` | Player spawns at entrance looking into hall |
| `main.js` | Painting proximity | `3.6 m` | Distance to trigger painting prompt |
| `main.js` | Statue proximity | `4.2 m` | Fallback proximity for statue (thin hit box) |
| `main.js` | Raycast max dist | `4.6 m` | UCL / domestic interaction distance |
| `server.js` | `PORT` | `5173` | Default dev port (`process.env.PORT` overrides) |
| `download_assets.py` | `THROTTLE_S` | `3.0` | Seconds between Wikimedia API calls |

---

## 14. Testing and Dev Tools

### Debug namespace — `window.__museum`

Available in the browser console while the scene is running:

```js
window.__museum.activate("ucl")         // open UCL magazine
window.__museum.activate("statue")      // open Ballon d'Or magazine
window.__museum.activate("domestic")    // open domestic magazine
window.__museum.setView(true)           // switch to first-person
window.__museum.setView(false)          // switch to eagle-eye
window.__museum.enter()                 // trigger museum entry
window.__museum.warp(x, z, yaw, pitch) // teleport player to coordinates
window.__museum.mode                    // current mode string ("splash"|"roam"|"magazine")
window.__museum.target                  // currently highlighted interactable id or null
window.__museum.fpv                     // true if in first-person view
window.__museum.player                  // [x, y, z] player position array
window.__museum.paintingNew()           // true if painting shows new Bernabeu
window.__museum.step(dt, n)             // advance n simulation steps manually (for tests)
window.__museum.scene                   // THREE.Scene
window.__museum.camera                  // THREE.PerspectiveCamera
window.__museum.renderer                // THREE.WebGLRenderer
window.__museum.controls                // PlayerControls instance
window.__museum.avatar                  // avatar { group, update, setFacing }
window.__museum.lib                     // TextureLibrary instance
window.__museum.THREE                   // Three.js namespace
```

### Tool scripts in `tools/`

| File | Purpose |
|------|---------|
| `download_assets.py` | Download Wikimedia photos and write manifest.json |
| `check_shots.py` | Verify downloaded photos exist and are valid |
| `face_crop.py` | Crop/align face photos for consistent portrait framing |
| `collisiontest.js` | Standalone collision logic unit tests |
| `selftest.js` | Integration tests using Playwright |
| `smoke_test.js` | Quick sanity check (scene loads, enter works) |
| `shots.js` | Screenshot capture helpers |
| `shot.js` | Individual screenshot utility |
| `faceprobe.html` | Browser tool to inspect/preview face crops |
| `posters.html` | Preview all wall posters in isolation |
| `statue.html` | Preview the CR7 statue in isolation |
| `trophies.html` | Preview all trophy models in isolation |
