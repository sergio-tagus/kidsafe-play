# Filtros en la vista de Canales Aprobados

## Objetivo
Añadir una barra de filtros en `/parent/whitelist` para localizar canales rápidamente: búsqueda por texto, filtro por categoría, filtro por estado (activo/inactivo), filtro por idioma del canal y ordenación.

## Cambios

### 1. Idioma del canal (nuevo dato)
La tabla `whitelist_channels` no guarda el idioma. Se añade:
- Migración: columna `language text` (nullable) en `whitelist_channels`, con `GRANT` no necesarios (tabla ya existente).
- `src/lib/youtube.server.ts`: al importar o sincronizar un canal, leer `brandingSettings.channel.defaultLanguage` de la API de YouTube y guardarlo (ej. `es`, `en`, `pt`).
- `importChannelFromUrl` y `refreshChannelVideos` en `src/lib/parent.functions.ts`: persistir `language` en alta y en cada sync (así los canales existentes se van rellenando al pulsar "Sincronizar").

### 2. Barra de filtros en `src/routes/_authenticated/parent/whitelist/index.tsx`
Fila de controles sobre la rejilla de canales (visible solo si hay canales):
- **Búsqueda por texto**: `Input` con icono de lupa; filtra por nombre y `@handle` (case-insensitive, en cliente).
- **Categoría**: `Select` con "Todas" + categorías dinámicas (ya cargadas vía `listCategories`, con nombre traducido según idioma de la app).
- **Estado**: `Select` con Todos / Activos / Inactivos.
- **Idioma**: `Select` construido dinámicamente con los idiomas presentes en la lista (canales sin idioma detectado se agrupan como "Desconocido").
- **Ordenación**: `Select` con Nombre A–Z, Nombre Z–A, Más recientes (fecha de alta), Más vídeos (requiere conteo, ver abajo).
- Botón "Limpiar filtros" cuando algún filtro está activo.

El filtrado y orden se hace en cliente sobre la query `["wl"]` ya existente con `useMemo`; no hace falta cambiar `listWhitelistChannels` salvo para ordenar por número de vídeos.

### 3. Conteo de vídeos (para "Más vídeos")
En `listWhitelistChannels` (`src/lib/parent.functions.ts`): incluir `video_count` por canal mediante una subconsulta sobre `videos_cache` (conteo por `whitelist_channel_id`).

### 4. Resultados vacíos
Si los filtros no devuelven canales, mostrar estado vacío específico ("Ningún canal coincide con los filtros") con botón para limpiar filtros.

### 5. i18n (`src/lib/i18n.tsx`)
Claves nuevas en es/en/pt: `parent.filterSearchPlaceholder`, `parent.filterCategory`, `parent.filterStatus`, `parent.filterLanguage`, `parent.filterAll`, `parent.statusActive`, `parent.statusInactive`, `parent.sortNameAsc`, `parent.sortNameDesc`, `parent.sortNewest`, `parent.sortMostVideos`, `parent.clearFilters`, `parent.noFilterResults`, `parent.unknownLanguage`.

## Notas técnicas
- Sin cambios de RLS: la columna `language` queda cubierta por las políticas existentes de `whitelist_channels`.
- Los canales ya aprobados mostrarán idioma "Desconocido" hasta que el padre pulse el botón de sincronizar de cada canal (no se fuerza un re-sync masivo para no gastar cuota de API de YouTube).
- Todo el filtrado es local e instantáneo; sin nuevas llamadas de red al cambiar filtros.
- Regresión: comprobar que añadir/eliminar/sincronizar canal invalida la query y respeta los filtros activos.
