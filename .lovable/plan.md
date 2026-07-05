## Objetivo

En `/kids/:childId/categories`, mostrar solo las categorías que tienen al menos un canal activo en la whitelist del padre. Ocultar el resto.

## Cambios

### 1. Nueva server function `listCategoriesWithContent`
Archivo: `src/lib/categories.functions.ts`

- Usa `requireSupabaseAuth`.
- Consulta `whitelist_channels` filtrando `active = true` y agrupa por `category` (slug) para obtener el conjunto de slugs con contenido.
- Consulta `categories` y devuelve solo las cuyo `slug` esté en ese conjunto, manteniendo el orden actual (`sort_order`, luego `name_en`).

### 2. Usar la nueva función en la página de categorías kids
Archivo: `src/routes/_authenticated/kids/$childId/categories/index.tsx`

- Reemplazar `listCategories` por `listCategoriesWithContent`.
- Cambiar `queryKey` a `["categories", "with-content"]` para no colisionar con la lista completa que usa el panel de padres.
- Si el array llega vacío, mostrar un mensaje amable ("Aún no hay contenido disponible") en lugar de una cuadrícula vacía.

### 3. No tocar el panel de padres
`src/routes/_authenticated/parent/categories.tsx` sigue usando `listCategories` (todas las categorías) para poder gestionarlas aunque estén vacías.

## Fuera de alcance

- No se cambia el esquema de base de datos.
- No se cambia la lógica de whitelist ni de administración de categorías.
- Otras vistas kids (home, búsqueda, favoritos) no se modifican.
