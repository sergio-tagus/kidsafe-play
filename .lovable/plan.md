## Objetivo

En `/kids/$childId/watch/$videoId` no debe quedar ningún camino visible por el que un niño pueda salir a `youtube.com`. Hoy hay dos fuentes:

1. **El iframe de YouTube** muestra al pausar/terminar: título con enlace al vídeo, logo de YouTube (esquina inferior derecha) y botón "Ver en YouTube" / compartir.
2. **La descripción del vídeo** (`video.description`) se renderiza como texto plano, pero suele contener URLs `https://youtu.be/...`, `https://www.youtube.com/...`, `@handle`, enlaces a redes, etc.

## Cambios en `src/routes/_authenticated/kids/$childId/watch/$videoId.tsx`

### 1. Endurecer `playerVars`
- Mantener `rel: 0`, `modestbranding: 1`, `iv_load_policy: 3`.
- Añadir `origin: window.location.origin` (mejora modestbranding).
- Mantener `controls: 1` (el niño necesita play/pausa/volumen/fullscreen).

Nota: incluso con estas opciones, YouTube sigue mostrando el título clicable arriba y el logo abajo-derecha al pausar. Se neutraliza con overlays (paso 2).

### 2. Overlays que bloquean los click-throughs de YouTube
Envolver el `<div ref={containerRef}>` en un contenedor `relative` y añadir capas `absolute` con `pointer-events-auto` sobre las zonas problemáticas, sin tapar los controles inferiores:

```
┌─────────────────────────────────┐
│ [overlay título — bloquea]      │  ← top: 0, height: 60px, full width
│                                 │
│         vídeo (clicable)        │
│                                 │
│                    [logo YT ×]  │  ← bottom-right 80×40, encima del logo
│ [barra de controles nativa]     │  ← NO tapada
└─────────────────────────────────┘
```

Los overlays son `<div>` transparentes que capturan el click y no hacen nada (o hacen play/pause manual llamando a `playerRef.current`). Esto evita abrir `youtube.com/watch?v=...` cuando el usuario toca el título o el logo.

### 3. Overlay al pausar / al terminar
Cuando `e.data === YT.PlayerState.PAUSED` o `ENDED`, montar un overlay `absolute inset-0` con:
- Botón grande "Reanudar" (llama a `playerRef.current.playVideo()`).
- Botón "Volver" a `/kids/$childId`.
- Fondo semitransparente que oculta por completo la pantalla de fin/pausa de YouTube (que es donde aparecen "Ver en YouTube", compartir y vídeos relacionados externos).

Esto es lo único 100 % fiable para que no se vea ni el botón "Ver en YouTube" ni el share.

### 4. Sanear la descripción
Nueva función local `sanitizeDescription(text: string)`:
- Elimina URLs completas de dominios `youtube.com`, `youtu.be`, `youtube-nocookie.com`, `m.youtube.com`.
- Elimina URLs genéricas `http(s)://...` (para no dejar tampoco enlaces a Instagram, TikTok, etc., coherente con el objetivo de no sacar al niño de la app).
- Elimina menciones tipo `@handle` seguidas de enlace y líneas "Suscríbete: ...".
- Colapsa saltos de línea múltiples.

Renderizar el resultado en el mismo `<p>` (ya es texto plano, no `dangerouslySetInnerHTML`, así que no puede haber `<a>`).

### 5. Título y canal
- `video.title` y `video.channel.channel_name` se siguen mostrando como texto (no son enlaces). ✅ ya está bien, no se toca.
- Verificar que no hay `<a href>` a YouTube en `VideoCard` ni en la lista "Up next" (usan `<Link>` internas de TanStack).

## Fuera de alcance
- Bloquear el modo "picture-in-picture" o el menú contextual del navegador (imposible de forma fiable).
- Cambiar el reproductor de YouTube IFrame por otro backend.
- Sanear títulos de vídeo (raramente contienen URLs; se puede añadir después si aparece un caso).

## Archivos tocados
- `src/routes/_authenticated/kids/$childId/watch/$videoId.tsx` (único).
- Posibles claves i18n nuevas en `src/lib/i18n.tsx`: `player.paused`, `player.resume`.
