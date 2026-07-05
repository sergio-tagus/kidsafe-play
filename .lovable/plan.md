## Cambios

### 1. `src/components/kid-shell.tsx` — ocultar del menú lateral
Quitar del array `nav` las entradas de **Favoritos** (`/kids/$childId/favorites`) e **Historial** (`/kids/$childId/history`).
Eliminar también el `<Link>` a `/parent` con el texto **Panel de padres** (líneas 50-56).

Se queda: Inicio, Canales, Categorías. Aplica tanto a la sidebar desktop como al bottom-nav móvil (usan el mismo `nav`). Las rutas siguen existiendo, solo se ocultan del menú (el icono ❤️ del topbar y el acceso desde otras pantallas no se tocan).

### 2. `src/components/parent-shell.tsx` — añadir "Historial"
Añadir al array `nav` una nueva entrada:
```
{ to: "/parent/history", label: t("parent.history"), icon: History, exact: false }
```
Importar `History` de `lucide-react`. La clave `parent.history` ya existe en los tres idiomas.

### 3. Nueva ruta `src/routes/_authenticated/parent/history.tsx`
Página con:
- Selector `<Select>` de hijo (usa `listChildProfiles`, primer hijo por defecto).
- Grid de `<VideoCard>` con el historial del hijo seleccionado, reutilizando `listHistory` (server fn ya existente, pasa `{ childId, limit: 100 }`).
- Estado vacío con el string existente `history.empty`.
- Envuelto en `ParentShell`.

`VideoCard` requiere `childId`; se le pasa el hijo seleccionado para que los enlaces sigan siendo válidos dentro del contexto de ese perfil.

## Fuera de alcance
- Filtros por fecha o búsqueda en el historial del panel de padres.
- Borrar historial desde el panel de padres.
- Vista agregada de todos los hijos a la vez (queda para más adelante si hace falta).

## Archivos tocados
- `src/components/kid-shell.tsx` (editar)
- `src/components/parent-shell.tsx` (editar)
- `src/routes/_authenticated/parent/history.tsx` (crear)
