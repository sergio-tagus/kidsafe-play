## Objetivo
Sustituir el enum de categorías por una tabla `categories` gestionable, y permitir al padre reasignar la categoría de cualquier canal aprobado. La vista de los niños se genera dinámicamente.

## Base de datos

### Nueva tabla `public.categories`
Campos de dominio: `slug` (texto único, ej. `cartoons`), `name_es`, `name_en`, `name_pt`, `icon` (nombre de icono lucide), `color` (hex opcional), `sort_order` (int), `is_default` (bool, marca las semilla).

- RLS: lectura permitida a cualquier usuario autenticado; escritura (insert/update/delete) solo si el usuario tiene rol admin — como MVP no hay roles, así que **todas las categorías son globales y compartidas entre padres**, y todo padre autenticado puede crear/editar/eliminar. Si el usuario más adelante quiere aislarlas por padre lo cambiamos.
- Seed en la misma migración con las 8 categorías actuales (cartoons, education, music, science, stories, games, arts, sports) con nombres traducidos e iconos actuales, `is_default = true`.
- No se pueden borrar filas con `is_default = true` (trigger BEFORE DELETE).

### Cambio de tipo
- `whitelist_channels.category` y `videos_cache.category`: pasar de enum `category` a `text` con FK a `categories.slug` (ON UPDATE CASCADE, ON DELETE SET NULL).
- Migración de datos: copiar valores actuales del enum al text antes de dropear la columna vieja.
- Dropear el enum `category` al final.

## Server functions

En `src/lib/categories.functions.ts` (nuevo):
- `listCategories()` — pública para el usuario autenticado, ordenada por `sort_order`.
- `createCategory({ slug, name_es, name_en, name_pt, icon, color })`.
- `updateCategory({ id, ... })`.
- `deleteCategory({ id })` — falla si `is_default`.

En `src/lib/parent.functions.ts`:
- `updateChannelCategory({ channelId, categorySlug })` con `requireSupabaseAuth`: actualiza `whitelist_channels` y propaga a `videos_cache` de ese canal.
- Ajustar `importChannelFromUrl` y `youtube.server.ts inferCategory()` para devolver un slug existente (fallback `education`).

## UI

### Parent · Categorías (`/parent/categories`) — nueva ruta
- Lista de categorías con icono, nombres, orden.
- Botón "Nueva categoría" → dialog con formulario (slug, nombres ES/EN/PT, icono, color).
- Editar/eliminar inline. Categorías `is_default` muestran candado y no se pueden borrar (sí editar nombres/icono).
- Enlace desde el dashboard del padre.

### Parent · Whitelist (`/parent/whitelist/index.tsx` y `$channelId.tsx`)
- Añadir `Select` con las categorías cargadas desde `listCategories()` para reasignar la categoría de un canal (inline en la tarjeta + en el detalle). Toast al guardar.

### Kids (`/kids/$childId/categories/index.tsx`)
- Reemplazar el array hardcodeado por `listCategories()` filtrado a las que tienen ≥1 canal activo del padre. Mostrar icono, nombre en el idioma actual y contador.
- La ruta `/kids/$childId/categories/$category` sigue usando el slug.

### i18n
- Nuevas claves para gestión de categorías (título, crear, editar, eliminar, confirmar, campos del formulario) en ES/EN/PT.
- Los nombres de las categorías dejan de estar en `i18n.tsx` y se leen de la tabla.

## Fuera de alcance
- Roles admin (todo padre autenticado gestiona el catálogo global).
- Iconos personalizados fuera del set de lucide-react.
- Sub-categorías o tags múltiples por canal.
