# Reproductor en TV: navegación, ±10 s, diseño y reproducción automática

## 1. Subir desde "A continuación" salta a "Buscar vídeos"
- Primero reproducir el fallo en el simulador de TV (`/tv-simulator`) para confirmar la causa. Sospecha (sin confirmar): cuando los botones del reproductor están ocultos, la navegación los ignora y el siguiente elemento "hacia arriba" es el buscador del banner.
- Arreglo: el reproductor y sus botones serán una zona propia. Desde "A continuación", arriba lleva siempre a los botones del reproductor (al de reproducir, o al último usado) y los muestra. Desde los botones, arriba sí va al banner superior.
- La página se desplaza para que el reproductor quede visible al volver a él.

## 2. Botones −10 s / +10 s no responden con el mando
- Reproducir el fallo en el simulador y comprobar si OK llega al botón y si el reproductor cambia de posición.
- Arreglo previsto: los botones actúan con OK de forma fiable (sin que el primer OK solo "muestre" los controles cuando ya están visibles), y aparece un aviso breve "−10 s" / "+10 s" en pantalla para confirmar la acción. Mantener OK pulsado repite el salto.

## 3. Mejora estética e interactiva de la página
- Barra de controles más limpia: botones redondos translúcidos sobre degradado, botón de reproducir más grande en el centro, foco con anillo de color.
- Barra de progreso con tiempo actual / duración total (solo lectura en TV; se actualiza cada segundo).
- Título y canal sobre el vídeo en pantalla completa, que se ocultan junto con los controles.
- "A continuación" como fila horizontal de tarjetas (como en el inicio) en vez de cuadrícula, más cómoda con el mando.

## 4. Siguiente vídeo automático al terminar
- Al acabar el vídeo aparece una tarjeta "Siguiente vídeo" con la miniatura del primer vídeo de "A continuación" y una cuenta atrás de 10 s.
- Botones: "Ver ahora" (con foco por defecto) y "Cancelar". Si no se hace nada en 10 s, se reproduce el sugerido automáticamente.
- Cualquier pulsación del mando o toque reinicia no; solo "Cancelar" o Atrás detienen la cuenta atrás.
- No se activa si se ha alcanzado el límite de tiempo de pantalla (se muestra la pantalla de bloqueo como hoy). Solo se sugieren vídeos de canales aprobados (lista ya filtrada).
- Funciona igual en TV, móvil y ordenador.

## 5. Pantalla completa con resolución forzada no ocupa toda la pantalla
- Al elegir 720p/1080p/4K en el panel de padres, el vídeo en pantalla completa queda más pequeño o descentrado.
- Comprobar en el simulador con cada resolución. Causa probable (sin confirmar): el escalado del contenido también reduce el vídeo a pantalla completa.
- Arreglo: el vídeo a pantalla completa siempre ocupa toda la pantalla real, sea cual sea la resolución elegida; solo los botones mantienen el tamaño elegido.
- Técnico: revisar `src/lib/display-scale.ts`; el contenedor `data-pseudo-fullscreen` usará medidas de la ventana real (no las escaladas) o quedará fuera del escalado.

## 6. Salir de la app con doble Atrás
- Desde cualquier pantalla, dos pulsaciones seguidas de Atrás (en menos de 1,5 s) cierran la app.
- Una sola pulsación sigue funcionando como ahora (cierra menús, sale de pantalla completa, vuelve atrás). Tras la primera aparece el aviso "Pulsa Atrás otra vez para salir".
- Técnico: en `goBack()` de `src/lib/tv-mode.ts`, registrar la hora del último Atrás; si el siguiente llega dentro de la ventana, devolver "exit" (`App.exitApp()` en la app nativa). Test nuevo para la ventana de 1,5 s.

## Detalles técnicos
- Archivo principal: `src/routes/_authenticated/kids/$childId/watch/$videoId.tsx`; ajustes en `src/lib/tv-mode.ts` (zona `data-focus-zone="player"`, tratar los controles ocultos como destino válido hacia arriba) y textos nuevos en `src/lib/i18n.tsx` (es/en/pt: "Siguiente vídeo", "Ver ahora", "Cancelar", "en {s} s").
- Detectar `YT.PlayerState.ENDED` por separado del resto de estados para lanzar la tarjeta; constante `AUTOPLAY_NEXT_SECONDS = 10`.
- Regla con test en `src/lib/tv-mode.test.ts` o test nuevo: cuenta atrás de 10 s y que el siguiente vídeo es el primero de la lista recomendada.
- Verificación en el simulador de TV con Playwright: subir desde "A continuación", pulsar ±10 s y comprobar el cambio de tiempo, dejar terminar un vídeo y comprobar el salto automático.
- Cambios solo web: basta publicar, sin nueva versión de la app.
