# Android en modo remoto (la app carga la web publicada)

## Qué cambia
1. **capacitor.config.ts**
   - `webDir: "capacitor-shell"`
   - `server: { url: "https://kidsafe-play.lovable.app", cleartext: false, androidScheme: "https" }`
   - Se mantiene el resto (splash, AirPlay bloqueado, etc.).
2. **scripts/build-capacitor.mjs** reescrito: sin `vite build`. Solo crea `capacitor-shell/index.html` (pantalla mínima "Cargando SafeTube Kids…" con el fondo de la marca, y mensaje "Sin conexión" si no carga) y ejecuta `npx cap sync`.
3. Añadir `capacitor-shell/` a `.gitignore` (se genera en cada build). El workflow de GitHub no necesita cambios: sigue llamando a `bun run cap:build`.
4. Actualizar PUBLISHING.md y AGENTS.md: la app nativa es una carcasa remota; los cambios web llegan al publicar, sin subir un nuevo .aab.

## Callback com.safetube.kids:// — hallazgo
Revisado el código: **hoy nadie escucha el regreso de `com.safetube.kids://auth/callback`** (no hay listener `appUrlOpen`), así que ese retorno no funcionaba ni antes. Además, en modo remoto Google bloquea el login dentro de un WebView embebido (error "disallowed_useragent").

Arreglo propuesto:
- En la app nativa, abrir el login de Google en el **navegador del sistema** (Custom Tab, plugin `@capacitor/browser`).
- Añadir un listener `App.addListener("appUrlOpen")` que, al recibir `com.safetube.kids://auth/callback#...`, cierre el navegador, recupere la sesión (tokens o código) y navegue a la página pedida.
- Paso de verificación primero: comprobar que el servicio de login acepta `com.safetube.kids://auth/callback` como redirect. Si no lo acepta, plan B: en Android usar el login "Entrar con el móvil" (código/QR ya existente para TV) también en teléfonos/tablets nativos, que no depende de redirects.
- Web y PWA no cambian (siguen con `${origin}/auth`).

## Detalles técnicos
- Archivos: `capacitor.config.ts`, `scripts/build-capacitor.mjs`, `.gitignore`, `src/routes/auth.tsx`, nuevo `src/lib/native-auth.ts` (listener, iniciado en `__root.tsx` solo si `Capacitor.isNativePlatform()`), `package.json` (+`@capacitor/browser`).
- El intent-filter del AndroidManifest ya existe y se mantiene.
- Nota: el dominio principal es `kidsafe-play.mediaatlastv.com`; se usa `kidsafe-play.lovable.app` como pediste (ambos sirven la misma app).
