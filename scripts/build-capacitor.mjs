#!/usr/bin/env node
/**
 * Build wrapper for Capacitor (remote mode).
 *
 * The app uses server functions, so it cannot be packaged as static files.
 * The native app loads the published site (server.url in capacitor.config.ts).
 * This script only writes a minimal loading shell to capacitor-shell/ and
 * runs `npx cap sync`. No vite build.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const SHELL_DIR = join(ROOT, "capacitor-shell");

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>SafeTube Kids</title>
  <meta name="theme-color" content="#FF6B9D">
  <style>
    html,body{margin:0;height:100%;background:#FFF7ED;color:#3b2a1a;font-family:system-ui,sans-serif}
    .c{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:24px}
    .e{font-size:64px}.s{width:36px;height:36px;border:4px solid #FFD6E5;border-top-color:#FF6B9D;border-radius:50%;animation:r 1s linear infinite}
    @keyframes r{to{transform:rotate(360deg)}}
    #off{display:none}
  </style>
</head>
<body>
  <div class="c">
    <div class="e">🦄</div>
    <div id="load"><div class="s"></div><p>Cargando SafeTube Kids…</p></div>
    <div id="off"><p>Sin conexión. Comprueba tu Internet.</p><button onclick="location.reload()">Reintentar</button></div>
  </div>
  <script>
    function off(){document.getElementById('load').style.display='none';document.getElementById('off').style.display='block';}
    if(!navigator.onLine) off();
    window.addEventListener('offline', off);
    // If the remote site has not replaced this page after 15s, offer a retry.
    setTimeout(off, 15000);
  </script>
</body>
</html>
`;

mkdirSync(SHELL_DIR, { recursive: true });
writeFileSync(join(SHELL_DIR, "index.html"), html);
console.log("Wrote capacitor-shell/index.html");

console.log("Syncing Capacitor...");
execSync("npx cap sync", { stdio: "inherit", cwd: ROOT });
console.log("Capacitor sync complete.");
