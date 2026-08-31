# Idioma del canal editable

El campo `language` ya existe en la tabla de canales y se rellena en la importación cuando YouTube lo publica. Falta poder editarlo a mano y que "desconocido" sea un valor real y visible.

## Cambios

### 1. Base de datos
- Poner `desconocido` como valor por defecto de `language` en los canales y rellenar los canales existentes que estén vacíos, para que nunca quede en blanco.

### 2. Detección en la importación
- En `src/lib/youtube.server.ts`: si YouTube no devuelve idioma (`brandingSettings.channel.defaultLanguage` / `snippet.defaultLanguage`), usar como respaldo el `country` del canal y, si tampoco existe, devolver `unknown`.
- En `src/lib/parent.functions.ts` (`importChannelFromUrl` y `refreshChannelVideos`): guardar `unknown` en vez de nulo, y no sobrescribir un idioma editado a mano al sincronizar salvo que el guardado sea `unknown`.

### 3. Edición manual
- Nueva función de servidor `updateChannelLanguage` (protegida por el PIN parental, igual que `updateChannelCategory`).
- En `/parent/whitelist`: junto al selector de categoría de cada tarjeta, un segundo selector de idioma con la lista de idiomas habituales (Español, Inglés, Portugués, Francés, Alemán, Italiano, Catalán, Gallego, Euskera, Japonés, Coreano, Chino, Árabe, Ruso) más "Desconocido". Al cambiarlo se guarda al momento y se refresca la lista.
- El filtro de idioma existente pasa a mostrarse siempre y toma sus opciones de los idiomas presentes en los canales.

### 4. Textos
- Claves nuevas en es/en/pt para la etiqueta "Idioma" del selector y el aviso de guardado.

## Notas técnicas
- Sin cambios de RLS: la columna ya está cubierta por las políticas de `whitelist_channels`.
- Los códigos se normalizan a la parte base (`es-ES` -> `es`) para que filtro y selector coincidan.
- Verificación: editar el idioma de un canal, recargar y comprobar que persiste y que el filtro lo recoge.
