# Asistente de bienvenida para padres

Un recorrido guiado que se abre automáticamente la primera vez que un padre entra en el Panel de Padres, explica para qué sirve cada sección y le lleva paso a paso por la configuración inicial. Se puede omitir, reanudar donde lo dejó y volver a lanzar cuando quiera desde un botón de ayuda.

## Experiencia

1. **Bienvenida**: tarjeta central con el nombre de la app, qué va a configurar y botones "Empezar" / "Ahora no".
2. **Recorrido por pasos** con un foco resaltado sobre el elemento real de la pantalla, un texto corto (para qué sirve + acción recomendada) y botones Atrás / Siguiente / Omitir, más un indicador "Paso 3 de 7".
3. Pasos previstos (en este orden):
  - Resumen del panel: qué datos se ven aquí.
  - Perfiles infantiles: crear el primer perfil y fijar el límite diario.
  - Categorías: organizar los canales.  
  Canales aprobados: añadir el primer canal por URL de YouTube; se explica que solo se ve contenido de esta lista.
  - Historial: revisar lo que ven los niños.
  - PIN parental: para qué sirve y cómo recuperarlo.
  - Final: resumen con checklist de lo que queda pendiente y enlace a volver a ver el tutorial.
4. Cuando un paso pertenece a otra pantalla, el asistente navega solo a esa pantalla y continúa el foco allí.
5. El checklist final marca automáticamente lo ya hecho (tiene hijos, tiene canales, tiene PIN), de modo que el padre ve qué le falta.

## Omitir, reanudar y reconsultar

- **Omitir**: cierra el recorrido y no vuelve a aparecer solo; queda guardado como omitido.
- **Reanudar**: si lo cierra a mitad, al volver al panel aparece un aviso discreto "Continuar configuración (paso X de Y)" que retoma donde lo dejó.
- **Ayuda**: nuevo botón de interrogación en la cabecera del Panel de Padres con: "Ver tutorial de bienvenida", "Reiniciar tutorial" y accesos a los pasos sueltos.
- Todo en español, inglés y portugués, siguiendo el idioma elegido en la app.

## Detalles técnicos

- **Base de datos**: columnas nuevas en `public.profiles`: `onboarding_status` (`pending` | `in_progress` | `skipped` | `done`, por defecto `pending`), `onboarding_step` (int, 0) y `onboarding_completed_at`. RLS actual (dueño del perfil) ya cubre la lectura/escritura.
- **Funciones de servidor** en un nuevo `src/lib/onboarding.functions.ts` (`getOnboardingState`, `setOnboardingStep`, `skipOnboarding`, `resetOnboarding`), con la middleware de autenticación existente. Sin `requireSuperAdmin`: es para todos los padres.
- **Componente** `src/components/onboarding-tour.tsx`: overlay propio con recorte (spotlight) posicionado sobre un selector `data-tour="..."`, sin añadir librerías nuevas. Definición de pasos en `src/lib/onboarding-steps.ts` (id, ruta, selector, claves de traducción).
- **Anclajes**: atributos `data-tour` en los enlaces del menú lateral y móvil de `parent-shell.tsx` y en los bloques clave de `parent/index.tsx`, `children.tsx`, `whitelist/index.tsx`, `categories.tsx`, `history.tsx`.
- **Montaje**: dentro de `ParentShell`, junto a `ParentUnlockGuard`, para que esté en todas las páginas del panel. Se oculta mientras el guard de PIN esté bloqueando y durante una sesión de impersonación.
- **Navegación entre pasos** con el router de TanStack; el paso espera a que el ancla exista antes de dibujar el foco, con tiempo de espera y salto al siguiente si no aparece.
- **Traducciones** nuevas en `src/lib/i18n.tsx` bajo el prefijo `tour.*` para es/en/pt.
- Accesible: navegable con teclado (Esc omite, flechas avanzan/retroceden) y responsive en móvil (la tarjeta pasa a hoja inferior).