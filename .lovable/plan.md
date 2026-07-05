
# Publicar SafeTube Kids en stores + PWA + TV

Objetivo: dejar el proyecto listo para instalarse como PWA, empaquetarse con Capacitor hacia Google Play, App Store y Android TV, y para que se vea correctamente en móvil, tablet, web y pantallas grandes de TV. Además generar toda la identidad visual y los assets de tienda.

> Lo que Lovable **sí** puede hacer: identidad de marca, todos los assets en los tamaños correctos, PWA instalable, integración de Capacitor, layout responsive incl. TV.
> Lo que Lovable **no** puede hacer (lo harás tú al final, con guía paso a paso incluida): cuentas de desarrollador (Apple 99 $/año, Google 25 $ único), builds nativos con Xcode/Android Studio, firmar los binarios, subirlos a App Store Connect / Google Play Console. Apple TV queda **descartado** (requiere reescritura nativa en SwiftUI).

---

## 1. Identidad visual — SafeTube Kids

Crear la marca antes de derivar todo lo demás. Un solo master de logo, del cual salen todas las variantes.

- **Concepto**: unicornio amigable (ya presente en la UI) sobre un “play” redondeado. Paleta cálida y segura, coherente con la app actual.
- **Ficheros master** (en `src/assets/brand/`):
  - `logo-mark.svg` — solo símbolo, cuadrado, safe area 10 %.
  - `logo-mark.png` 1024×1024 fondo transparente.
  - `logo-mark-square.png` 1024×1024 con fondo de marca (para iOS que no admite transparencia).
  - `logo-horizontal.svg` — símbolo + wordmark “SafeTube Kids”.
  - `logo-monochrome.svg` — versión en un solo color para fondos oscuros.
- Documento `src/assets/brand/README.md` con paleta hex, tipografía, usos correctos/incorrectos.

## 2. Iconos de app (todos los formatos)

Generados desde el master de forma programática (script Python con Pillow) para garantizar píxel-perfect:

- **Favicon / web**: `favicon.ico` (multi-tamaño 16/32/48), `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png` 180×180.
- **PWA**: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (con safe area 20 %).
- **iOS (Capacitor)** — `ios/App/App/Assets.xcassets/AppIcon.appiconset/` con los 20+ tamaños que exige Xcode (20, 29, 40, 60, 76, 83.5, 1024 @1x/@2x/@3x).
- **Android (Capacitor)** — `android/app/src/main/res/`:
  - `mipmap-*/ic_launcher.png` en mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi.
  - Adaptive icons: `ic_launcher_foreground.png` + `ic_launcher_background.xml`.
  - `mipmap-*/ic_launcher_round.png`.
- **Android TV** — `res/drawable-xhdpi/banner.png` 320×180 (banner obligatorio de Leanback).

Referenciar el favicon/apple-touch-icon en `src/routes/__root.tsx` y borrar el `public/favicon.ico` por defecto.

## 3. PWA instalable

- `public/manifest.webmanifest` con name, short_name (“SafeTube”), theme_color, background_color, `display: "standalone"`, iconos 192/512 + maskable, screenshots wide/narrow.
- Etiquetas `<link rel="manifest">`, `<meta name="theme-color">`, `apple-touch-icon` en el `head()` del root.
- **Sin service worker** por ahora (según skill PWA de Lovable: solo instalable, no offline). Instalable en Android/iOS/desktop desde el navegador.

## 4. Splash screens

Generados con el mismo script:

- **iOS**: un único `splash-2732x2732.png` (Capacitor lo escala) + variantes por safe area si hace falta.
- **Android 12+**: `splash.xml` con el icono adaptativo y color de fondo (nuevo Splash Screen API).
- **Android legacy**: `drawable-*/splash.png` en 4 densidades.

## 5. Layout responsive (móvil, tablet, web, TV)

Auditar y ajustar breakpoints existentes:

