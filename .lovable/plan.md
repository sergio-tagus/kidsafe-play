# Descripción del canal

Añadir la descripción del canal (que hoy no se guarda en la base de datos) para que se importe desde YouTube y se muestre en el popup de detalle y en la página que abre los vídeos de ese canal.

## Base de datos

- Nueva columna `channel_description` (texto, opcional) en la tabla de canales aprobados.

## Importación desde YouTube

- La consulta a YouTube ya devuelve la descripción del canal; se guardará al añadir un canal nuevo y al sincronizarlo.
- Como con el idioma: si el padre ha editado la descripción a mano, la sincronización no la sobrescribe salvo que esté vacía.

## Panel de padres — Canales aprobados

- El popup de detalle muestra la descripción bajo el nombre y el @handle.
- Campo editable (área de texto) que se guarda con "Guardar cambios".
- Si el canal no tiene descripción, se muestra un texto de marcador de posición.

## Vista de niños — Vídeos del canal

- La página del canal muestra la descripción bajo la cabecera del canal, recortada a unas 3 líneas con opción de ver más.
- El texto se pasa por el mismo saneado que ya se usa en el reproductor: se eliminan URLs, redes sociales y llamadas a suscribirse, para no dejar salidas hacia YouTube.

## Detalles técnicos

- Migración: `ALTER TABLE public.whitelist_channels ADD COLUMN channel_description text` (sin cambios de RLS/GRANT necesarios).
- `src/lib/youtube.server.ts`: incluir `description` del canal en el resultado de la búsqueda de canal.
- `src/lib/parent.functions.ts`: persistir `channel_description` en `importChannelFromUrl` y `refreshChannelVideos`; añadir el campo al esquema de `updateChannel`/detalle y devolverlo en el listado.
- `src/lib/kids.functions.ts`: incluir `channel_description` en el select del canal para la vista de canal.
- UI: `src/routes/_authenticated/parent/whitelist/index.tsx` (popup) y `src/routes/_authenticated/kids/$childId/channels/$channelId.tsx` (descripción saneada).
- i18n: nuevas claves de "Descripción" y "Sin descripción" en ES/EN/PT.
