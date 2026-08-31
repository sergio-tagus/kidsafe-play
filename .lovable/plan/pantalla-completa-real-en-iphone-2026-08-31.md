# Pantalla completa real en iPhone

## Problema (confirmado en la captura)

En el modo "pantalla completa simulada" el vídeo no llena la pantalla del iPhone en horizontal: queda un rectángulo pequeño centrado con mucho negro alrededor y los controles debajo. Causas en `src/routes/_authenticated/kids/$childId/watch/$videoId.tsx`:

1. El ancho del vídeo está limitado por `max-w-[min(100%,calc((100vh-11rem)*16/9))]`. Esa fórmula resta 11rem fijos (pensada para escritorio) y usa `100vh`, que en iOS incluye zonas ocultas por las barras del navegador → el vídeo queda mucho más pequeño de lo posible.
2. El escenario simulado es una columna `flex` con `gap-4` y `p-4`: el vídeo y la barra de controles se apilan, así que el alto disponible para el vídeo nunca es el alto real de la pantalla, y los controles empujan el vídeo hacia arriba.
3. El alto del escenario usa `100dvh` en inline style solo en modo simulado, pero el vídeo sigue sin usar el espacio completo por los puntos 1 y 2.

## Solución

### 1. El vídeo ocupa toda la pantalla en modo fullscreen (nativo y simulado)
- En ambos modos fullscreen, el contenedor del vídeo deja de ser una tarjeta apilada y pasa a ocupar el escenario entero: `position: absolute inset-0` dentro del escenario fijo, sin `border-radius` ni sombras, fondo negro.
- El tamaño se calcula con la fórmula correcta usando `100dvw/100dvh` (viewport dinámico real, sin barras de iOS): ancho `min(100dvw, 100dvh * 16/9)` y alto resultante por `aspect-video`. En horizontal llena de borde a borde salvo bandas laterales mínimas si el vídeo no es exactamente 16:9; en vertical llena el ancho completo.

### 2. Los controles pasan a ser superpuestos (overlay), no apilados
- En fullscreen la barra de controles (−10s, play/pausa, +10s, salir) se posiciona `absolute` en la parte inferior, centrada, sobre el vídeo, con fondo semitransparente (`bg-black/50 backdrop-blur`) y se comporta igual que la capa de pausa ya existente.
- Así el vídeo nunca pierde espacio por culpa de los controles, y se mantiene el requisito anterior: con el vídeo en pausa los controles siguen visibles y usables.
- Fuera de fullscreen (vista normal de la página) nada cambia: la barra sigue debajo del vídeo como ahora.

### 3. Respeto del notch y las barras del sistema
- El escenario simulado mantiene `padding` con `env(safe-area-inset-*)`, pero el padding se aplica solo a la barra de controles superpuesta (para que los botones no queden bajo el notch/home indicator), no al vídeo, que puede extenderse a sangre bajo el notch como hace YouTube/Netflix.

### 4. Detalles de robustez en iOS
- `height: 100dvh` + `width: 100dvw` en el escenario simulado (fallback `100vh/100vw` para navegadores antiguos).
- Al activar el modo simulado en iPhone se intenta además `screen.orientation.lock("landscape")` dentro de un `try/catch` (solo funciona instalada como PWA; en navegador falla en silencio y no pasa nada).
- Listener de `resize`/`orientationchange` no necesario: al usar unidades `dvh/dvw` el navegador recalcula solo al girar el dispositivo.
- Se mantiene: salida con botón, tecla Escape/atrás, bloqueo de scroll del fondo, capa anti-enlaces de YouTube y bloqueo de AirPlay/Chromecast.

## Detalle técnico

- Archivo único: `src/routes/_authenticated/kids/$childId/watch/$videoId.tsx`.
- Reestructurar el JSX del escenario: cuando `isFullscreen` es true, el `div` del vídeo usa `absolute inset-0 m-auto` con `width: min(100dvw, calc(100dvh * 16 / 9))` y `aspect-video`; `seekControls("bar")` se renderiza como overlay `absolute bottom-0 inset-x-0` con safe-area padding cuando `isFullscreen`, y como barra normal debajo cuando no.
- Quitar la clase `max-w-[min(100%,calc((100vh-11rem)*16/9))]` actual y la `gap-4`/`p-4` del escenario en fullscreen.
- No se toca lógica de tiempo de pantalla, heartbeat, bloqueo de AirPlay ni filtrado whitelist. No hacen falta textos nuevos.

## Verificación

- Compilación OK y prueba con Playwright en viewport móvil (430x786 y 786x430) forzando `pseudoFullscreen` para comprobar que el vídeo llena la pantalla y los controles quedan accesibles superpuestos.
