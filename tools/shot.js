// Generic headless screenshot helper.
// usage: node tools/shot.js <url-path> <out.png> [evalExpr]
import { chromium } from "playwright-core";
const [, , urlPath, out, expr] = process.argv;
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on("console", (m) => { if (m.type() === "error") console.log("console:", m.text()); });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto(`http://localhost:5173${urlPath}`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__ready, null, { timeout: 30000 }).catch(() => console.log("no __ready"));
if (expr) console.log(JSON.stringify(await page.evaluate(expr)));
await page.waitForTimeout(500);
await page.screenshot({ path: out });
await browser.close();
