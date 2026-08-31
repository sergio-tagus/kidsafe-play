# Bandera de Portugal y nuevo orden de secciones en Inicio

## Objetivo
1. Cambiar la bandera del idioma portugués de Brasil (🇧🇷) a Portugal (🇵🇹) en toda la app.
2. Reordenar las secciones de la página de inicio del niño: Recomendado, Vídeos nuevos, Populares y, al final, Continuar viendo.

## Cambios

### 1. Bandera de Portugal
- En `src/lib/i18n.tsx` (definición de `LANGS`, línea 739): cambiar la bandera del código `pt` de `🇧🇷` a `🇵🇹`.
- Al ser la única fuente de banderas, el cambio se refleja automáticamente en la página de login, en el selector de idioma del menú y en cualquier otro lugar que use `LANGS`.

### 2. Orden de secciones en Inicio
- En `src/routes/_authenticated/kids/$childId/index.tsx` (líneas 44-47): reordenar los cuatro `VideoRow`.
  - Orden actual: Continuar viendo → Recomendado → Vídeos nuevos → Populares.
  - Orden nuevo: Recomendado → Vídeos nuevos → Populares → Continuar viendo.
- La fila de canales recientes se mantiene al final, como está ahora.

## Notas técnicas
- Sin cambios en base de datos ni migraciones.
- Sin cambios de lógica: solo texto y orden de componentes.

## Verificación
- Build automático sin errores.
- Comprobar en el preview que el login muestra 🇵🇹 y que Inicio muestra las secciones en el nuevo orden.