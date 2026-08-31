# Controles superpuestos con auto-ocultado en el reproductor

## Objetivo

En pantalla completa (nativa y simulada en iPhone), la barra de controles superpuesta (−10s, play/pausa, +10s, pantalla completa) debe ocultarse automáticamente al cabo de unos segundos sin interacción y volver a aparecer al tocar la pantalla.

## Comportamiento

- **En reproducción**: la barra superpuesta se oculta (fundido) tras 3 segundos sin interacción (constante `CONTROLS_HIDE_MS`, fácil de cambiar).
- **Al tocar la pantalla** (o mover el ratón en escritorio): la barra vuelve a aparecer al instante y se reinicia el contador.
- **En pausa**: la barra y la capa de pausa permanecen siempre visibles y usables (requisito anterior, se mantiene intacto).
- **Fuera de pantalla completa**: nada cambia; la barra sigue debajo del vídeo, siempre visible.
- **Límite de tiempo alcanzado** (pantalla de bloqueo): nada cambia.

## Implementación

Archivo único: `src/routes/_authenticated/kids/$childId/watch/$videoId.tsx`.

1. **Estado `controlsVisible`** (por defecto `true`) y `hideTimerRef` para el temporizador.

2. **Temporizador** con `nudgeControls()`:
   - Muestra los controles (`setControlsVisible(true)`), cancela el temporizador anterior y, solo si `isFullscreen && !paused && !locked`, programa el ocultado a los 3 s.
   - Un efecto se encarga de: si `!isFullscreen || paused || locked` → cancelar temporizador y forzar `controlsVisible = true`; si no, arrancar el temporizador inicial. Limpieza del temporizador al desmontar.

3. **Toque para mostrar**: una capa transparente de captura (`absolute inset-0`, `z-20`) dentro del escenario que solo está activa (`pointer-events-auto`) cuando `isFullscreen && !paused && controlsVisible === false`. Al pulsarla, `nudgeControls()`. Cuando los controles están visibles la capa es `pointer-events-none`, para no bloquear los controles nativos de YouTube (volumen, CC, ajustes) ni la lógica de play/pausa existente. Cubre todo el escenario, incluidas las bandas negras laterales.

4. **Eventos que reinician el contador**: `onPointerDown` y `onMouseMove` en el escenario (el puntero sobre los botones también los reinicia, porque el evento burbujea hasta el escenario) y las teclas del teclado/D-pad ya existentes (←, →, espacio, Enter).

5. **Transición**: la barra inferior en fullscreen pasa a `transition-opacity` con `opacity-0 pointer-events-none` cuando está oculta, manteniendo su `z-30`, fondo degradado y padding de safe-area. Al ocultarse, los toques en su zona caen en la capa de captura y la vuelven a mostrar.

6. **Al reanudar desde pausa**: al volver a PLAYING, `paused` pasa a `false` y el efecto arranca el temporizador de ocultado de nuevo.

## Detalle técnico

- Sin textos nuevos: no se toca `src/lib/i18n.tsx`.
- Sin cambios de lógica de tiempo de pantalla, heartbeat, bloqueo de AirPlay, overlays anti-enlaces de YouTube ni filtrado whitelist.
- `CONTROLS_HIDE_MS = 3000` como constante junto a `SEEK_SECONDS`.
- La capa de captura y la barra viven dentro del escenario (`stageRef`), por lo que funcionan igual en pantalla completa nativa (desktop) y simulada (iPhone/iPad).

## Verificación

- Compilación OK.
- Playwright en viewport escritorio (pantalla completa nativa): reproducir, esperar >3 s y comprobar que la barra queda con `opacity-0`; tocar el vídeo y comprobar que reaparece; pausar y comprobar que la barra y la capa de pausa siguen visibles.
- Playwright en viewport móvil 430x786 forzando `pseudoFullscreen`: mismo comportamiento con la pantalla completa simulada.