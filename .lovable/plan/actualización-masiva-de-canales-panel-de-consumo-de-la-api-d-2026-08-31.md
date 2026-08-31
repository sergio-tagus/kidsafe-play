# Actualización masiva de canales + panel de consumo de la API de YouTube

Dos añadidos al panel de padres: actualizar en bloque los canales que se ven tras aplicar filtros, y una nueva sección lateral para monitorizar el consumo de la API de YouTube.

## 1. Actualización masiva en "Canales aprobados"

- Nuevo botón en la barra de filtros: **"Actualizar filtrados (N)"**, donde N es el número de canales que quedan tras los filtros activos.
- Al pulsarlo se abre un diálogo con dos modos a elegir:
  - **Vídeos + datos con revisión**: importa vídeos nuevos y guarda los cambios de metadatos como "pendientes" (badge en la tarjeta, se aprueban uno a uno como ahora).
  - **Vídeos + datos automáticos**: importa vídeos y aplica directamente todos los cambios de datos detectados.
- El diálogo muestra la lista de canales afectados y avisa del coste estimado en unidades de la API antes de confirmar.
- Durante el proceso: barra de progreso "canal X de N", nombre del canal en curso, y botón de cancelar (detiene tras el canal actual).
- Los canales se procesan de uno en uno, con reintento omitido en caso de error: al terminar se muestra un resumen con canales actualizados, vídeos importados, cambios pendientes creados y errores (por ejemplo cuota agotada, que detiene el resto).

## 2. Nueva sección lateral "Consumo API"

Nueva entrada en el menú lateral de padres (`/parent/api-usage`) con:

- **Hoy**: unidades consumidas, límite diario configurable, barra de progreso y color de aviso al 80% / 100%.
- **Histórico**: gráfico de los últimos 7 / 30 días.
- **Desglose por tipo de operación**: búsqueda de canal, datos de canal, listado de subidas, detalles de vídeo, con unidades y número de llamadas.
- **Detalle por canal**: tabla ordenable con unidades consumidas, número de sincronizaciones y última sincronización por canal.
- **Historial de sincronizaciones**: últimas ejecuciones (manual, masiva o programada) con canales tocados, vídeos importados y unidades gastadas.
- **Ajustes**: campo para fijar la cuota diaria de la clave (por defecto 10.000).

Nota: el contador empieza a registrar desde que se active esta función; el consumo anterior no puede recuperarse desde YouTube.

## Detalles técnicos

**Base de datos** (una migración):
- `youtube_api_usage`: `parent_user_id`, `day date`, `operation text`, `units int`, `calls int`, `whitelist_channel_id uuid null`, con índice único (`parent_user_id`, `day`, `operation`, `whitelist_channel_id`) y agregación por upsert.
- `youtube_sync_runs`: `parent_user_id`, `started_at`, `finished_at`, `source` (`manual`|`bulk`|`cron`), `channels_processed`, `videos_imported`, `units_used`, `errors jsonb`.
- `api_quota_settings`: `parent_user_id` PK, `daily_quota int default 10000`.
- Las tres con GRANT a `authenticated`/`service_role`, RLS activada y políticas propias por `auth.uid()`.

**Contabilidad de unidades** (`src/lib/youtube.server.ts`):
- `ytFetch` acepta un contexto opcional de medición; cada endpoint suma su coste oficial (search 100, channels/playlistItems/videos 1 por llamada).
- Se acumula en memoria durante la operación y se vuelca a `youtube_api_usage` al final de cada server function (import, sync, bulk, cron) con `supabaseAdmin` cargado dentro del handler.

**Server functions**:
- `src/lib/parent.functions.ts`: `bulkUpdateChannel({ channelId, mode })` procesa un canal (para poder mostrar progreso desde el cliente) reutilizando `previewChannelUpdate`, `applyChannelUpdate` y `refreshChannelVideos`; en modo revisión escribe `pending_updates`.
- Nuevo `src/lib/api-usage.functions.ts`: `getApiUsageSummary({ days })`, `getApiUsageByChannel()`, `listSyncRuns()`, `getQuotaSettings()`, `setQuotaSettings({ dailyQuota })`, todas con `requireSupabaseAuth`/`requireParentUnlocked`.

**UI**:
- `src/routes/_authenticated/parent/whitelist/index.tsx`: botón, diálogo de modo y diálogo de progreso.
- Nueva ruta `src/routes/_authenticated/parent/api-usage.tsx` con las tarjetas, gráfico (recharts, ya en el proyecto) y tablas.
- `src/components/parent-shell.tsx`: entrada "Consumo API" con icono `Gauge`.
- El cron (`src/routes/api/public/hooks/sync-whitelist.ts`) también registra su consumo y su ejecución.
- `src/lib/i18n.tsx`: claves nuevas en es/en/pt.
