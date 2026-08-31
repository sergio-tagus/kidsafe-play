# Plan: refresco del popup tras importar, fecha de última actualización y ficha completa del canal

## Objetivo

1. Tras importar o aplicar una sincronización desde el popup de detalle, el popup se actualiza al instante con los datos nuevos (sin cerrarlo ni recargar).
2. El popup muestra la fecha de última actualización (última sync/importación de datos del canal).
3. La pantalla de vídeos del canal en el panel de padres (`/parent/whitelist/$channelId`) muestra la ficha completa del canal: miniatura, nombre, handle, descripción, idioma con bandera, categoría, estado, nº de vídeos y fecha de última actualización.

## Cambios

### 1. Base de datos (migración)
- `ALTER TABLE whitelist_channels ADD COLUMN last_synced_at timestamptz;` (sin cambios de RLS/GRANT: es solo una columna nueva).

### 2. Funciones servidor (`src/lib/parent.functions.ts`)
- `importChannelFromUrl` y `refreshChannelVideos`: escriben `last_synced_at = now()` al importar/sincronizar vídeos.
- `applyChannelUpdate`: escribe `last_synced_at = now()` al aplicar cambios aceptados.
- `listWhitelistChannels`: incluye `last_synced_at` en el payload.

### 3. Refresco del popup (`src/routes/_authenticated/parent/whitelist/index.tsx`)
- Después de `applyChannelUpdate` (y de "Solo importar vídeos") invalidar `["wl"]` y actualizar `detailForm` con los valores devueltos por el servidor, de modo que el popup refleje nombre, descripción, idioma, etc. recién importados sin cerrarse.
- Añadir en el popup la línea "Última actualización: <fecha/hora local>" (o "Nunca" si `last_synced_at` es null), junto a "Añadido el...".

### 4. Ficha del canal en la vista de vídeos (`src/routes/_authenticated/parent/whitelist/$channelId.tsx`)
- Cabecera enriquecida: miniatura grande, nombre, `@handle`, descripción (clamp con "ver más"), bandera + idioma, categoría traducida, badge Activo/Inactivo, nº de vídeos importados y fecha de última actualización.

### 5. i18n (`src/lib/i18n.tsx`)
- Nuevas claves ES/EN/PT: `parent.lastUpdated`, `parent.neverSynced`, y las etiquetas de la ficha si faltan.

## Verificación
- Build OK, abrir popup → sincronizar → autorizar cambios → confirmar que el popup muestra los nuevos valores y la fecha de última actualización.
- Abrir `/parent/whitelist/$channelId` y comprobar que se ven todos los datos del canal.
