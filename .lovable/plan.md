# Inicio: una fila por sección y recomendaciones aleatorias

## Objetivo
1. En la página de inicio del niño, cada sección (Continuar viendo, Recomendado para ti, Vídeos nuevos, Populares) muestra **una sola línea** de vídeos con scroll horizontal, en lugar de la rejilla actual.
2. La sección "Recomendado para ti" devuelve resultados **aleatorios en cada visita**, para que no se repitan siempre los mismos vídeos.

## Cambios

### 1. Fila única con scroll horizontal (solo inicio)
- En `src/components/video-card.tsx` añadir a `VideoRow` una prop opcional `scroll?: boolean`:
  - `scroll=true` → contenedor `flex gap-4 overflow-x-auto pb-2` con tarjetas de ancho fijo (p. ej. `w-44 sm:w-52 flex-shrink-0`), una sola fila desplazable.
  - `scroll=false` (por defecto) → comportamiento actual en rejilla, así el resto de páginas (categorías, canal, búsqueda, favoritos) no cambian.
- En `src/routes/_authenticated/kids/$childId/index.tsx` pasar `scroll` a los cuatro `VideoRow` de la home. La fila de canales ya es scroll horizontal; se queda igual.

### 2. Recomendaciones aleatorias
- En `src/lib/kids.functions.ts` (`listSafeVideos`), cuando `filter === "recommended"`:
  - Pedir un pool más amplio (hasta `limit * 4`, máx. 100) manteniendo el INNER JOIN a canales activos de la whitelist.
  - Barajar en servidor con Fisher–Yates y devolver solo `limit` elementos.
- En la home, la query `["reco", childId]` se marca con `staleTime: 0` + `refetchOnMount: "always"` para que cada entrada a inicio genere una selección nueva (el resto de secciones mantienen su caché).

## Notas técnicas
- Sin cambios en base de datos ni migraciones.
- "Populares" y "Nuevos" siguen con su orden actual (recencia) — solo "Recomendado" se aleatoriza, como se pidió.

## Verificación
- `npm run build` (o el build automático) sin errores.
- Si hay sesión disponible, comprobar con Playwright que inicio muestra una fila por sección y que al recargar cambian los recomendados.
