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
 * Requirements:
 *  - Noto Color Emoji installed as a system font, or kid avatars and
 *    language flags render as empty boxes:
 *      cp NotoColorEmoji.ttf /usr/share/fonts/truetype/noto/ && fc-cache -f
 *  - Capture with a NON-superadmin session: the parent menu hides
 *    "Impersonar usuario", "Consumo API" and "Cuentas vinculadas" for
 *    regular users.
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

// Sensitive-data masking: comma-separated literals (child names, emails…) to
// blur before capture, plus automatic email blur. Set MASK_TEXTS="Eluise,...".
const MASK_TEXTS = (process.env.MASK_TEXTS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

async function maskSensitive(page) {
  await page.evaluate((texts) => {
    const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const hits = [];
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent ?? "";
      if (EMAIL.test(t) || texts.some((m) => t.includes(m))) {
        if (node.parentElement) hits.push(node.parentElement);
      }
    }
    for (const el of hits) {
      el.style.filter = "blur(10px)";
      el.style.userSelect = "none";
    }
  }, MASK_TEXTS);
}

// Emojis (kid avatars, language flags) render via the system font. Install
// Noto Color Emoji first:  fc-list | grep -i emoji
//
// Channel/video thumbnails come from yt3.ggpht.com and may be lazy-loaded;
// force eager loading and wait until every visible image is decoded before
// capturing, otherwise screenshots show empty thumbnail boxes.
async function waitForImages(page) {
  await page.evaluate(() => {
    document.querySelectorAll("img").forEach((i) => { i.loading = "eager"; });
  });
  await page
    .waitForFunction(
      () => {
        const imgs = Array.from(document.querySelectorAll("img")).filter((i) => {
          const r = i.getBoundingClientRect();
          return r.width > 0 && r.bottom > -innerHeight && r.top < innerHeight * 1.5;
        });
        return imgs.every((i) => i.complete);
      },
      { timeout: 20000 }
    )
    .catch(() => {});
  // Wait for decode so the pixels are actually paintable.
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.querySelectorAll("img"))
        .filter((i) => i.complete && i.naturalWidth > 0)
        .map((i) => i.decode().catch(() => {}))
    )
  );
}

async function restoreSession(page) {
  if (!hasSession) return;
  await page.goto(URL);
  await page.evaluate(
    (args) => {
      window.localStorage.setItem(args.key, args.value);
      // Parent menu session gate (see src/routes/_authenticated/parent/route.tsx).
      // The server-side unlock window must also be active for this user.
      window.sessionStorage.setItem("safetube.parent_pin_ok", "1");
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
    const tvq = d.name === "android-tv" ? (p.path.includes("?") ? "&tv=1" : "?tv=1") : "";
    await page.goto(URL + p.path + tvq, { waitUntil: "networkidle" });
    await waitForImages(page);
    await page.waitForTimeout(800);
    await maskSensitive(page);
    await page.screenshot({ path: join(OUT, `${d.name}-${p.name}.png`) });
    console.log(`✓ ${d.name}-${p.name}.png`);
  }
  await ctx.close();
}
await browser.close();
console.log(`\nDone. Output: ${OUT}/`);
