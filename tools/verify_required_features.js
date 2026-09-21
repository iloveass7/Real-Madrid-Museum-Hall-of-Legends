// Focused regression check for the three presentation requirements:
// walking/orbit camera, a sweeping statue light, and the painting transition.
// Run with the local server on port 5173: node tools/verify_required_features.js
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const chrome = process.env.CHROME_PATH || (process.platform === "win32"
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "/opt/pw-browsers/chromium-1194/chrome-linux/chrome");
const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__museum, null, { timeout: 30000 });
  await page.click("#enter-btn");

  const start = await page.evaluate(() => ({
    player: window.__museum.player,
    camera: window.__museum.camera.position.toArray(),
  }));
  await page.keyboard.down("w");
  await page.evaluate(() => window.__museum.step(1 / 60, 80));
  await page.keyboard.up("w");
  const walked = await page.evaluate(() => ({
    player: window.__museum.player,
    camera: window.__museum.camera.position.toArray(),
  }));
  const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));
  assert.ok(distance(start.player, walked.player) > 0.5, "W moves the player through the museum");
  assert.ok(distance(start.camera, walked.camera) > 0.5, "the camera follows the moving player");
  await page.keyboard.press("v");
  await page.evaluate(() => window.__museum.step(1 / 60, 80));
  const eagle = await page.evaluate(() => ({
    fpv: window.__museum.fpv,
    cameraY: window.__museum.camera.position.y,
  }));
  assert.equal(eagle.fpv, false, "V switches to the orbit camera");
  assert.ok(eagle.cameraY > 3, "orbit camera moves above the gallery");
  await page.keyboard.press("v");
  await page.evaluate(() => window.__museum.step(1 / 60, 80));
  assert.equal(await page.evaluate(() => window.__museum.fpv), true, "V returns to first person");

  await page.waitForFunction(() => {
    let found = false;
    window.__museum.scene.traverse((object) => {
      if (object.isSkinnedMesh && object.material?.name === "StoneStatueShader") found = true;
    });
    return found;
  }, null, { timeout: 30000 });
  const light = await page.evaluate(() => {
    let stone;
    let beam;
    window.__museum.scene.traverse((object) => {
      if (object.isSkinnedMesh && object.material?.name === "StoneStatueShader") stone = object.material;
      if (object.name === "moving-statue-spotlight-beam") beam = object;
    });
    const before = stone.uniforms.uSpotTargetA.value.clone();
    window.__museum.step(1 / 60, 240);
    return {
      enabled: stone.uniforms.uSpotEnabled.value,
      strength: stone.uniforms.uSpotStrengthA.value,
      travel: before.distanceTo(stone.uniforms.uSpotTargetA.value),
      beamVisible: beam?.visible,
      beamLength: beam?.scale.y,
    };
  });
  assert.equal(light.enabled, 1, "stone shader receives the moving spotlight");
  assert.ok(light.strength > 0 && light.travel > 0.25, "spotlight sweeps across the statue");
  assert.ok(light.beamVisible && light.beamLength > 1, "visible light beam follows the spotlight");
  if (process.argv[2]) {
    await page.evaluate(() => {
      window.__museum.warp(14.5, 0, -Math.PI / 2, 0.18);
      window.__museum.step(1 / 60, 5);
    });
    await page.screenshot({ path: process.argv[2] });
    if (process.argv[3]) {
      await page.evaluate(() => window.__museum.step(1 / 60, 180));
      await page.screenshot({ path: process.argv[3] });
    }
  }

  if (process.argv[4]) {
    await page.evaluate(() => {
      window.__museum.warp(-16.2, 0, Math.PI / 2, 0.2);
      window.__museum.step(1 / 60, 5);
    });
    await page.screenshot({ path: process.argv[4] });
  }

  const painting = await page.evaluate(() => {
    let material;
    window.__museum.scene.traverse((object) => {
      if (object.material?.name === "PaintingBlendShader") material = object.material;
    });
    const before = material.uniforms.uBlend.value;
    window.__museum.activate("painting");
    window.__museum.step(1 / 60, 80);
    const after = material.uniforms.uBlend.value;
    return {
      before,
      after,
      changed: window.__museum.paintingNew(),
      twoTextures: material.uniforms.uOldMap.value !== material.uniforms.uNewMap.value,
    };
  });
  assert.equal(painting.before, 0, "painting starts with the old image");
  assert.ok(painting.changed && painting.after > 0.9 && painting.twoTextures,
    "painting blends from the old stadium texture to the new one");
  if (process.argv[5]) await page.screenshot({ path: process.argv[5] });
  assert.deepEqual(errors, [], "page has no WebGL or JavaScript errors");
  console.log("PASS: camera movement, orbit view, moving statue spotlight, painting texture blend");
} finally {
  await browser.close();
}
