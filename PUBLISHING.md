# Publicar SafeTube Kids

Esta guía explica cómo pasar del código en Lovable a **PWA instalable**, **Google Play**, **App Store** y **Android TV**.

---

## 0. Requisitos (una sola vez)

| Plataforma | Coste | Qué necesitas |
| --- | --- | --- |
| **PWA** | Gratis | Nada. Ya está listo. |
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
bun add @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android @capacitor/splash-screen @capacitor/status-bar
bun run build
npx cap add ios       # solo en macOS
npx cap add android
```

### 2.2. Copiar iconos y splash a las carpetas nativas

Cuando regeneres el logo, corre esto:

```bash
python3 scripts/generate-icons.py
node scripts/sync-native-assets.mjs
npx cap sync
```

### 2.3. Cada vez que actualices el código web

```bash
bun run build
npx cap sync
```

---

## 3. Google Play (Android)

### 3.1. Abrir el proyecto

```bash
npx cap open android
```

### 3.2. Firma

En Android Studio → **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**. Crea un keystore la primera vez y **guárdalo seguro** — sin él no podrás actualizar la app.

### 3.3. Subir a Play Console

1. Play Console → “Crear aplicación”.
2. Sube el `.aab`.
3. Rellena la ficha con los assets ya generados en `src/assets/store/`:
   - **Icono de alta resolución**: `play-icon-512.png`
   - **Gráfico destacado**: `play-feature-graphic-1024x500.png`
   - **Capturas de pantalla**: teléfono ≥ 2, tablet 7", tablet 10" (ver §5).

### 3.4. Android TV

El manifest ya está preparado por Capacitor pero necesitas dos cambios en `android/app/src/main/AndroidManifest.xml`:

```xml
<application ... android:banner="@drawable/banner">
  <uses-feature android:name="android.software.leanback" android:required="false" />
  <uses-feature android:name="android.hardware.touchscreen" android:required="false" />

  <activity ...>
    <intent-filter>
      <action android:name="android.intent.action.MAIN" />
      <category android:name="android.intent.category.LAUNCHER" />
      <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
    </intent-filter>
  </activity>
</application>
```

El banner 320×180 ya está en `android-assets/drawable-xhdpi/banner.png` y `sync-native-assets.mjs` lo copia.

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
# ejemplo - añade los viewports que necesites
node scripts/take-store-screenshots.mjs
```

Formatos requeridos:

- iPhone 6.7" — **1290×2796** portrait
- iPad Pro 12.9" — **2048×2732** portrait
- Android teléfono — mínimo **1080×1920**
- Android tablet — mínimo **1600×2560**
- Android TV — **1920×1080** landscape

---

## 6. OAuth en la app nativa

El login social (Google) requiere un esquema personalizado. En el backend, añade a los redirect URLs permitidos:

```
com.safetube.kids://auth/callback
```

Y en Capacitor añade el `CFBundleURLTypes` (iOS) e `intent-filter` con `android:scheme="com.safetube.kids"` (Android). La documentación oficial: https://capacitorjs.com/docs/guides/deep-links

---

## 7. Actualizaciones

1. Cambia código → `bun run build` → `npx cap sync`.
2. En Xcode/Android Studio, sube el número de versión.
3. Genera un nuevo binario firmado y súbelo a la store correspondiente.

Los **cambios solo web** (PWA) se despliegan al hacer *Publish* en Lovable — sin re-subir binarios.
