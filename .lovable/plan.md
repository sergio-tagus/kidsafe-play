# Ajustes del panel de padres y de la TV

## 1. Sincronización automática como menú desplegable
En la tarjeta "Sincronización automática" del resumen de padres (solo superadmin), las dos casillas (Desactivada / Quincenal) pasan a ser un menú desplegable. Guarda al elegir, igual que ahora. En la TV se abre solo con OK, como los demás menús.

## 2. Campos de texto: editar solo al pulsar OK (TV)
- Al moverte con el mando sobre un campo de texto (buscador, nombre del hijo, PIN, buscador de canales...), el campo se selecciona visualmente pero **no se abre el teclado**.
- Al pulsar OK se activa la edición y aparece el teclado.
- Al pulsar Atrás o terminar (Enter), se sale de la edición y el mando vuelve a moverse entre botones.
- Fuera de la TV (móvil y ordenador) los campos funcionan como siempre.

## 3. "Impersonar usuario" solo en Lovable
- La opción del menú y la página solo aparecen en la previsualización de Lovable y en el entorno de desarrollo.
- En las direcciones publicadas (kidsafe-play.mediaatlastv.com, kidsafe-play.lovable.app) y en la app de la tele/móvil queda oculta, y si alguien entra por enlace directo se le lleva al panel de padres.
- El servidor también la rechaza cuando la petición llega desde una dirección publicada, para que no baste con ocultar el botón.

## 4. Resolución actual y forzar otra
Nueva sección "Pantalla" en el panel de padres:
- Muestra la resolución actual: tamaño de pantalla detectado, tamaño útil y densidad (p. ej. "1920×1080 · escala 2×").
- Desplegable "Forzar resolución": Automática (por defecto), 720p, 1080p, 4K. Elegir una ajusta el tamaño de toda la interfaz como si la pantalla tuviera esa resolución.
- Se guarda en ese dispositivo (cada tele o móvil puede tener la suya) y se aplica al instante, también en la zona infantil.
- Si el resultado no se ve bien, "Automática" lo devuelve todo a como estaba.

Nota: una web no puede cambiar la resolución real de la tele; lo que se fuerza es la escala de la interfaz, que es el efecto visible que buscas.

## Detalles técnicos
- Sync: `SyncSettingsCard` en `parent/index.tsx` → `Select` de shadcn (ya tiene la captura de OK de TV).
- Texto: en `tv-mode.ts`, los `input`/`textarea` en `html.tv` se marcan `readonly` + `inputmode="none"` al recibir foco; Enter/OK lo quita y llama a `focus()`; Escape/Back/Enter final lo vuelve a poner y devuelve el control al navegador espacial. Test nuevo en `tv-mode.test.ts`.
- Impersonación: helper `isLovableHost()` (hostname `id-preview--*.lovable.app`, `*.lovableproject.com`, `localhost`); oculta la entrada en `parent-shell.tsx`, `beforeLoad` en `impersonate.tsx` redirige, y `startImpersonation`/`searchUsers` comprueban el `Origin`/`Host` de la petición. El banner de una impersonación ya activa sigue funcionando para poder finalizarla.
- Resolución: `src/lib/display-scale.ts` lee `screen.width/height`, `innerWidth/Height`, `devicePixelRatio`; preferencia en `localStorage` (`safetube.forcedResolution`); aplica `zoom` en `<html>` = `innerWidth / anchoObjetivo`. Se aplica al arrancar en `__root.tsx`. Textos en es/en/pt.
