#!/usr/bin/env node
/**
 * Capture store screenshots at the exact viewports required by
 * Google Play and Apple App Store. Requires the dev server to be
 * running at http://localhost:8080 (or override with URL env).
 *
 *   node scripts/take-store-screenshots.mjs
 *
 * Output: src/assets/store/screenshots/
 *
 * You must be signed in as a demo user beforehand — the script
 * navigates to public routes only unless you provide a session.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const URL = process.env.URL ?? "http://localhost:8080";
const OUT = "src/assets/store/screenshots";
mkdirSync(OUT, { recursive: true });

const DEVICES = [
  { name: "iphone-6.7", w: 1290, h: 2796, scale: 3 },
  { name: "iphone-6.5", w: 1284, h: 2778, scale: 3 },
  { name: "ipad-12.9",  w: 2048, h: 2732, scale: 2 },
  { name: "android-phone", w: 1080, h: 1920, scale: 2 },
  { name: "android-tablet", w: 1600, h: 2560, scale: 2 },
  { name: "android-tv", w: 1920, h: 1080, scale: 1 },
];

const PAGES = [
  { name: "home", path: "/" },
  { name: "auth", path: "/auth" },
];

const browser = await chromium.launch();
for (const d of DEVICES) {
  const ctx = await browser.newContext({
    viewport: { width: Math.round(d.w / d.scale), height: Math.round(d.h / d.scale) },
    deviceScaleFactor: d.scale,
  });
  const page = await ctx.newPage();
  for (const p of PAGES) {
    await page.goto(URL + p.path, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, `${d.name}-${p.name}.png`) });
    console.log(`✓ ${d.name}-${p.name}.png`);
  }
  await ctx.close();
}
await browser.close();
