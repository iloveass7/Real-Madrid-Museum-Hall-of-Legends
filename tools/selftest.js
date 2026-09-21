// Self-test: entry, walking, look without pointer lock, view switching and
// the magazine. World logic is stepped explicitly (window.__museum.step) so
// headless frame throttling can't hide real behaviour.
//
//   npm start          # in one terminal
//   node tools/selftest.js
import { chromium } from "playwright-core";
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox",
         "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
         "--disable-backgrounding-occluded-windows"],
});
const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
p.on("pageerror", e => console.log("pageerror:", e.message));
p.on("console", m => { if (m.type() === "error") console.log("console:", m.text()); });
await p.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await p.waitForFunction(() => window.__museum, null, { timeout: 30000 });

// pump: screenshots force the compositor to produce frames
const pump = async (n = 30) => p.evaluate((n) => window.__museum.step(1 / 60, n), n);

await p.click("#enter-btn");
await pump(20);
console.log("entered:", await p.evaluate(() => ({ mode: window.__museum.mode, locked: !!document.pointerLockElement })));

const at = () => p.evaluate(() => window.__museum.player.map(v => +v.toFixed(2)));
const start = await at();
await p.keyboard.down("w"); await pump(60); await p.keyboard.up("w");
console.log("walk forward:", start, "->", await at());

// look with the pointer lock released (the failure mode users hit)
await p.evaluate(() => document.exitPointerLock());
await pump(60);
const yaw0 = await p.evaluate(() => +window.__museum.controls.yaw.toFixed(3));
await p.mouse.move(550, 350); await p.mouse.down();
await p.mouse.move(400, 350, { steps: 6 }); await p.mouse.up();
await pump(60);
console.log("drag-look without lock:", yaw0, "->", await p.evaluate(() => +window.__museum.controls.yaw.toFixed(3)));

const before = await at();
await p.keyboard.down("d"); await pump(60); await p.keyboard.up("d");
console.log("strafe while unlocked:", before, "->", await at());

// eagle eye
await p.keyboard.press("v");
await pump(60);
console.log("eagle:", await p.evaluate(() => ({
  fpv: window.__museum.fpv,
  avatarVisible: window.__museum.avatar.group.visible,
  camY: +window.__museum.camera.position.y.toFixed(2),
  button: document.getElementById("view-btn").textContent.trim(),
})));
await p.screenshot({ path: "tools/shots/20-eagle.png" });
const e0 = await at();
await p.keyboard.down("w"); await pump(60); await p.keyboard.up("w");
console.log("walk in eagle:", e0, "->", await at());
await p.screenshot({ path: "tools/shots/21-eagle-walk.png" });

await p.keyboard.press("v"); await pump(60);
console.log("back to first person:", await p.evaluate(() => window.__museum.fpv));
await p.screenshot({ path: "tools/shots/22-fpv.png" });


const magOpen = () => p.evaluate(() => !document.getElementById("magazine").classList.contains("hidden"));
console.log("--- magazine ---");
// walk up to the UCL wall and open it with E
await p.evaluate(() => window.__museum.warp(10, -7.2, 0)); await pump(30);
console.log("prompt at UCL wall:", await p.evaluate(() => !document.getElementById("prompt").classList.contains("hidden")));
await p.keyboard.press("e"); await pump(10);
console.log("magazine opened with E:", await magOpen());
await p.waitForTimeout(400);
console.log("still open after 400ms:", await magOpen());
await p.keyboard.press("ArrowRight"); await p.waitForTimeout(100);
console.log("page:", await p.evaluate(() => document.getElementById("mag-counter").textContent));
await p.keyboard.press("e"); await p.waitForTimeout(150);
console.log("closed with E:", !(await magOpen()), "| mode:", await p.evaluate(() => window.__museum.mode));

// open by clicking, unlocked (drag-look path)
await p.evaluate(() => document.exitPointerLock());
await pump(10);
await p.mouse.click(550, 350); await p.waitForTimeout(450);
console.log("opened by click while unlocked:", await magOpen());
await p.evaluate(() => window.__museum.activate && document.getElementById("mag-close").click());
await p.waitForTimeout(200);

// a drag must NOT open anything
await p.mouse.move(550, 350); await p.mouse.down(); await p.mouse.move(400, 330, { steps: 8 }); await p.mouse.up();
await p.waitForTimeout(300);
console.log("drag did not open a magazine:", !(await magOpen()));

// eagle view interaction still works
await p.keyboard.press("v"); await pump(40);
console.log("eagle prompt visible:", await p.evaluate(() => !document.getElementById("prompt").classList.contains("hidden")));
await p.keyboard.press("e"); await pump(10);
console.log("opened from eagle view:", await magOpen());


await b.close();
