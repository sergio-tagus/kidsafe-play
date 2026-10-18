# Mejor navegación con el mando en Google TV

## 1. Botón de idiomas (globo) solo con OK
- Hoy el menú de idiomas se abre al pulsar abajo porque el componente de menú desplegable abre con la flecha abajo por defecto.
- En modo TV: la flecha abajo/arriba sobre el globo solo mueve el foco; el menú se abre únicamente con OK. Dentro del menú, arriba/abajo recorren idiomas, OK elige y Atrás cierra.
- Se aplica en la pantalla inicial y en la barra de los niños.

## 2. Menús más pequeños
- Reducir el tamaño base del texto en TV (de ~20px a ~16px en 1080p, escalando igual en 4K).
- Quitar el efecto de "agrandar" (zoom 1.06) del foco en botones de menú y dejarlo solo en tarjetas de vídeo; en menús se usa un anillo de color más fino y fondo resaltado.
- Menú lateral/superior compacto: iconos + texto más pequeño, menos relleno.

## 3. Navegación más fluida entre menús
- Desplazamiento instantáneo (sin animación suave, que en TV va a tirones) al mover el foco.
- Recordar el último elemento enfocado de cada zona (menú, fila de vídeos): al volver a una fila o al menú, el foco cae donde estaba, no en el primer elemento.
- Preferir moverse dentro de la misma fila/zona antes de saltar a otra; al bajar desde el menú se entra en la primera fila de contenido.
- Al abrir cualquier página, el foco se coloca automáticamente en el primer elemento útil (no hace falta "despertar" el mando).

## 4. Pantalla completa
- En la app de TV la pantalla completa del sistema no funciona dentro de la app instalada; en modo TV se usará siempre la pantalla completa simulada (el vídeo ocupa toda la pantalla), que ya existe para iPhone.
- Atrás sale de pantalla completa antes de salir del vídeo.
- Opcional: entrar en pantalla completa automáticamente al empezar el vídeo en TV.

## 5. Reproductor: izquierda/derecha ya no avanzan/retroceden
- En modo TV, izquierda/derecha mueven el foco entre los botones del reproductor (−10s, play, +10s, pantalla completa) y OK los activa. Para avanzar se usa el botón +10s.
- Cualquier tecla muestra los controles ocultos; la primera pulsación solo los muestra, sin ejecutar acción.
- Fuera de TV (ordenador) se mantiene el atajo de teclado actual.

## 6. Otras mejoras sugeridas (incluidas)
- Botón Atrás coherente en todas las páginas: cierra menús, sale de pantalla completa, vuelve atrás; en el inicio pide confirmar antes de salir.
- Las teclas Play/Pausa, Avance y Retroceso físicas del mando (si las tiene) controlan el vídeo.
- Abajo desde el reproductor lleva a "vídeos recomendados"; al llegar al final de una fila no se salta a otra fila inesperadamente.

## Detalles técnicos
- `src/components/language-switcher.tsx`: en TV, interceptar ArrowDown/ArrowUp en el trigger (preventDefault + no abrir) y abrir de forma controlada (`open` state) solo con Enter.
- `src/lib/tv-mode.ts`: zonas con `data-focus-zone`, memoria de último foco por zona, preferencia de candidatos en la misma zona, `behavior: "auto"`, autofocus al cambiar de ruta, teclas de medios (MediaPlayPause, MediaFastForward, MediaRewind) despachadas como evento.
- `src/styles.css`: tamaño base TV menor, `transform: scale` solo en `.video-card`, anillo más fino.
- `watch/$videoId.tsx`: en TV no capturar ArrowLeft/Right ni Enter global; `toggleFullscreen` usa `pseudoFullscreen` cuando `isTvMode()`; botones del reproductor con foco inicial en play.
- Actualizar `src/lib/tv-mode.test.ts` con las reglas nuevas (zonas, teclas de medios).
- Al ser cambios de la web, basta publicar el sitio; no hace falta nuevo .aab.
