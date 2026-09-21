// Headless render test: loads the museum, captures console errors,
// walks the key camera positions, exercises interaction + magazine,
// and saves screenshots to tools/shots/.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SHOTS = fileURLToPath(new URL("./shots/", import.meta.url));
mkdirSync(SHOTS, { recursive: true });

const errors = [];
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__museum, null, { timeout: 20000 });
await page.screenshot({ path: join(SHOTS, "1-splash.png") });

// enter the museum (remove splash; pointer lock is flaky headless, warp instead)
await page.evaluate(() => {
  document.getElementById("enter-btn").click();
  setTimeout(() => document.getElementById("splash").remove(), 100);
});
await page.waitForTimeout(300);

async function shot(name, x, z, yaw, wait = 900, pitch = 0) {
  await page.evaluate(([x, z, yaw, pitch]) => window.__museum.warp(x, z, yaw, pitch), [x, z, yaw, pitch]);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: join(SHOTS, name) });
  console.log("shot:", name);
}

await shot("2-entrance-view.png", -14, -8.2, -Math.PI / 2 - 0.35);
await shot("3-ucl-wall.png", 10, -7.5, 0, 1400);              // face north (-z) at the UCL wall
await shot("4-statue.png", 14.5, 0, -Math.PI / 2, 1600);      // look east at statue
await shot("5-domestic.png", 10, 8.0, Math.PI, 900);           // look south at domestic
await shot("6-painting.png", -16.2, 0, Math.PI / 2, 900);      // look west at painting
await shot("11-statue-face.png", 16.0, 0, -Math.PI / 2, 1500, 0.18);   // close-up on the head
await shot("12-ucl-closeup.png", 10, -9.6, 0, 1200, 0.14);     // close-up on centerpiece cup
await shot("13-domestic-closeup.png", 10, 9.2, Math.PI, 1200, 0.16);  // close-up on trophies

// face-on head shot for pixel analysis (aim straight at the head)
await shot("14-statue-head-front.png", 15.0, 0, -Math.PI / 2, 1500, 0.50);

// deterministic: did the real face photo paint onto the statue head canvas?
const facePainted = await page.evaluate(() => window.__museum.lib.hasPhoto("cr7face"));
console.log("statue face photo painted:", facePainted);

// toggle the painting -> second shot shows the new Bernabéu
await page.evaluate(() => window.__museum.activate("painting"));
await page.waitForTimeout(1200);
await page.screenshot({ path: join(SHOTS, "7-painting-new.png") });
const paintingNew = await page.evaluate(() => window.__museum.paintingNew());

// open each magazine and step a couple of pages
await page.evaluate(() => window.__museum.activate("ucl"));
await page.waitForTimeout(500);
await page.screenshot({ path: join(SHOTS, "8-mag-ucl.png") });
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(300);
const magPage1 = await page.evaluate(() => document.getElementById("mag-counter").textContent);
await page.keyboard.press("e");
await page.waitForTimeout(300);

await page.evaluate(() => window.__museum.activate("statue"));
await page.waitForTimeout(500);
await page.screenshot({ path: join(SHOTS, "9-mag-ballon.png") });
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

await page.evaluate(() => window.__museum.activate("domestic"));
await page.waitForTimeout(500);
await page.screenshot({ path: join(SHOTS, "10-mag-domestic.png") });
await page.keyboard.press("e");
await page.waitForTimeout(300);

const finalMode = await page.evaluate(() => window.__museum.mode);
await browser.close();

console.log("\npainting isNew:", paintingNew);
console.log("mag counter after next:", magPage1);
console.log("final mode (expect roam):", finalMode);
if (errors.length) {
  console.log("\nERRORS (" + errors.length + "):");
  for (const e of errors) console.log(" -", e);
  process.exit(1);
}
console.log("\nALL CLEAR — no console/page errors");
