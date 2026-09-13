# Sincronización quincenal, pausa por inactividad y control del Superadministrador

## Qué cambia para el usuario

1. **Frecuencia quincenal**: la sincronización automática pasa a ejecutarse cada 14 días. Las cuentas que hoy tienen sincronización activa (diaria, semanal o mensual) quedan en quincenal.
2. **Pausa por inactividad**: si una cuenta no entra en la aplicación durante más de 10 días, su sincronización automática se pausa sola y deja de consumir la API de YouTube.
3. **Reactivación al volver**: en cuanto el usuario vuelve a iniciar sesión, la sincronización se reactiva sola y sigue su ciclo normal, sin tener que tocar nada.
4. **Solo el Superadministrador**:
   - ve y cambia la configuración de sincronización automática (tarjeta del panel de padres),
   - ve y usa los botones de sincronización manual (sincronizar un canal, actualizar canal, actualización masiva de los canales filtrados).
   - Para el resto de cuentas esas opciones desaparecen de la pantalla y, si alguien intenta lanzarlas por otra vía, el servidor las rechaza.

Nota: añadir un canal nuevo a la lista blanca (con su importación inicial de vídeos) sigue disponible para todos los usuarios; solo se restringen las sincronizaciones posteriores y la configuración.

## Detalles técnicos

**Migración**
- `ALTER TYPE public.sync_frequency ADD VALUE 'biweekly'` (en su propia sentencia previa al uso).
- `sync_settings`: nuevas columnas `last_active_at timestamptz not null default now()` y `auto_paused boolean not null default false`.
- Cambiar el default de `frequency` a `'biweekly'` y `UPDATE sync_settings SET frequency='biweekly' WHERE frequency <> 'off'`.

**Servidor**
- `src/lib/sync.functions.ts`:
  - `FREQ` pasa a `["off","biweekly"]` (se retiran daily/weekly/monthly de la UI; los valores antiguos siguen existiendo en el enum).
  - `upsertSyncSettings` pasa a `.middleware([requireParentUnlocked, requireSuperAdmin])`.
  - `getSyncSettings` se mantiene con `requireSupabaseAuth` (lectura inocua), pero la tarjeta solo se renderiza para el superadmin.
  - Nueva `touchActivity()` (`requireSupabaseAuth`): hace upsert de `last_active_at = now()` y, si `auto_paused` era true, lo pone a false. Devuelve `{ resumed: boolean }`.
- `src/lib/parent.functions.ts`: `refreshChannelVideos` y `bulkUpdateChannel` añaden `requireSuperAdmin` a su cadena de middleware (manteniendo `requireParentUnlocked`). `logBulkSyncRun` igual.
- `src/routes/api/public/hooks/sync-whitelist.ts`:
  - Umbral `biweekly: 14 días`; se conservan los umbrales antiguos por compatibilidad.
  - Se leen también `last_active_at` y `auto_paused`; se excluyen las filas con `auto_paused = true`.
  - Antes de procesar, las filas con `last_active_at` anterior a 10 días se marcan `auto_paused = true` y se omiten de la ejecución.

**Cliente**
- `src/lib/session.tsx`: al detectar sesión (carga inicial y evento `SIGNED_IN`) se llama una vez a `touchActivity()`; los errores se ignoran en silencio.
- `src/routes/_authenticated/parent/index.tsx`: `SyncSettingsCard` solo se monta si `useIsSuperAdmin()` es verdadero; sus opciones pasan a "Desactivada" / "Cada 14 días".
- `src/routes/_authenticated/parent/whitelist/index.tsx`: con `useIsSuperAdmin()` se ocultan el botón de sincronizar de cada tarjeta, el botón del diálogo de detalle y todo el bloque de actualización masiva.
- `src/routes/_authenticated/parent/whitelist/$channelId.tsx`: se oculta cualquier acción de sincronización manual presente.
- Textos nuevos en `src/lib/i18n.tsx` (es/en/pt): "Cada 14 días", y ajuste del texto descriptivo de la sincronización.
