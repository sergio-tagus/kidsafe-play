# Canal aprobado: popup de detalle editable + banderas de idioma

## Objetivo
1. Al pulsar sobre un canal en "Canales aprobados" se abre un popup (diálogo) con toda la información del canal, editable desde ahí.
2. El idioma muestra una bandera (emoji) junto al nombre en toda la vista (tarjetas, filtros y popup).

## Cambios en la vista (`src/routes/_authenticated/parent/whitelist/index.tsx`)

### 1. Popup de detalle del canal
- Al hacer clic en la tarjeta de un canal se abre un `Dialog` con:
  - Avatar grande, nombre, `@handle`, fecha de alta, nº de vídeos importados y estado (activo/inactivo).
  - Campos editables: nombre del canal, categoría (select), idioma (select con banderas), estado activo (switch).
  - Acciones: Sincronizar vídeos, Ver en YouTube (solo padre), Eliminar canal.
- Guardar con botón "Guardar cambios" (reutiliza `upsertWhitelistChannel`, `updateChannelCategory`, `updateChannelLanguage`), con toasts de éxito/error.
- La tarjeta mantiene los selects rápidos de categoría/idioma (se les añade `stopPropagation` para que no abran el popup al usarlos).

### 2. Banderas junto al idioma
- Nuevo helper `langFlag(code)` (mapeo código de idioma → emoji de bandera: es→🇪🇸, en→🇬🇧, pt→🇵🇹, fr→🇫🇷, de→🇩🇪, it→🇮🇹, ca→🏴, gl→🏴, eu→🏴, ja→🇯🇵, ko→🇰🇷, zh→🇨🇳, ar→🇸🇦, ru→🇷🇺, unknown→🏳️).
- La bandera se muestra junto al nombre del idioma en: el filtro de idioma, el select de idioma de cada tarjeta y el popup de detalle.

## Backend
- No requiere cambios: se reutilizan las funciones existentes (`updateChannelCategory`, `updateChannelLanguage`, `upsertWhitelistChannel`, `refreshChannelVideos`, `deleteWhitelistChannel`).

## i18n
- Nuevas claves en es/en/pt: `parent.channelDetails` ("Detalles del canal"), `parent.saveChanges`, `parent.addedOn`, `parent.videosImported`.

## Verificación
- Abrir el popup desde una tarjeta, editar nombre/categoría/idioma/estado, guardar y comprobar que la lista se actualiza.
- Comprobar que las banderas aparecen en filtros, tarjetas y popup.
- Revisar `build-errors.log` tras los cambios.
