#!/usr/bin/env node
/**
 * Build wrapper for Capacitor.
 *
 * TanStack Start emits an SSR server but no static index.html. Capacitor
 * needs an index.html entry point, so this script generates one from the
 * production client assets after `vite build`.
 */
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const CLIENT_DIR = join(ROOT, "dist/client");
const ASSETS_DIR = join(CLIENT_DIR, "assets");

function findAsset(prefix, ext) {
  const files = readdirSync(ASSETS_DIR);
  const match = files.find((f) => f.startsWith(prefix) && f.endsWith(ext));
  if (!match) throw new Error(`Asset not found: ${prefix}*.${ext}`);
  return `assets/${match}`;
}

console.log("Building web bundle...");
execSync("bun run build", { stdio: "inherit", cwd: ROOT });

const jsEntry = findAsset("index", ".js");
const cssEntry = findAsset("styles", ".css");

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>SafeTube Kids</title>
  <meta name="theme-color" content="#FF6B9D">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="stylesheet" href="${cssEntry}">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${jsEntry}"></script>
</body>
</html>
`;

writeFileSync(join(CLIENT_DIR, "index.html"), html);
console.log(`Wrote dist/client/index.html -> ${jsEntry}, ${cssEntry}`);

console.log("Syncing Capacitor...");
execSync("npx cap sync", { stdio: "inherit", cwd: ROOT });
console.log("Capacitor sync complete.");
