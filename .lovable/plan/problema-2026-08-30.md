## Problema

En el iPhone (Safari y Chrome, que usa el mismo motor) el botón de pantalla completa no hace nada. El reproductor pide pantalla completa sobre un `div` propio (`stageRef`) con la Fullscreen API; iOS solo permite pantalla completa nativa sobre elementos `<video>`, no sobre `div`. Por eso `requestFullscreen` no existe o falla en silencio.

## Solución

Añadir un modo "pantalla completa simulada" que se usa cuando la API nativa no está disponible (iPhone):

1. Detectar soporte: si el contenedor no tiene `requestFullscreen`/`webkitRequestFullscreen`, activar el modo simulado.
2. Modo simulado: el contenedor del reproductor pasa a ocupar toda la ventana (posición fija, fondo negro, por encima del resto, respetando el notch con safe-area) y se bloquea el scroll de fondo mientras está activo.
3. El botón alterna igual que ahora y muestra el icono correcto; también se sale con la tecla Escape / botón "atrás" del mando.
4. Los controles propios (−10 s, reproducir/pausar, +10 s, salir de pantalla completa) y la capa de pausa siguen visibles y utilizables en ambos modos, igual que ya ocurre en escritorio.
5. En navegadores con API nativa no cambia nada: se sigue usando la pantalla completa real.

## Detalle técnico

- En `src/routes/_authenticated/kids/$childId/watch/$videoId.tsx`: añadir estado `pseudoFullscreen`, comprobar `document.fullscreenEnabled` y la existencia de `requestFullscreen`/`webkitRequestFullscreen` sobre `stageRef`, y usar el fallback CSS (`fixed inset-0 z-50 bg-black` + `padding` con `env(safe-area-inset-*)`) cuando no haya soporte.
- Mantener `isFullscreen` como valor derivado (nativo o simulado) para no duplicar la lógica de los estilos ya existentes del escenario.
- Bloquear `document.body` con `overflow: hidden` mientras el modo simulado esté activo y restaurarlo al salir/desmontar.
- No se toca la lógica de tiempo de pantalla, el bloqueo de AirPlay/Chromecast ni el filtrado por whitelist. No hacen falta textos nuevos.
