# No importar vídeos en directo

## Qué se puede hacer
YouTube ya indica en cada vídeo si es (o fue) un directo, en la misma consulta que la app hace ahora al importar. Filtrarlos no gasta cuota extra.

## Cambios
1. Al importar o sincronizar un canal, se descartan:
   - Directos en curso y directos programados (aún no emitidos).
   - Grabaciones de directos ya terminados (opcional, ver abajo).
   - Vídeos sin duración (señal típica de un directo).
2. Limpieza de los ya importados: en la siguiente sincronización se ocultan los directos que ya estén en la lista.
3. Se aplica igual a la importación manual, la sincronización quincenal y al añadir un vídeo suelto.

## Por defecto
Se excluyen directos en curso, programados y también las grabaciones de directos pasados (suelen ser largos y sin editar). Si prefieres conservar las grabaciones, dímelo.

## Detalles técnicos
- En `fetchRecentUploads` (src/lib/youtube.server.ts) pedir `part=snippet,contentDetails,liveStreamingDetails`; descartar `snippet.liveBroadcastContent` = `live`/`upcoming`, los que tengan `liveStreamingDetails` (grabaciones de directo) y `duration` nula o `P0D`.
- Mismo filtro en el alta manual de vídeo (parent.functions.ts) y en el hook de sincronización.
- Test unitario de la función de filtrado con los tres casos.
