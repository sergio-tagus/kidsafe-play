# Plan: Publicar SafeTube Kids en Google Play Store

Objetivo: preparar, firmar y subir la app Android (móvil, tablet y Android TV) a Google Play Store.

## Entregables del plan

- App Android generada con Capacitor (`android/`).
- Política de privacidad publicada como página de la app y URL lista para Play Console.
- Deep link nativo `com.safetube.kids://auth/callback` configurado para login con Google.
- AndroidManifest ajustado para Android TV (leanback, banner, touchscreen opcional).
- Capturas de pantalla de tienda generadas con Playwright para teléfono, tablet 7", tablet 10" y Android TV.
- App Bundle (`.aab`) firmado con keystore propio del usuario.
- Ficha de Play Store rellena con assets, descripción, categoría "Aplicaciones para niños" y política de privacidad.

---

## Fase 1: Requisitos legales y de contenido

### 1.1 Política de privacidad

- Crear una ruta pública `/privacy` en la app con una política de privacidad básica para apps infantiles.
- Incluir: datos recopilados (perfiles, historial de visualización, canales aprobados), uso de YouTube API, cookies/almacenamiento local, derechos del usuario, contacto.
- Añadir enlace a la política en el pie del login y en el panel de padres.
- Aviso: el borrador debe ser revisado por un asesor legal antes de publicar.

### 1.2 Textos de tienda

- Preparar título corto, descripción completa, descripción corta y notas de cambio iniciales en español, inglés y portugués.
- Categoría principal: "Aplicaciones para niños" o "Educación".
- Etiquetas de contenido: sin publicidad dirigida a menores, sin compras in-app, sin contenido generado por usuarios libre.

---

## Fase 2: Preparación técnica de Android

### 2.1 Generar proyecto Android con Capacitor

```bash
bun run build
npx cap add android
npx cap sync
```

### 2.2 Sincronizar assets nativos

```bash
python3 scripts/generate-icons.py
node scripts/sync-native-assets.mjs
npx cap sync
```

Esto copia iconos, splash screens y el banner 320×180 para Android TV.

### 2.3 Configurar deep link OAuth nativo

Añadir en `android/app/src/main/AndroidManifest.xml` dentro de la actividad principal:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="com.safetube.kids" android:host="auth" android:pathPrefix="/callback" />
</intent-filter>
```

Y añadir `com.safetube.kids://auth/callback` como redirect URI permitido en el backend de autenticación.

### 2.4 Configurar Android TV

Modificar `android/app/src/main/AndroidManifest.xml`:

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

---

## Fase 3: Capturas de pantalla de tienda

Ampliar `scripts/take-store-screenshots.mjs` para incluir las rutas y viewports necesarios:

- Teléfono Android: 1080×1920 portrait (mínimo).
- Tablet 7": 1600×2560 portrait.
- Tablet 10": idem o equivalente.
- Android TV: 1920×1080 landscape.

Rutas a capturar:

- `/auth` (login).
- `/` (selección de perfil de niño).
- `/kids/{childId}` (inicio).
- `/kids/{childId}/categories` (categorías).
- `/kids/{childId}/search` (búsqueda).
- `/parent` (panel de padres, con desbloqueo previo si es necesario).

El script necesitará una sesión de prueba preparada. Generar las imágenes en `src/assets/store/screenshots/`.

---

## Fase 4: Build y firma

### 4.1 Build de producción

```bash
bun run build
npx cap sync
```

### 4.2 Generar AAB firmado

- Abrir Android Studio: `npx cap open android`.
- En Android Studio: `Build → Generate Signed Bundle / APK → Android App Bundle (.aab)`.
- Crear o usar keystore existente. Guardar alias y contraseñas de forma segura; sin el keystore no se podrán publicar actualizaciones.
- Output: `android/app/release/app-release.aab` (u equivalente).

---

## Fase 5: Subida y configuración en Play Console

### 5.1 Crear app y subir AAB

- En Google Play Console crear la app con nombre "SafeTube Kids".
- Subir el `.aab` a la pista de producción interna o pruebas cerradas (recomendado empezar con pruebas internas).
- Configurar firma de Play si es la primera subida.

### 5.2 Rellenar ficha de tienda

- Icono de alta resolución: `src/assets/store/play-icon-512.png`.
- Gráfico destacado: `src/assets/store/play-feature-graphic-1024x500.png`.
- Capturas de pantalla: teléfono, tablet 7", tablet 10", Android TV.
- Video promocional: opcional.
- Política de privacidad: URL de `/privacy` de la app publicada.
- Categoría: Aplicaciones para niños / Educación.
- Etiquetas de contenido y cuestionario de seguridad de datos.

### 5.3 Declarar público objetivo

- Marcar la app como dirigida a niños (Designed for Families / Children).
- Cumplimentar el cuestionario de seguridad de datos de Google Play.
- Declarar que no hay publicidad dirigida a menores.

### 5.4 Lanzamiento

- Seleccionar país/regiones de distribución.
- Revisar y lanzar a pruebas internas/closed testing antes de producción.
- Publicar en producción tras validar en dispositivos reales.

---

## Fase 6: Verificaciones previas obligatorias

- [ ] `bun run build` y `bunx tsgo --noEmit` sin errores.
- [ ] Security scan sin findings críticos pendientes.
- [ ] Flujo de login con Google funciona en la web publicada.
- [ ] Flujo de login con deep link funciona en APK de prueba en Android.
- [ ] Reproductor bloquea AirPlay/Chromecast y no expone enlaces directos a YouTube.
- [ ] Navegación por D-pad funciona en Android TV.
- [ ] Pantallas responsive en móvil, tablet y TV.

---

## Dependencias externas del usuario

- Cuenta de Google Play Console activa (confirmada).
- Keystore y alias para firmar el AAB (se creará en Android Studio si no existe).
- Revisión legal final de la política de privacidad generada.

## Notas

- Los cambios solo web (UI, textos, canales aprobados) se actualizan publicando de nuevo en Lovable; no hace falta resubir el AAB.
- Para actualizaciones nativas futuras: subir número de versión en Android Studio, generar nuevo AAB firmado y subirlo a Play Console.
