# Arreglar el asistente de bienvenida y añadir "No volver a mostrar"

## Problema

El recorrido se corta justo al pasar al paso 3 ("Perfiles de niños"). Los pasos 1 y 2 se ven en la misma pantalla (Resumen); el paso 3 es el primero que cambia de pantalla. El asistente está montado dentro de la estructura común del Panel de Padres, y esa estructura se vuelve a crear en cada pantalla: al cambiar de pantalla, el asistente se reinicia y se cierra, perdiendo el paso en el que iba.

## Qué se va a hacer

1. **Que el recorrido sobreviva al cambio de pantalla**: el asistente pasará a recordar si está abierto y en qué paso va, de forma independiente a la pantalla que se esté mostrando. Así, al saltar de Resumen a Perfiles de niños, Categorías, Canales aprobados e Historial, el recorrido continúa sin interrumpirse.
2. **Espera al contenido de cada pantalla**: si la zona a resaltar todavía está cargando, el asistente muestra la tarjeta del paso centrada y resalta la zona en cuanto aparece, en lugar de quedarse en blanco.
3. **Individual por usuario**: se mantiene tal cual. Cada cuenta tiene su propio progreso y todo usuario nuevo empieza el recorrido la primera vez que entra en el Panel de Padres.
4. **Ocultarlo para siempre**: nueva opción "No volver a mostrar" en la tarjeta del asistente (junto a "Omitir"). Al pulsarla:
   - el recorrido no vuelve a abrirse solo nunca más,
   - desaparece también el aviso "Continuar configuración" del Resumen,
   - sigue disponible bajo demanda desde el botón de ayuda (?) de la cabecera, con "Ver tutorial" y "Reiniciar tutorial" (reiniciar vuelve a activarlo).
5. Textos nuevos en español, inglés y portugués.

## Detalles técnicos

- El estado del recorrido (abierto/paso actual) se mueve a un pequeño almacén persistente fuera del ciclo de vida de `ParentShell` (módulo con suscripción, leído por `OnboardingTour`), de modo que el remontaje por navegación no lo reinicie. `<OnboardingTour />` se seguirá renderizando desde `ParentShell` con las mismas props (`suspended`).
- `measure()` en `src/components/onboarding-tour.tsx` reintenta con `requestAnimationFrame`/intervalo corto hasta encontrar el `data-tour` del paso (con tope de ~3 s) y no cierra ni salta el paso si no lo encuentra.
- Nuevo estado `dismissed` para `profiles.onboarding_status`: server fn `dismissOnboarding()` en `src/lib/onboarding.functions.ts` (misma protección que las actuales). `getOnboardingState` lo devuelve; el auto-arranque solo ocurre con `pending`; `OnboardingResumeBanner` se oculta con `dismissed` y `done`. `resetOnboarding()` lo devuelve a `pending`. No hace falta migración de esquema: la columna es texto libre y por defecto `pending`.
- Claves i18n nuevas: `tour.never` ("No volver a mostrar") en `src/lib/i18n.tsx` (es/en/pt).
