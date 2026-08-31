# Inicio: nuevo orden de secciones

## Objetivo
En la página de inicio del niño, reordenar las secciones para que aparezcan en este orden:

1. Recomendado para ti
2. Vídeos nuevos
3. Populares
4. Continuar viendo

La fila de canales (recientes) se mantiene al final, después de "Continuar viendo", como está ahora.

## Cambios
- En `src/routes/_authenticated/kids/$childId/index.tsx`, reordenar los cuatro `VideoRow` del bloque principal: mover `Continuar viendo` (cont) al final y dejar `Recomendado` (reco), `Vídeos nuevos` (recent) y `Populares` (pop) por delante, en ese orden.

## Notas técnicas
- Sin cambios de base de datos, lógica ni estilos. Solo se reordenan los componentes en el JSX.
- No cambia el comportamiento de scroll horizontal ni el resto de páginas.

## Verificación
- Build sin errores.
- Comprobar en la preview que el inicio muestra el nuevo orden de títulos.