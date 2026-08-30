# El vídeo no llena la pantalla en modo pantalla completa

## Qué pasa ahora (confirmado en el código)

En `watch/$videoId.tsx`, cuando el modo pantalla completa está activo el contenedor del vídeo usa:

`w-full max-w-[min(100%,calc((100vh-11rem)*16/9))] aspect-video`

Es decir, se reserva siempre espacio para la barra de controles (11rem) y se calcula con `100vh`. En móvil/tablet en vertical eso deja el vídeo como una franja pequeña en el centro de una pantalla negra: técnicamente está en pantalla completa, pero el vídeo no se amplía. Además el contenedor sigue con `rounded-2xl` y padding, lo que resta más espacio.

## Cambios propuestos (solo presentación)

### 1. Escenario a pantalla completa real (`watch/$videoId.tsx`)

- Quitar el padding y los bordes redondeados cuando `isFullscreen` está activo, para que el vídeo pueda ocupar el 100% del área.
- Calcular el tamaño del vídeo con unidades dinámicas (`100dvh`/`100dvw`) en lugar de `100vh`, para que en Safari móvil no se descuente la barra del navegador dos veces.
- Dimensionar el vídeo como "contain" del área disponible: ancho máximo = min(ancho de pantalla, alto disponible × 16/9), de modo que en horizontal ocupe toda la pantalla y en vertical ocupe todo el ancho.
- Reservar para los controles solo la altura real que ocupan (aprox. 5rem) y en vertical superponerlos sobre la franja negra inferior, en lugar de restar 11rem siempre.

### 2. Controles superpuestos en pantalla completa

- En modo pantalla completa, la barra de controles se muestra flotando sobre el borde inferior del escenario (fondo semitransparente, área táctil actual de 56 px sin cambios), de modo que no le roba altura al vídeo.
- Se mantiene visible con el vídeo en pausa, igual que ahora.

### 3. Orientación en móvil (opcional pero recomendado)

- Al entrar en pantalla completa desde un dispositivo táctil, intentar bloquear la orientación en horizontal (`screen.orientation.lock("landscape")`) dentro de un `try/catch`; si el navegador no lo permite (iOS Safari), no pasa nada y el vídeo simplemente llena el ancho en vertical.
- Al salir, liberar el bloqueo (`unlock()`).

## Verificación

- Comprobación de tipos y build.
- Prueba en navegador con viewport de móvil (vertical y horizontal) y de escritorio: al pulsar pantalla completa el vídeo ocupa todo el espacio disponible y los controles siguen accesibles.
