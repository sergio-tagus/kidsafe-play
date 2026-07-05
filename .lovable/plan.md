## Diagnóstico

Los botones siguen clicables por tres motivos concretos en `src/routes/_authenticated/kids/$childId/watch/$videoId.tsx`:

1. **Overlay del logo mal posicionado**: `absolute bottom-10 right-0 w-24 h-10` deja el bloqueador 40 px por encima de la barra de controles, donde el logo de YouTube realmente NO está. El logo vive dentro de la barra (bottom 0, altura ~48 px), a la izquierda del botón de fullscreen.
2. **Overlay superior demasiado corto**: `h-16` (64 px) no cubre el botón "Ver en YouTube" que YouTube muestra en la esquina superior derecha al hacer hover (aparece hasta ~72–80 px).
3. **Pantalla de pausa/fin con retardo**: el overlay `paused` se monta tras `setState`, mientras que la end-screen de YouTube (grid de "More videos" con enlaces externos) aparece inmediatamente. Hay un flash de ~50–100 ms en el que los enlaces son clicables. Y en algunos vídeos la end-screen persiste tras ENDED antes de que React reaccione.
4. **Menú contextual del navegador**: click derecho sobre el iframe abre "Copiar URL del vídeo" → enlace directo a youtube.com.

## Cambios en `src/routes/_authenticated/kids/$childId/watch/$videoId.tsx`

### 1. Reposicionar y ampliar los overlays de bloqueo

```
Top:     absolute inset-x-0 top-0 h-20 z-10   (era h-16)
Logo YT: absolute bottom-0 right-14 w-20 h-12 z-10
         ↑ dentro de la barra de controles, a la izquierda del botón fullscreen (que ocupa ~48 px a la derecha)
```

Ambos con `pointer-events: auto` explícito y un `onClick` que llama a play/pause manual del player (no dejar el click "muerto" — mejor UX: tocar arriba del vídeo pausa/reanuda).

### 2. Cerrar el flash de la end-screen

En vez de esperar al `onStateChange`, montar un overlay `absolute inset-0 z-20` con `pointer-events: none` SIEMPRE presente, que se vuelve `pointer-events: auto` + visible cuando `paused === true`. Y adicionalmente:
- Detectar el estado inicial y pintar el botón grande "Reanudar" ya desde el primer render.
- Escuchar también `PlayerState.BUFFERING` y `CUED` para adelantarse (`setPaused(true)` cuando `!== PLAYING`).

Esto elimina el flash porque el overlay ya está en el DOM y solo cambia visibilidad/pointer-events sin re-render costoso.

### 3. Bloquear menú contextual

Añadir `onContextMenu={(e) => e.preventDefault()}` al contenedor `.relative aspect-video`. Elimina "Copiar URL del vídeo" y "Ver en YouTube.com" del menú del navegador.

### 4. Endurecer el iframe post-creación

Justo después de `new YT.Player(...)`, cuando YouTube inyecta el `<iframe>`, aplicar sobre el iframe:
- `iframe.setAttribute('tabindex', '-1')` — evita foco por teclado que abriría atajos.
- Wrapper con `onDragStart={(e)=>e.preventDefault()}` — evita arrastrar el vídeo como enlace.

### 5. Verificación

Después de implementar, abrir `/kids/:childId/watch/:videoId` en el preview, esperar a la reproducción, y comprobar con Playwright (o inspección DOM manual) que:
- Click en la franja superior no navega a youtube.com.
- Click en la esquina inferior-derecha (zona del logo) no navega.
- Click derecho no muestra opciones de YouTube.
- Al pausar, la end-screen de vídeos relacionados queda tapada sin flash.

## Fuera de alcance
- Reemplazar el reproductor por controles 100 % personalizados (requeriría reimplementar seek, volumen, fullscreen).
- Bloquear atajos de teclado nativos del navegador (Cmd+Click, "Abrir en pestaña nueva" del menú OS) — no es posible desde web.

## Archivos tocados
- `src/routes/_authenticated/kids/$childId/watch/$videoId.tsx` (único).
