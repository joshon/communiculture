#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/compare.js <design-file> [url] [width] [height] [outfile]
 *
 * Takes a screenshot of the running app and compares it side-by-side with
 * the design file (left=current, center=design, right=overlay at 50% opacity).
 *
 * Defaults:
 *   url     = http://localhost:3000/login
 *   width   = 1280
 *   height  = 832
 *   outfile = /tmp/comm-compare.png
 */

const { chromium } = require("playwright");
const { execSync }  = require("child_process");
const fs            = require("fs");

const designFile = process.argv[2] ?? null;
const url        = process.argv[3] ?? "http://localhost:3000/login";
const width      = parseInt(process.argv[4] ?? "1280", 10);
const height     = parseInt(process.argv[5] ?? "832",  10);
const outfile    = process.argv[6] ?? "/tmp/comm-compare.png";

(async () => {
  const browser = await chromium.launch();
  const page    = await browser.newPage();

  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() =>
    document.fonts.ready.then(() => new Promise(r => setTimeout(r, 300)))
  );

  const currentFile = "/tmp/comm-current-snap.png";
  await page.screenshot({ path: currentFile, fullPage: false });

  const currentB64 = fs.readFileSync(currentFile).toString("base64");

  let designB64 = null;
  if (designFile && fs.existsSync(designFile)) {
    designB64 = fs.readFileSync(designFile).toString("base64");
    console.log(`✓ loaded design file: ${designFile}`);
  } else if (designFile) {
    console.warn(`⚠ design file not found: ${designFile} — showing current only`);
  }

  const cols   = designB64 ? 3 : 1;
  const vw     = width  * cols + (cols - 1) * 4 + 8;
  const vh     = height + 8;

  const panel = (b64, label, labelColor = "rgba(0,0,0,0.7)") =>
    `<div class="panel">
       <div class="label" style="background:${labelColor}">${label}</div>
       <img src="data:image/png;base64,${b64}" />
     </div>`;

  const overlayPanel = (b64a, b64b) =>
    `<div class="panel" style="position:relative">
       <div class="label" style="background:rgba(200,60,0,0.85)">overlay</div>
       <img src="data:image/png;base64,${b64a}" />
       <img src="data:image/png;base64,${b64b}"
            style="position:absolute;top:0;left:0;opacity:0.55;mix-blend-mode:difference" />
     </div>`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#111; }
  .wrap { display:flex; gap:4px; padding:4px; }
  .panel { position:relative; flex-shrink:0; }
  .label { position:absolute; top:4px; left:4px; color:#fff; font:bold 11px monospace;
           padding:2px 6px; border-radius:3px; z-index:10; }
  img { display:block; width:${width}px; height:${height}px; }
</style>
</head>
<body>
<div class="wrap">
  ${panel(currentB64, "current")}
  ${designB64 ? panel(designB64, "design", "rgba(0,100,0,0.85)") : ""}
  ${designB64 ? overlayPanel(currentB64, designB64) : ""}
</div>
</body>
</html>`;

  const htmlFile = "/tmp/comm-compare.html";
  fs.writeFileSync(htmlFile, html);

  const cmp = await browser.newPage();
  await cmp.setViewportSize({ width: vw, height: vh });
  await cmp.goto(`file://${htmlFile}`, { waitUntil: "networkidle" });
  await cmp.screenshot({ path: outfile, fullPage: false });

  await browser.close();

  console.log(`✓ comparison saved → ${outfile}  (${vw}×${vh})`);
  try { execSync(`open "${outfile}"`); } catch {}
})();
