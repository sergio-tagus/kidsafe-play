# Pantalla completa en tablet/móvil + bandera de Portugal

## Diagnóstico (confirmado leyendo el código)

`src/hooks/use-youtube-player.ts` (`useElementFullscreen`) usa solo la API estándar:

- `document.fullscreenElement` y `document.addEventListener("fullscreenchange", ...)`
- `el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.()`

En Safari de iPhone/iPad esto no funciona: no existe `requestFullscreen` en elementos `div`, `webkitRequestFullscreen` no está disponible en iOS (solo `webkitEnterFullscreen` en elementos `<video>`, y el vídeo vive dentro del iframe de YouTube al que no podemos acceder), y el evento `fullscreenchange` sin prefijo no se dispara. Resultado: al tocar el botón no pasa nada y el estado `isFullscreen` nunca cambia.

Además, la promesa rechazada se traga en el `catch`, así que el fallo es silencioso.

## Cambios propuestos

### 1. Pantalla completa robusta (`src/hooks/use-youtube-player.ts`)

- Detectar y usar, en este orden: `requestFullscreen`, `webkitRequestFullscreen`, `msRequestFullscreen`.
- Escuchar también `webkitfullscreenchange` y leer `document.webkitFullscreenElement`.
- Fallback "pantalla completa simulada" cuando ninguna API está disponible (caso iOS): activar un estado que hace que el contenedor del reproductor se muestre en posición fija ocupando toda la ventana (`position: fixed; inset: 0; z-index alto`), con bloqueo del scroll del body y salida con el mismo botón o con la tecla Escape.
- `isFullscreen` refleja tanto el modo nativo como el simulado, para que los controles y overlays sigan visibles igual que ahora.

### 2. Estilos de la etapa del reproductor (`watch/$videoId.tsx`)

- Aplicar las clases de pantalla completa simulada al contenedor `stageRef` cuando el hook indique modo simulado, manteniendo la relación de aspecto y los controles debajo del vídeo.
- Asegurar que el botón táctil tenga área de toque adecuada (los botones ya son de 56 px, sin cambios de tamaño necesarios).

### 3. Bandera de portugués (`src/lib/i18n/index.tsx`)

- Cambiar `flag: "🇧🇷"` por `"🇵🇹"` en la entrada `pt` de `LANGS`.

## Verificación

- Comprobación de tipos y build.
- Prueba en el navegador con viewport de móvil/tablet: pulsar el botón de pantalla completa entra y sale correctamente y los controles siguen visibles con el vídeo en pausa.
