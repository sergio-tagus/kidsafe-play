## Objetivo

1. Cuando el vídeo se pausa, la imagen debe verse nítida: sin capa oscura ni desenfoque. La protección contra los elementos de YouTube (pantalla final, "Más vídeos", enlaces) se mantiene.
2. Añadir controles propios para retroceder y avanzar el vídeo X segundos (por defecto 10 s).

## Cambios

### 1. Pausa sin oscurecido

En el reproductor (`src/routes/_authenticated/kids/$childId/watch/$videoId.tsx`), en la capa que aparece al pausar:

- Eliminar `bg-black/70` y `backdrop-blur-sm`: la capa pasa a ser transparente, así el fotograma se ve tal cual.
- Seguir capturando los clics (mismo `pointer-events` condicional) para que no se pueda pulsar nada de la interfaz de YouTube que aparece al pausar.
- Mantener los botones "Reanudar" y "Volver", con fondo sólido y sombra de texto suave para que sigan siendo legibles sobre la imagen.

### 2. Retroceder / avanzar X segundos

- Debajo del reproductor (barra propia, siempre visible): botón "−10 s", botón grande de reproducir/pausar y botón "+10 s", con iconos redondeados y tamaño táctil grande, adecuado para niños, móvil, tablet y TV (con foco visible para el mando).
- Lógica: leer `getCurrentTime()` y llamar a `seekTo(t ± 10, true)`, acotando entre 0 y la duración del vídeo.
- Atajos de teclado/mando: flecha izquierda/derecha para retroceder/avanzar, espacio para pausar/reanudar (solo en la página del reproductor).
- Los mismos botones también se muestran dentro de la capa de pausa, para poder rebobinar sin reanudar antes.
- Textos nuevos ("Retroceder 10 s", "Avanzar 10 s") añadidos a los tres idiomas en `src/lib/i18n.tsx`.

## Detalle técnico

El salto de segundos es una constante única (`SEEK_SECONDS = 10`) para poder cambiarla en un solo sitio. No se toca la lógica de tiempo de pantalla (heartbeat cada 15 s), ni el bloqueo de AirPlay/Chromecast, ni el filtrado por whitelist.
