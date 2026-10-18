# Arreglar la pantalla en blanco en Google TV

## Causa probable
La app abre `kidsafe-play.lovable.app`, pero esa dirección ahora redirige a `kidsafe-play.mediaatlastv.com` (comprobado). La app nativa trata un cambio de dominio como enlace externo e intenta abrirlo fuera de la app; en Google TV no hay navegador que lo abra, así que tras la pantalla del unicornio queda en blanco.

## Cambios
1. La app cargará directamente el dominio principal `https://kidsafe-play.mediaatlastv.com` (sin redirección).
2. Se permitirá navegar dentro de la app por ambos dominios (`kidsafe-play.mediaatlastv.com` y `kidsafe-play.lovable.app`) para que una redirección futura no vuelva a romperla.
3. La pantalla de carga mostrará "Sin conexión / Reintentar" también si la web no carga en unos segundos, en vez de quedarse en blanco.
4. Actualizar las notas de publicación con el nuevo dominio.

## Qué tienes que hacer tú
Generar un nuevo .aab desde GitHub (el número de versión sube solo) y subirlo a Google Play / instalarlo en la TV. Este cambio no llega solo con publicar la web, porque está dentro de la app instalada.

## Si no fuera esto
Si con la nueva versión sigue en blanco, el siguiente paso es revisar los registros del televisor (adb logcat) para ver si el navegador interno del TV es demasiado antiguo.

## Detalles técnicos
- `capacitor.config.ts`: `server.url` → dominio personalizado; `server.allowNavigation: ["kidsafe-play.mediaatlastv.com", "kidsafe-play.lovable.app"]`.
- `scripts/build-capacitor.mjs`: timeout de carga que muestra el bloque offline.
- `PUBLISHING.md` / `AGENTS.md`: regla de remote mode con el dominio principal.
