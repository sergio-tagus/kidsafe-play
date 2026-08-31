# Actualización de datos del canal con autorización

Hoy, al importar o sincronizar un canal, solo se rellenan idioma y descripción si estaban vacíos, y nunca se pide permiso. El objetivo: al importar/sincronizar se actualizan todos los datos del canal (nombre, handle, miniatura, descripción, idioma, categoría sugerida), pero siempre tras un mensaje de confirmación.

## Cómo funcionará

1. **Sincronizar (botón Sync o desde el popup de detalle)**
   - La app consulta YouTube y muestra un diálogo "Cambios detectados" con una comparación campo a campo: valor actual → valor nuevo (nombre, descripción, idioma, miniatura, handle).
   - Casillas por campo para elegir qué se actualiza (todas marcadas por defecto).
   - Botones: "Actualizar datos" / "Solo importar vídeos" / "Cancelar".
   - Si no hay cambios, se salta el diálogo y solo se importan los vídeos.

2. **Importar un canal nuevo por URL**
   - Sin cambios: se guardan todos los datos de YouTube directamente (no hay datos previos que sobrescribir).
   - Si la URL corresponde a un canal ya existente en la whitelist, se muestra el mismo diálogo de confirmación antes de sobrescribir.

3. **Sincronización automática programada** (diaria/semanal/mensual)
   - Importa vídeos nuevos y **detecta** cambios de datos, pero no los aplica.
   - Los guarda como "cambios pendientes" en el canal.
   - En "Canales aprobados" el canal muestra un badge "Cambios pendientes"; al abrir el popup de detalle se ve la comparación y se aprueban o descartan.
   - Filtro nuevo en la barra: "Con cambios pendientes".

## Detalles técnicos

- **Base de datos**: añadir a `whitelist_channels` la columna `pending_updates jsonb` (nullable) y `pending_updates_at timestamptz`, con las políticas RLS actuales (ya cubiertas por la política de propietario).
- **`src/lib/parent.functions.ts`**:
  - `previewChannelUpdate({ channelId })`: llama a `fetchChannel`, devuelve `{ current, incoming, diffFields }` sin escribir nada.
  - `applyChannelUpdate({ channelId, fields })`: aplica solo los campos aceptados y limpia `pending_updates`.
  - `refreshChannelVideos`: deja de tocar metadatos; solo importa vídeos (el flujo de datos pasa por las dos funciones anteriores).
  - `importChannelFromUrl`: nuevo parámetro `confirmOverwrite`; si el canal ya existe y no viene confirmado, devuelve el diff en vez de escribir.
  - `dismissPendingUpdates({ channelId })`.
- **Cron/webhook de sync** (`src/routes/api/public/...`): calcula el diff y escribe `pending_updates` en lugar de actualizar campos.
- **UI `src/routes/_authenticated/parent/whitelist/index.tsx`**: nuevo componente de diálogo de diff reutilizable (sync manual, import de canal existente y aprobación de pendientes), badge de pendientes en la tarjeta y filtro correspondiente.
- **i18n `src/lib/i18n.tsx`**: claves nuevas (título del diálogo, "Valor actual", "Nuevo valor", "Actualizar datos", "Solo importar vídeos", "Cambios pendientes", "Descartar") en es/en/pt.
