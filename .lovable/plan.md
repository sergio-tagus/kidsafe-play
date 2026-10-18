# Bloquear el panel de padres al volver a niños + menús solo con OK

## 1. Fallo de seguridad: Atrás vuelve al panel de padres sin PIN
Causa: al desbloquear con el PIN se guarda un "desbloqueado" que dura toda la sesión del navegador y un periodo en el servidor. Al pasar al menú de niños nada lo borra, así que Atrás vuelve a entrar sin PIN.

Arreglo:
- En cuanto se entra en cualquier pantalla de niños, el panel de padres se bloquea: se borra el desbloqueo local y se cierra también el periodo en el servidor.
- Así, Atrás (mando, navegador o gesto) desde niños siempre muestra la pantalla del PIN.
- Al salir del panel por el botón de "volver a niños" pasa lo mismo.
- La suplantación de usuario (superadmin) no cambia.

## 2. Todos los menús desplegables se abren solo con OK (en TV)
- Igual que el globo de idiomas: en modo TV, arriba/abajo sobre cualquier botón que abre un menú o lista (menús de opciones, selectores, desplegables) solo mueve el foco; el menú se abre con OK.
- Dentro del menú abierto: arriba/abajo recorren opciones, OK elige, Atrás cierra.
- Fuera de la TV (ordenador, móvil) todo sigue igual.

## Detalles técnicos
- `src/routes/_authenticated/kids/$childId` (layout o `KidShell`): al montar, llamar `clearParentUnlock()` y la función de servidor de bloqueo existente en `src/lib/pin.functions.ts` (la que pone `unlocked_until = null`).
- Aplicar el comportamiento de "solo OK" una vez en los componentes base `src/components/ui/dropdown-menu.tsx` (`DropdownMenuTrigger`) y `src/components/ui/select.tsx` (`SelectTrigger`): en modo TV, `onKeyDownCapture` intercepta ArrowUp/ArrowDown, evita que se abra y llama a `moveFocus`. Simplificar `language-switcher.tsx` para usar ese comportamiento común.
- Prueba: comprobar con Playwright que tras desbloquear, ir a niños y pulsar Atrás aparece la pantalla del PIN.
