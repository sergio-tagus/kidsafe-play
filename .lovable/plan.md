# Plan de refactorización y mejoras

Objetivo: reducir duplicación, hacer el código más fácil de mantener y mejorar
rendimiento, accesibilidad y robustez, sin cambiar el comportamiento visible de
la app.

## 1. Claves de caché centralizadas

Hoy las claves de React Query se escriben a mano en cada ruta (`"kids"`, `"wl"`,
`"categories"`, `"cw"`, `"chs"`, `"reco"`…), con nombres cortos e inconsistentes
y invalidaciones repetidas.

- Crear `src/lib/query-keys.ts` con una fábrica tipada (`qk.kids()`,
  `qk.whitelist()`, `qk.categories()`, `qk.childVideos(childId, filter)`…).
- Sustituir todas las claves literales por la fábrica.
- Unificar invalidaciones: al tocar la whitelist o categorías se invalida
  también el catálogo infantil derivado, evitando listas desactualizadas.

## 2. Hooks de datos reutilizables

Cada ruta repite el patrón `useServerFn` + `useQuery` + `kids.find(...)` para
resolver el perfil del niño.

- Crear `src/hooks/use-child.ts`, `use-catalog.ts`, `use-whitelist.ts`,
  `use-categories.ts` que encapsulen consultas y mutaciones.
- Las rutas quedan como composición de UI, sin lógica de acceso a datos.

## 3. Dividir los archivos grandes

- `watch/$videoId.tsx` (410 líneas): extraer `useYouTubePlayer` (API del
  iframe, seek, play/pause), `usePlayerFullscreen`, y los componentes
  `PlayerOverlays` y `PlayerControls`.
- `parent/whitelist/index.tsx` (554 líneas): separar en `AddChannelForm`,
  `ChannelTable`, `RecommendationsPanel` y un hook con las mutaciones.
- `i18n.tsx` (524 líneas): mover los diccionarios a
  `src/lib/i18n/{es,en,pt}.ts` y dejar solo el proveedor en el archivo raíz,
  con un tipo que obligue a que los tres idiomas tengan las mismas claves.
- `kids.functions.ts` y `parent.functions.ts`: mover las consultas SQL a
  módulos `*.server.ts` y dejar las funciones de servidor como envoltorios
  finos (requisito del framework para el troceado de bundles).

## 4. Eliminar `any` y reforzar tipos

Hay `useQuery<any[]>` y `as any` en categorías, whitelist y redirecciones.

- Derivar tipos de los tipos generados de la base de datos y exportar tipos de
  dominio (`Category`, `Channel`, `KidVideo`) desde un único módulo.
- Tipar la búsqueda de las rutas con Zod donde falte, quitando los `as any` de
  `redirect`.

## 5. Consistencia en la carga de datos

Se usa `useQuery` en el componente en todos los casos, incluso en rutas ya
protegidas donde el loader podría precargar.

- En las rutas bajo `_authenticated`, precargar con
  `ensureQueryData` en el loader y consumir con `useSuspenseQuery`.
- Estados de carga uniformes con skeletons en lugar de listas vacías
  momentáneas.

## 6. UX y accesibilidad

- Skeletons y estados vacíos coherentes en todas las vistas de niños y padres.
- Foco visible y navegación con teclado/D-pad verificada en las rejillas de
  vídeos (importante para el modo TV).
- `aria-label` en los controles del reproductor y en las píldoras de canal.
- Mensajes de error accionables en lugar de toasts genéricos.

## 7. Rendimiento

- Cargar la vista del reproductor y el panel de padres de forma diferida para
  aligerar el paquete inicial.
- Imágenes de miniatura con `loading="lazy"`, `decoding="async"` y tamaños
  explícitos para evitar saltos de diseño.
- Revisar componentes UI no usados en `src/components/ui` y eliminar los que
  no tengan referencia.

## 8. Robustez del backend

- Un único punto de acceso al catálogo que aplique el filtro de whitelist,
  con una prueba que falle si alguna consulta lo omite.
- Manejo homogéneo de errores en las funciones de servidor (mismo formato de
  error, sin filtrar detalles internos al cliente).
- Revisar cuotas de la API de YouTube: reintentos con retroceso y aviso claro
  al padre cuando la sincronización se agote.

## 9. Calidad automatizada

- Añadir Vitest y pruebas para: filtro de whitelist, categorización
  automática, límites de tiempo de pantalla, caducidad del PIN parental y
  `sanitizeDescription`.
- Añadir script de comprobación de tipos y ejecutar lint/format en el flujo
  habitual.

## Orden sugerido

1. Claves de caché y tipos (base para todo lo demás).
2. Extracción de hooks y división de archivos grandes.
3. Precarga en loaders y estados de carga.
4. Accesibilidad, rendimiento y limpieza.
5. Pruebas automatizadas.

Cada bloque es independiente y se puede aprobar por separado; el comportamiento
visible de la aplicación no cambia salvo en las mejoras de carga y
accesibilidad indicadas.
