#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/screenshot.js [url] [width] [height] [outfile]
 *
 * Defaults:
 *   url     = http://localhost:3000/login
 *   width   = 1280
 *   height  = 832
 *   outfile = /tmp/screenshot.png
 *
 * After running, the screenshot opens automatically (macOS).
 */

const { chromium } = require("playwright");
const { execSync } = require("child_process");
const path = require("path");

const url     = process.argv[2] ?? "http://localhost:3000/login";
const width   = parseInt(process.argv[3] ?? "1280", 10);
const height  = parseInt(process.argv[4] ?? "832", 10);
const outfile = process.argv[5] ?? "/tmp/comm-screenshot.png";

(async () => {
  const browser = await chromium.launch();
  const page    = await browser.newPage();

  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: "networkidle" });

  // Wait for custom fonts to load
  await page.evaluate(() =>
    document.fonts.ready.then(() => new Promise(r => setTimeout(r, 300)))
  );

  await page.screenshot({ path: outfile, fullPage: false });
  await browser.close();

  console.log(`✓ screenshot saved → ${outfile}  (${width}×${height})`);

  // Open on macOS
  try { execSync(`open "${outfile}"`); } catch {}
})();
