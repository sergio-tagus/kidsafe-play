#!/usr/bin/env node
/**
 * Copies generated icon / splash / TV assets into the Capacitor
 * native projects. Run after `python3 scripts/generate-icons.py`
 * and after `npx cap add ios` / `npx cap add android`.
 *
 *   node scripts/sync-native-assets.mjs
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const IOS_SRC = join(ROOT, "ios-assets/AppIcon.appiconset");
const AND_SRC = join(ROOT, "android-assets");

const IOS_DEST = join(ROOT, "ios/App/App/Assets.xcassets/AppIcon.appiconset");
const AND_DEST = join(ROOT, "android/app/src/main/res");

function copyIfExists(src, dest, label) {
  if (!existsSync(src)) {
    console.warn(`skip ${label}: ${src} missing`);
    return;
  }
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`✓ ${label}`);
}

if (existsSync(join(ROOT, "ios"))) {
  copyIfExists(IOS_SRC, IOS_DEST, "iOS AppIcon.appiconset");
} else {
  console.log("ios/ not found — run `npx cap add ios` first");
}

if (existsSync(join(ROOT, "android"))) {
  for (const d of ["mipmap-mdpi","mipmap-hdpi","mipmap-xhdpi","mipmap-xxhdpi","mipmap-xxxhdpi","mipmap-anydpi-v26","drawable-mdpi","drawable-hdpi","drawable-xhdpi","drawable-xxhdpi","drawable-xxxhdpi","values"]) {
    copyIfExists(join(AND_SRC, d), join(AND_DEST, d), `Android ${d}`);
  }
} else {
  console.log("android/ not found — run `npx cap add android` first");
}

console.log("\nDone. Now run: npx cap sync");
