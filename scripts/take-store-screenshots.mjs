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
 * For authenticated pages, set LOVABLE_BROWSER_SUPABASE_STORAGE_KEY and
 * LOVABLE_BROWSER_SUPABASE_SESSION_JSON (or SESSION_JSON) in the env.
 * Without a session the script captures only public routes.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const URL = process.env.URL ?? "http://localhost:8080";
const OUT = "src/assets/store/screenshots";
mkdirSync(OUT, { recursive: true });

const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY || process.env.STORAGE_KEY;
const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON || process.env.SESSION_JSON;
const hasSession = Boolean(storageKey && sessionJson);

const DEVICES = [
  { name: "iphone-6.7", w: 1290, h: 2796, scale: 3 },
  { name: "iphone-6.5", w: 1284, h: 2778, scale: 3 },
  { name: "ipad-12.9", w: 2048, h: 2732, scale: 2 },
  { name: "android-phone", w: 1080, h: 1920, scale: 2 },
  { name: "android-tablet", w: 1600, h: 2560, scale: 2 },
  { name: "android-tv", w: 1920, h: 1080, scale: 1 },
];

const PUBLIC_PAGES = [
  { name: "auth", path: "/auth" },
  { name: "privacy", path: "/privacy" },
];

const AUTH_PAGES = hasSession
  ? [
      { name: "home", path: "/" },
      { name: "parent", path: "/parent" },
      { name: "whitelist", path: "/parent/whitelist" },
      { name: "categories", path: "/parent/categories" },
      { name: "history", path: "/parent/history" },
    ]
  : [];

const PAGES = [...PUBLIC_PAGES, ...AUTH_PAGES];

async function restoreSession(page) {
  if (!hasSession) return;
  await page.goto(URL);
  await page.evaluate(
    (args) => {
      window.localStorage.setItem(args.key, args.value);
    },
    { key: storageKey, value: sessionJson },
  );
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE ?? "/bin/chromium",
});
for (const d of DEVICES) {
  const ctx = await browser.newContext({
    viewport: { width: Math.round(d.w / d.scale), height: Math.round(d.h / d.scale) },
    deviceScaleFactor: d.scale,
  });
  const page = await ctx.newPage();
  await restoreSession(page);

  for (const p of PAGES) {
    await page.goto(URL + p.path, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(OUT, `${d.name}-${p.name}.png`) });
    console.log(`✓ ${d.name}-${p.name}.png`);
  }
  await ctx.close();
}
await browser.close();
console.log(`\nDone. Output: ${OUT}/`);
