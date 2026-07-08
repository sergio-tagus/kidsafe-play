## Bloquear borrado de categorías con canales

### Servidor (`src/lib/categories.functions.ts`)
En `deleteCategory`, antes del `DELETE`:
1. Obtener el `slug` de la categoría (`select("slug, is_default").eq("id", data.id).single()`).
2. Rechazar si `is_default` (ya lo hace el trigger de DB, pero mensaje más claro).
3. Contar canales activos: `select("id", { count: "exact", head: true }).eq("category", slug)` en `whitelist_channels`.
4. Si `count > 0`, lanzar `Error("Category has channels")` — el frontend lo traducirá.

### UI (`src/routes/_authenticated/parent/categories.tsx`)
- El botón papelera ya se deshabilita para `is_default`. Añadir además `disabled` cuando `c.channel_count > 0`, con tooltip que explique "Mueve o elimina los canales primero".
- Ya tenemos `channel_count` en `CatRow` gracias a `listCategoriesWithCounts`, así que no hace falta pedir datos extra.
- En el `catch` del `remove`, mostrar el mensaje traducido cuando el server rechace.

### i18n (`src/lib/i18n.tsx`) — 3 idiomas
Añadir:
- `parent.categoryHasChannels`: "No se puede eliminar: mueve o elimina primero los canales." / "Cannot delete: move or remove its channels first." / "Não é possível excluir: mova ou remova primeiro os canais."

### Fuera de alcance
- No se toca la base de datos (el gate se hace en la server fn, que ya es la única entrada de escritura protegida por `requireParentUnlocked`).
