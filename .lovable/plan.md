## Filtrar por canal en la búsqueda

La búsqueda de niños (`/kids/$childId/search`) hoy solo filtra por texto. El servidor (`listSafeVideos`) ya acepta un parámetro `channelId`, así que el trabajo es de interfaz.

### UI (`src/routes/_authenticated/kids/$childId/search.tsx`)
- Cargar los canales aprobados con `listApprovedChannels` (ya existe).
- Bajo el campo de búsqueda, mostrar una fila de "pills" desplazable horizontalmente: "Todos" + un chip por canal (miniatura redonda + nombre). Estilo grande y redondeado, coherente con el diseño infantil.
- Estado local `channelId` (null = todos). Al pulsar un chip se marca como activo (color de acento) y se relanza la consulta.
- Pasar `channelId` a `listSafeVideos` e incluirlo en el `queryKey`.
- Permitir resultados cuando hay canal seleccionado aunque el texto esté vacío: la consulta se activa si hay texto **o** canal elegido (muestra los vídeos recientes de ese canal).
- Mensaje de "sin resultados" adaptado a ambos casos.

### i18n (`src/lib/i18n.tsx`) — ES/EN/PT
- `search.allChannels`: "Todos los canales" / "All channels" / "Todos os canais".

### Fuera de alcance
- No se toca la base de datos ni la lógica del servidor (`channelId` ya está soportado).
- No se añade filtro por categoría en esta pantalla.
