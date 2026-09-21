// Walk the museum and capture the key views.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SHOTS = fileURLToPath(new URL("./shots/", import.meta.url));
mkdirSync(SHOTS, { recursive: true });

const errors = [];
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__museum, null, { timeout: 30000 });
await page.evaluate(() => {
  document.getElementById("enter-btn").click();
  setTimeout(() => document.getElementById("splash").remove(), 100);
});
await page.waitForTimeout(2500);   // let the statue models load

async function shot(name, x, z, yaw, pitch = 0, wait = 900) {
  await page.evaluate(([x, z, yaw, pitch]) => window.__museum.warp(x, z, yaw, pitch), [x, z, yaw, pitch]);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: join(SHOTS, name) });
  console.log("shot:", name);
}

const views = process.argv[2] ? process.argv[2].split(",") : null;
const ALL = {
  entrance: ["2-entrance-view.png", -14, -8.2, -Math.PI / 2 - 0.35, 0],
  ucl: ["3-ucl-wall.png", 10, -7.5, 0, 0.05],
  statue: ["4-statue.png", 14.2, 0, -Math.PI / 2, 0.12],
  statueclose: ["11-statue-face.png", 16.4, 0, -Math.PI / 2, 0.30],
  domestic: ["5-domestic.png", 10, 8.2, Math.PI, 0.05],
  domclose: ["13-domestic-closeup.png", 10, 9.6, Math.PI, 0.12],
  uclclose: ["12-ucl-closeup.png", 10, -9.6, 0, 0.10],
  flags: ["15-flags.png", -8, 0, -Math.PI / 2 + 0.3, 0.42],
  flagsnorth: ["16-flags-north.png", -14, -4.5, -0.3, 0.45],
  hall: ["17-hall.png", -4, 6, -Math.PI / 2 - 0.5, 0.18],
};
for (const [k, v] of Object.entries(ALL)) {
  if (views && !views.includes(k)) continue;
  await shot(...v);
}

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no console errors");
await browser.close();
