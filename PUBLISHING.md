# Publicar SafeTube Kids

Guía completa para pasar del código en Lovable a **PWA instalable**, **Google Play**, **App Store** y **Android TV**.

---

## 0. Requisitos (una sola vez)

| Plataforma | Coste | Qué necesitas |
| --- | --- | --- |
| **PWA** | Gratis | Nada. Ya está lista. |
| **Google Play + Android TV** | 25 $ único | Cuenta [Google Play Console](https://play.google.com/console) + [Android Studio](https://developer.android.com/studio) |
| **App Store** | 99 $/año | Cuenta [Apple Developer](https://developer.apple.com/programs/) + **macOS** con [Xcode](https://apps.apple.com/us/app/xcode/id497799835) |

> **Apple TV (tvOS)** no está soportado — requeriría reescribir la app en SwiftUI. Descartado.

---

## 1. PWA (ya funciona)

Con solo publicar en Lovable, la app se puede instalar como aplicación:

- **Android / Chrome**: menú ⋮ → “Instalar aplicación”.
- **iOS / Safari**: Compartir → “Añadir a pantalla de inicio”.
- **Desktop / Chrome / Edge**: icono ⊕ en la barra de direcciones.

Ya incluye: `manifest.webmanifest`, iconos 192/512 + maskable, apple-touch-icon, theme-color.

---

## 2. Empaquetado nativo con Capacitor

### 2.1. Instalar dependencias (una vez)

```bash
bun install
bun run cap:build          # genera dist/client + index.html estático + npx cap sync
```

> `capacitor.config.ts` apunta a `webDir: "dist/client"`. TanStack Start no genera un `index.html` estático, así que `scripts/build-capacitor.mjs` lo crea a partir de los assets hasheados antes de sincronizar.

### 2.2. Copiar iconos y splash a las carpetas nativas

Cuando regeneres el logo, corre esto:

```bash
python3 scripts/generate-icons.py
node scripts/sync-native-assets.mjs
bun run cap:sync
```

### 2.3. Cada vez que actualices el código web

```bash
bun run cap:build
```

Esto ejecuta `vite build`, genera `dist/client/index.html` y corre `npx cap sync`.

---

## 3. Google Play (Android)

### 3.1. Abrir el proyecto

```bash
bun run cap:open:android
```

### 3.2. Firma

En Android Studio → **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**. Crea un keystore la primera vez y **guárdalo seguro** — sin él no podrás actualizar la app.

### 3.3. Subir a Play Console

1. Play Console → “Crear aplicación”.
2. Sube el `.aab`.
3. Rellena la ficha con los assets ya generados en `src/assets/store/`:
   - **Icono de alta resolución**: `play-icon-512.png`
   - **Gráfico destacado**: `play-feature-graphic-1024x500.png`
   - **Capturas de pantalla**: teléfono ≥ 2, tablet 7", tablet 10", Android TV (ver §5).

### 3.4. Android TV

El manifest ya está preparado:

- `android/app/src/main/AndroidManifest.xml` incluye `LEANBACK_LAUNCHER`, touchscreen opcional y `android:banner="@drawable/banner"`.
- El banner 320×180 está en `android-assets/drawable-xhdpi/banner.png` y se copia con `sync-native-assets.mjs`.

Para publicar en TV: en Play Console → Store presence → Store listing → **Android TV** → activa y sube 2 screenshots 1920×1080 landscape.

---

## 4. App Store (iOS) — solo en macOS

```bash
npx cap open ios
```

En Xcode:

1. Selecciona el target `App` → Signing & Capabilities → tu Team.
2. Product → Archive → Distribute App → App Store Connect.
3. En [App Store Connect](https://appstoreconnect.apple.com/):
   - Crea la app con Bundle ID `com.safetube.kids`.
   - Sube el icono **`src/assets/store/appstore-icon-1024.png`** (sin transparencia, sin bordes).
   - Sube screenshots iPhone 6.7" y iPad Pro 12.9" (ver §5).
   - Rellena descripción, categorías (Kids → 5 and Under / 6-8 / 9-11 según público) y política de privacidad **obligatoria** para apps infantiles.
4. Envíalo a revisión. Apple suele responder en 24-48 h.

> **Sign in with Apple**: obligatorio si la app permite login con Google. Ya está soportado por Lovable Cloud — configúralo si aplica.

---

## 5. Screenshots de tienda

Genéralos con Playwright desde la app real:

```bash
bun run screenshots
```

Output: `src/assets/store/screenshots/`. El script usa el Chromium del sistema (`/bin/chromium`) porque el sandbox no incluye los browsers de Playwright por defecto.

Formatos generados:

| Dispositivo | Resolución | Escalas |
| --- | --- | --- |
| iPhone 6.7" | 1290×2796 | 3× |
| iPhone 6.5" | 1284×2778 | 3× |
| iPad Pro 12.9" | 2048×2732 | 2× |
| Android teléfono | 1080×1920 | 2× |
| Android tablet | 1600×2560 | 2× |
| Android TV | 1920×1080 | 1× |

Páginas capturadas:

- Públicas: `/auth`, `/privacy`.
- Autenticadas (si inyectas sesión): `/`, `/parent`, `/parent/whitelist`, `/parent/categories`, `/parent/history`.

> Para capturar páginas autenticadas, exporta la sesión de Supabase en las variables `LOVABLE_BROWSER_SUPABASE_SESSION_JSON`, `LOVABLE_BROWSER_SUPABASE_STORAGE_KEY` y `LOVABLE_BROWSER_SUPABASE_COOKIES_JSON` antes de ejecutar el script.

---

## 6. OAuth en la app nativa

El login social (Google) requiere un esquema personalizado. En el backend, añade a los redirect URLs permitidos:

```
com.safetube.kids://auth/callback
```

En `src/routes/auth.tsx`, el código ya selecciona el redirect según la plataforma:

```ts
const redirectUri = Capacitor.isNativePlatform()
  ? "com.safetube.kids://auth/callback"
  : `${window.location.origin}/auth`;
```

El `AndroidManifest.xml` incluye el `intent-filter` para capturar `com.safetube.kids://auth/callback`. En iOS añade el `CFBundleURLTypes` correspondiente en Xcode siguiendo la documentación oficial: https://capacitorjs.com/docs/guides/deep-links

---

## 7. Política de privacidad

La app incluye una página pública `/privacy` multilingüe (es/en/pt). Enlaces:

- Desde la pantalla de login (`/auth`).
- Desde el menú lateral del panel de padres.

URL pública para las tiendas:

```
https://kidsafe-play.lovable.app/privacy
```

(o la URL publicada que tengas conectada como dominio personalizado).

---

## 8. Actualizaciones

1. Cambia código → `bun run cap:build`.
2. En Xcode/Android Studio, sube el número de versión.
3. Genera un nuevo binario firmado y súbelo a la store correspondiente.

Los **cambios solo web** (PWA) se despliegan al hacer *Publish* en Lovable — sin re-subir binarios.

---

## 9. AirPlay / Chromecast blocking

The kids' video player blocks casting to external devices at multiple layers:

- **Web / PWA**: the YouTube iframe is set with `disableRemotePlayback`,
  `x-webkit-airplay="deny"`, `controlsList="nodownload noremoteplayback"`
  and its `allow` attribute omits `picture-in-picture`. Global CSS in
  `src/styles.css` also hides `::-webkit-media-controls-cast-button` on any
  native `<video>`.
- **iOS (Capacitor)**: `capacitor.config.ts` sets
  `ios.allowsAirPlayForMediaPlayback: false`, so the WKWebView will not
  advertise media to AirPlay receivers. The system Control Center mirror
  toggle cannot be blocked from an app — parents relying on that vector
  should enable Screen Time > "Don't Allow" for AirPlay.
- **Android (Capacitor)**: cast is not offered by the WebView unless the
  page requests it; the controlsList and CSS above cover the WebView
  chrome. Screen mirroring from Quick Settings is an OS-level action
  outside the app.
