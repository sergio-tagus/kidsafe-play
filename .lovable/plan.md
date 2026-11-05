# Aviso de tiempo agotado + "Ampliar 1 hora"

## Qué verá el usuario
- Cuando un niño agota su tiempo diario, aparece un aviso en el panel de padres: "A Lucía se le ha acabado el tiempo de hoy" con el botón **Ampliar 1 hora** y **Descartar**.
- Un contador (campana) en la barra del panel indica avisos pendientes; también se ve al entrar al panel.
- Al pulsar "Ampliar 1 hora", el niño puede seguir viendo 60 minutos más ese mismo día. Si estaba en la pantalla de bloqueo, se desbloquea solo en unos segundos sin recargar.
- Se puede ampliar varias veces (cada pulsación suma 1 hora). La ampliación solo vale para ese día.
- En la pantalla de bloqueo del niño se muestra "Le hemos avisado a papá/mamá".
- Funciona con el mando de la TV (botones enfocables, OK para pulsar).
- Textos en español, inglés y portugués.

## Fuera de alcance
- Notificaciones push al móvil o por email (se puede añadir después).

## Detalles técnicos
- Migración:
  - `screen_time_daily.bonus_minutes numeric not null default 0`.
  - Tabla `screen_time_alerts` (id, child_profile_id, parent_id, date, status 'pending'|'extended'|'dismissed', created_at, resolved_at), único (child_profile_id, date). GRANT SELECT a authenticated + ALL a service_role, RLS SELECT solo del padre dueño; escrituras solo vía servidor (supabaseAdmin).
- `checkScreenTime` y `recordWatchTick` (`src/lib/kids.functions.ts`): límite efectivo = `daily_screen_time_minutes + bonus_minutes`. Al llegar a 0 restante, crear la alerta del día si no existe (upsert, sin duplicados).
- Nuevas server functions en `src/lib/screen-time-alerts.functions.ts`: `listScreenTimeAlerts`, `extendScreenTime({alertId})` (+60 min en bonus, status extended; requiere zona de padres desbloqueada como el resto de acciones, con `handleParentActionError`), `dismissScreenTimeAlert`.
- UI: tarjeta de avisos arriba en `parent/index.tsx` + badge en `parent-shell.tsx` (consulta cada 30 s). La pantalla de bloqueo del niño revisa `checkScreenTime` cada 15 s para desbloquear tras la ampliación.
- Test: límite efectivo = límite + bonus; ampliar suma exactamente 60 minutos.
