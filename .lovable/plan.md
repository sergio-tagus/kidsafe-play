## Diagnóstico visual

Capturé el reproductor con Playwright. Los botones que salen a YouTube y NO están bloqueados son:

- **Icono "Enlace"** (cadena) en esquina inferior-izquierda, debajo de la barra de progreso.
- **Pill "More videos"** en zona inferior-derecha, debajo de la barra de progreso.
- **Wordmark "YouTube"** en esquina inferior-derecha (mi overlay actual está mal ubicado).

Además, el overlay superior actual `inset-x-0 h-20` está tapando los **controles legítimos de arriba-derecha** (volumen, subtítulos CC, ajustes), que no son enlaces externos.

Layout real del player (976 × 549 en la captura):

```
┌──────────────────────────────────────────────────────────┐
│ [avatar] Título del vídeo              [vol][CC][⚙]      │  ← top: título+avatar (ext), controles (ok)
│                                                          │
│                    [ play/pausa ]                        │
│                                                          │
│                                                          │
│                                                          │
│   0:03 / 1:59:05                        [fullscreen]     │  ← fullscreen (ok)
│  ══════════════════════════════════════                  │  ← progress bar (ok)
│  [🔗]                        [More videos] [▶ YouTube]   │  ← TODO externo, tapar
└──────────────────────────────────────────────────────────┘
```

## Cambios en `src/routes/_authenticated/kids/$childId/watch/$videoId.tsx`

### Nueva estrategia de overlays

Reemplazar los dos overlays actuales por tres, todos con `z-10` y `pointer-events-auto`:

1. **Top-left** (título + avatar):
   `absolute top-0 left-0 h-16 right-1/3`
   Deja el tercio derecho libre para volumen/CC/ajustes.

2. **Bottom-strip** (icono enlace + "More videos" + wordmark YouTube):
   `absolute bottom-0 inset-x-0 h-14`
   Cubre TODA la franja inferior debajo de la barra de progreso. La barra de progreso, el tiempo y el botón fullscreen están por encima de esa franja (aprox. bottom 56–110 px), así que siguen accesibles.

3. **Eliminar** el antiguo overlay `bottom-0 right-14 w-20 h-12` (queda englobado en el bottom-strip).

Todos los overlays capturan el click y hacen `e.stopPropagation()` sin navegar (o el superior invoca play/pausa como ya hace).

### Verificación tras el cambio

Con Playwright, cargar la página, screenshot en:
- Vídeo reproduciendo con hover: confirmar que volumen/CC/ajustes/fullscreen siguen visibles y clicables (probar clic → estado cambia).
- Confirmar que clics sobre las zonas del icono enlace, "More videos" y wordmark NO abren nueva pestaña (contar `context.pages()` antes/después = 1).
- Estado pausa: confirmar que el overlay React tapa la end-screen sin flash.

### Comprobación de otros botones ocultos

De la captura no aparecen otros botones externos. En algunos vídeos YouTube muestra:
- **Botón "..."** o "Más" en la barra superior → cae dentro del top-left overlay si tuviera menú, pero si aparece a la derecha, se acepta el riesgo residual (menú de calidad/velocidad no es externo).
- **Cards / anotaciones** en esquina superior-derecha con enlaces externos → `iv_load_policy: 3` ya las desactiva.
- **End-screen** de recomendados y "Ver en YouTube" al finalizar → tapado por el overlay `paused` (que ya se activa también en ENDED/BUFFERING/CUED).

Si tras verificar aparece algún botón nuevo, se añade un overlay puntual.

## Fuera de alcance
- Custom-controls totalmente propios (implicaría reimplementar seek, volumen, calidad).
- Bloquear atajos del sistema operativo (arrastrar iframe, cmd+click) — no accesibles desde web.

## Archivos tocados
- `src/routes/_authenticated/kids/$childId/watch/$videoId.tsx` (único).
