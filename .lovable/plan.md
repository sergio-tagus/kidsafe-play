## Cambios

### 1. Límites diarios: añadir 240 y 300 min
- `src/routes/_authenticated/parent/children.tsx` línea 128: extender el array de opciones a `[15, 30, 45, 60, 90, 120, 180, 240, 300]`.

### 2. Popup de PIN al expirar los 30 min de desbloqueo
Hoy el gate de `/parent/*` usa `sessionStorage` (`markParentUnlocked`) y no sabe que el servidor ya bloqueó la sesión tras 30 min. Resultado: el usuario sigue viendo la UI pero cualquier acción (mutaciones con `requireParentUnlocked`) falla con "Parent zone locked".

- Nueva server fn `getParentUnlockStatus` en `src/lib/pin.functions.ts`: lee `parent_pins.unlocked_until` del usuario y devuelve `{ hasPin, unlocked, expiresAt }`. Usa solo `requireSupabaseAuth` (no `requireParentUnlocked`, si no se auto-bloquearía).
- Nuevo componente `src/components/parent-unlock-guard.tsx`:
  - Se monta dentro de `ParentShell` (envuelve `children`).
  - `useQuery(["parent-unlock-status"], ...)` con `refetchInterval` corto (30 s) + `refetchOnWindowFocus`.
  - Programa un `setTimeout` hasta `expiresAt` para disparar el modal exactamente al expirar sin esperar al próximo poll.
  - Cuando `unlocked === false` y `hasPin === true`, renderiza un `<Dialog>` no cerrable con el mismo teclado PIN de `unlock.tsx` (extraído a un subcomponente reusable `PinPad` para no duplicar código). Al verificar OK: invalida la query, invalida `["parent-unlock-status"]`, refresca `sessionStorage` y cierra.
  - Botón secundario "Salir" que llama `lockParent` + navega a `/`.
- `src/routes/_authenticated/parent/route.tsx`: quitar dependencia exclusiva de `sessionStorage` — mantenerlo como fast-path pero, si el servidor dice que está bloqueado, el guard toma el control (el usuario no queda "colgado" con UI visible sin poder actuar).
- `src/routes/_authenticated/parent/unlock.tsx`: refactor mínimo para reutilizar el nuevo `PinPad`.

### 3. Contador de canales por categoría (panel de padres)
- `src/lib/categories.functions.ts`: nueva server fn `listCategoriesWithCounts` que, además de las categorías, hace un `select("category")` sobre `whitelist_channels` (activos y no activos — mostrar total; si prefieres solo `active=true`, lo ajusto) y agrega por slug. Devuelve `CatRow & { channel_count: number }`.
- `src/routes/_authenticated/parent/categories.tsx`:
  - Cambiar `listCategories` → `listCategoriesWithCounts`.
  - En cada tarjeta añadir un badge/línea: `{channel_count} canales` (i18n key nueva `parent.categoryChannelCount`).

### 4. Bloquear AirPlay / Chromecast en el reproductor
`src/routes/_authenticated/kids/$childId/watch/$videoId.tsx`:
- Añadir `playerVars`: `{ ...actuales, disablekb: 1 }` ya está; añadir además `cc_load_policy: 0`.
  - No hay flag oficial de YouTube para deshabilitar cast, pero sí podemos capar el iframe:
- En `onReady`, sobre el `iframe`:
  - `iframe.setAttribute("disableRemotePlayback", "true")`
  - `iframe.setAttribute("x-webkit-airplay", "deny")`
  - `iframe.setAttribute("controlsList", "nodownload noremoteplayback")`
  - Añadir un CSS global `video::-webkit-media-controls-cast-button, video::-internal-media-controls-overflow-button { display: none !important; }` en `src/styles.css` para ocultar el botón cast nativo cuando el navegador lo inyecta.
- En Capacitor (iOS/Android nativo): en `capacitor.config.ts` documentar en `PUBLISHING.md` que el WKWebView debe crearse con `allowsAirPlayForMediaPlayback: false` (iOS) y el `WebView` con `setMediaPlaybackRequiresUserGesture(true)` + política de cast desactivada. Añadir override en el plugin de Capacitor si hace falta (nota: en tvOS/Android TV el usuario ya está en TV, no cast).

### Fuera de alcance
- No se toca el esquema DB.
- No se cambia la ventana de 30 min (sigue en `PARENT_UNLOCK_WINDOW_MS`); si quieres otra duración, dímelo.
- El botón de AirPlay del sistema operativo (control center iOS) no se puede bloquear desde una web; solo se puede desde la app nativa envuelta con Capacitor (cubierto arriba).