- **Móvil** (≤ 640 px): ya cubierto en buena parte, revisar navegación del kid-shell y parent-shell.
- **Tablet** (641–1024 px): grid de vídeos a 3 columnas, sidebar colapsable.
- **Escritorio** (1025–1919 px): 4–5 columnas, sidebar fijo.
- **TV / pantallas grandes** (≥ 1920 px): 6 columnas, tipografía escalada, targets táctiles/foco de 64 px, hover states como focus states para mando.
- **Navegación por foco (Android TV)**: `:focus-visible` visible en todos los interactivos, orden lógico de tabulación, soporte de flechas del mando (react-key-handler o hook custom para arriba/abajo/izquierda/derecha/OK).
- Revisar y reforzar `kid-shell.tsx`, `parent-shell.tsx`, `VideoCard`, y las páginas de reproducción para estos breakpoints.

## 6. Capacitor — empaquetado nativo

Preparar el proyecto para que puedas hacer los builds nativos localmente:

- Instalar `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/splash-screen`, `@capacitor/status-bar`.
- `capacitor.config.ts` con `appId: com.safetube.kids`, `appName: "SafeTube Kids"`, `webDir: "dist"`, servidor apuntando al hostname publicado para hot-reload durante desarrollo (opcional).
- Añadir carpetas `ios/` y `android/` al proyecto (generadas por `npx cap add`).
- **Android TV**: en `android/app/src/main/AndroidManifest.xml` añadir `<uses-feature android:name="android.software.leanback">`, `<category android:name="android.intent.category.LEANBACK_LAUNCHER">`, atributo `android:banner`.
- Script `scripts/sync-assets.mjs` que copia los iconos/splash generados a las carpetas iOS/Android correctas.

## 7. Assets de tienda

Todos generados desde screenshots reales de la app vía Playwright + script de composición:

- **Google Play**
  - Icono 512×512.
  - Feature graphic 1024×500.
  - Screenshots: mínimo 2, hasta 8, por form-factor (teléfono, tablet 7", tablet 10", Android TV 1920×1080 con banner y sin barras del sistema).
- **App Store**
  - Icono 1024×1024 sin transparencia ni bordes redondeados.
  - Screenshots obligatorios: iPhone 6.7" (1290×2796), iPhone 6.5" (1284×2778), iPad Pro 12.9" (2048×2732).
- **Marketing**: banners 1200×630 (og:image, Twitter card, LinkedIn), 1080×1080 Instagram, 1080×1920 stories.

Se guardan en `src/assets/store/` (repositorio) y `/mnt/documents/store-assets/` (listos para descargar y subir a las stores).

## 8. Documentación de publicación

Un solo documento `PUBLISHING.md` con:

- Cómo generar el build web (`bun run build`).
- Cómo abrir el proyecto en Xcode / Android Studio (`npx cap open ios|android`).
- Requisitos de cuentas y coste.
- Checklist de subida a App Store Connect y Google Play Console.
- Cómo probar en Android TV emulator y en TV real via `adb`.
- Cómo actualizar iconos/splash después de un cambio de logo (`bun run generate:brand`).

---

## Detalles técnicos

- **Generación de iconos**: script Python con Pillow (soportado en la sandbox). Un único master → todos los tamaños con anti-aliasing y padding correcto para iOS/Android/maskable.
- **Screenshots automáticos**: Playwright headless recorre `/`, `/kids/:id`, `/kids/:id/watch/:vid`, `/parent`, `/parent/history` en varios viewports; PIL los mete en marcos de dispositivo.
- **Capacitor**: la config apunta a `dist/` para que `bun run build` + `npx cap sync` sea el único ciclo necesario.
- **Sin backend nuevo**: la app sigue conectándose al mismo Lovable Cloud desde el WebView nativo. Los OAuth redirects usarán el esquema custom `com.safetube.kids://auth/callback` (a añadir en Supabase auth allow-list cuando toque).
- **Fuera de alcance**: publicación efectiva en las stores, cuentas de desarrollador, notificaciones push, in-app purchases, deep linking universal, versión tvOS.

## Orden de ejecución sugerido

1. Marca (paleta + logo master).
2. Script de generación → todos los iconos + splash + favicon + PWA manifest.
3. Layout responsive y foco TV.
4. Capacitor init + sync de assets a iOS/Android + config Android TV.
5. Screenshots de tienda + feature graphic + banners.
6. `PUBLISHING.md` con el paso a paso final.

Al terminar tendrás un proyecto que compila a web, PWA, iOS, Android y Android TV desde el mismo código, con todos los assets listos para subir. Solo faltará que tú ejecutes los builds nativos y subas a las stores desde tu máquina.
