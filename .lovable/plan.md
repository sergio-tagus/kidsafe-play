
## Por qué los videos no aparecen hoy

No es un bug: al aprobar un canal sólo se inserta una fila en `whitelist_channels`. Las vistas del niño leen de `videos_cache` con `INNER JOIN` sobre canales activos, y esa tabla se queda vacía porque los videos se añaden **uno por uno manualmente** en `/parent/whitelist/$channelId`. Con la integración de YouTube ese paso desaparece.

## Cambios

### 1. Integración con YouTube Data API v3
- Nuevo `src/lib/youtube.server.ts` (solo servidor, lee `process.env.YOUTUBE_API_KEY` dentro del handler):
  - `fetchChannel(input)` — resuelve URL / `@handle` / ID vía `channels?forHandle=…` o `channels?id=…`; devuelve nombre, handle, thumbnail, `uploadsPlaylistId`, `topicIds`, contadores.
  - `fetchRecentUploads(uploadsPlaylistId, max)` — pagina `playlistItems` hasta `max` (por defecto 200) y luego `videos?part=snippet,contentDetails` en lotes de 50 para traer duración ISO-8601 → segundos, `categoryId`, título, descripción, thumbnail, `publishedAt`.
  - `inferCategory({ topicIds, videoCategoryIds, title, description })` — mapa fijo sobre el enum (`cartoons | education | music | science | stories | games | arts | sports`) priorizando: Freebase topic IDs (`/m/04rlf`→music, `/m/06ntj`→sports, `/m/0bzvm2`→games, `/m/01k8wb`→education, …) → `videoCategoryId` mayoritario de los últimos uploads → keywords → default `education`.
- Se pedirá el secreto `YOUTUBE_API_KEY` al pasar a build (Google Cloud Console → YouTube Data API v3).

### 2. Server functions nuevas (`src/lib/parent.functions.ts`)
- `previewChannelFromUrl({ url })` — para el diálogo del padre: devuelve datos del canal + categoría sugerida sin guardar nada.
- `importChannelFromUrl({ url, category?, videoLimit=200 })`:
  1. Resuelve canal en YouTube.
  2. `upsert` en `whitelist_channels` (nombre, handle, thumbnail, categoría inferida o la elegida por el padre).
  3. Trae los **últimos 200 uploads** y hace `upsert` en `videos_cache` (unique en `parent_user_id, youtube_video_id`).
  4. Devuelve `{ channelId, videosImported }`.
- `refreshChannelVideos({ channelId, videoLimit=200 })` — usado tanto por el botón manual "Sincronizar" como por el cron.

### 3. UI del padre (`/parent/whitelist`)
- El diálogo "Añadir canal" queda con **un solo campo** (URL o handle) + botón "Buscar".
- Muestra tarjeta de preview con thumbnail, nombre, suscriptores y categoría auto-detectada (editable en `Select`).
- Botón "Aprobar e importar videos" → toast "Importados N videos".
- Cada canal en la lista tiene botón "Sincronizar" (`refreshChannelVideos`).
- Si `YOUTUBE_API_KEY` no está configurada, la UI muestra aviso claro y el formulario manual sigue disponible como respaldo.

### 4. Sincronización automática configurable
- Nueva tabla `sync_settings` (por padre): columnas `parent_user_id` (PK, FK a `auth.users`), `frequency` enum `off | daily | weekly | monthly` (default `weekly`), `last_run_at`, `updated_at`. RLS: cada padre gestiona sólo su fila; grants estándar (`authenticated`, `service_role`).
- Nueva sección en `/parent` → "Sincronización automática" con `RadioGroup`: **Diaria / Semanal / Mensual / Desactivada**. Guarda mediante `upsertSyncSettings`.
- Ruta pública `src/routes/api/public/hooks/sync-whitelist.ts` (protegida por header `apikey` con la anon key). El handler:
  1. Carga con `supabaseAdmin` (dentro del handler) todos los `sync_settings` donde toque correr según `frequency` y `last_run_at` vs. `now()`.
  2. Para cada padre, recorre sus `whitelist_channels` activos y ejecuta la misma lógica que `refreshChannelVideos` (upsert en `videos_cache`) usando `YOUTUBE_API_KEY`.
  3. Actualiza `last_run_at`.
- `pg_cron` diario (03:00 UTC) llama al hook con `apikey`; el hook decide qué padres procesar según su frecuencia elegida. Así una sola tarea de cron cubre las tres frecuencias y respetamos "apagado".

### 5. Sin cambios en el lado del niño
`listSafeVideos` sigue con `INNER JOIN` sobre `whitelist_channels.active=true`. Ahora `videos_cache` estará poblada desde el momento de la aprobación, por lo que los videos aparecen inmediatamente en home, categorías, canales y búsqueda.

## Detalles técnicos

- Sin cambios en `videos_cache`, `whitelist_channels` ni tablas del niño (todo el esquema necesario ya existe).
- Migración: sólo crea `sync_frequency` enum + tabla `sync_settings` + RLS + grants.
- Cuota YouTube: importar 200 videos ≈ 5 unidades; refresh semanal de 20 canales ≈ 100 unidades / semana. Cuota diaria por defecto 10.000, sobrada.
- Duraciones ISO 8601 (`PT4M13S`) → segundos con helper local.
- Errores 403/quotaExceeded/404 → mensaje legible al padre en toast; el cron los registra en `console` y continúa con el siguiente canal.
- `pg_cron` + `pg_net` se activan en la misma llamada de configuración (`supabase--insert`).

## Fuera de alcance

- Traer *todo* el catálogo histórico de canales grandes (nos limitamos a 200 uploads recientes, tal como confirmaste).
- Búsqueda global en YouTube desde la app del niño (sigue restringida al whitelist).
- Análisis de contenido más allá de la aprobación del canal + categoría.
