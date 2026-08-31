# Arreglar el error al abrir "Canales aprobados"

## Causa confirmada

Los 82 canales guardados tienen el idioma vacío (la columna `language` se añadió hace poco y aún no se ha sincronizado ningún canal). El filtro de idioma genera entonces una opción con valor vacío en el desplegable, y el componente de selección no admite valores vacíos: lanza un error y la página entera cae en la pantalla "Something went wrong". Por eso solo falla esta sección y el resto del panel de padres funciona.

## Cambios

En `src/routes/_authenticated/parent/whitelist/index.tsx`:

1. Usar un valor centinela `"unknown"` en lugar de cadena vacía para los canales sin idioma detectado, tanto al construir la lista de idiomas como al comparar en el filtrado.
2. La etiqueta de esa opción sigue siendo "Desconocido" (`parent.unknownLanguage`), ya traducida en es/en/pt.
3. Ocultar el desplegable de idioma cuando la única opción disponible sea "Desconocido", para no mostrar un filtro inútil mientras no haya idiomas detectados.

## Notas técnicas

- Sin cambios de base de datos, de RLS ni de funciones de servidor.
- El resto de filtros (texto, categoría, estado, ordenación) se queda igual.
- Verificación: abrir `/parent/whitelist` y comprobar que la rejilla de canales se muestra y que los filtros siguen funcionando.
