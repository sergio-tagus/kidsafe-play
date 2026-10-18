# Plan: SafeTube Kids en Google TV

Objetivo: que la app se instale, se vea y se maneje bien en Google TV con el mando a distancia, y que Google Play la acepte en la categoría TV.

## 1. Arreglos previos al lanzamiento

- Corregir el archivo de compilación de Android: el bloque de firma y el de "release" tienen texto pegado por error y ahora mismo no compila.
- Firma leída desde variables de entorno (keystore, alias, contraseñas), sin guardar contraseñas en el proyecto.
- Subir versión (versionCode / versionName) y fijar targetSdk 35, que es lo que exige Play en 2026.

## 2. Requisitos técnicos de Google TV

- Mantener lanzador Leanback, touchscreen opcional y banner 320x180 (ya presentes); revisar que el banner tenga el nombre de la app legible.
- Declarar como opcionales otras funciones que la TV no tiene (cámara, GPS, micrófono), para que Play no excluya la app.
- Forzar orientación horizontal solo en TV; móvil y tablet siguen libres.
- Pantalla siempre encendida mientras se reproduce un vídeo.

## 3. Navegación con el mando (D-pad)

- Detectar el modo TV (pantalla grande sin táctil o agente de Android TV) y activar un "modo TV" en la interfaz.
- Foco visible y grande en todos los elementos: tarjetas de vídeo, filas del inicio, menú lateral, botones del reproductor, buscador.
- Movimiento lógico entre filas y columnas con las flechas; al entrar en una fila se desplaza sola para que el elemento enfocado quede visible.
- Botón "Atrás" del mando: cierra popups, sale de pantalla completa, vuelve a la página anterior y, en la pantalla de inicio, sale de la app.
- Reproductor: OK = pausa/reproducir, izquierda/derecha = -10/+10 s, los controles reaparecen con cualquier tecla.
- Teclado PIN y buscador manejables con el mando (teclado en pantalla de Android).

## 4. Diseño para televisión

- Margen de seguridad del 5% en los bordes (overscan).
- Textos y tarjetas más grandes, legibles a 3 metros.
- Menú lateral compacto que se expande al recibir el foco.
- Ocultar en TV elementos que no tienen sentido (enlaces de instalar app, gestos táctiles).

## 5. Inicio de sesión en TV

- Google en la TV por deep link funciona mal sin navegador cómodo. Propuesta: pantalla "Entrar con el móvil" que muestra un código QR y un código corto; el padre lo abre en su teléfono, inicia sesión con Google y la TV entra automáticamente.
- Se mantiene el login normal como alternativa.

## 6. Ficha de Play para TV

- Capturas 1920x1080 de inicio, categorías, reproductor y panel de padres en modo TV (con sesión de prueba).
- Banner de TV y gráfico destacado revisados.
- Activar "Android TV" en la ficha y enviar a revisión de calidad de TV de Google.
- Pruebas internas en un dispositivo Google TV real o emulador antes de producción.

## 7. Verificación

- Recorrido completo solo con flechas/OK/Atrás en vista 1920x1080.
- Compilación y tipos sin errores; prueba de las reglas de detección de modo TV y del mapeo de teclas.

## Detalles técnicos

- Archivos: `android/app/build.gradle`, `AndroidManifest.xml`, `MainActivity.java` (keep-screen-on y orientación en TV vía `UiModeManager`).
- Hook `useTvMode` + clase `tv` en `<html>`; estilos en `src/styles.css` con tokens existentes.
- Navegación espacial: utilidad propia basada en `data-focus-row`/`data-focus-col` o librería ligera (`@noriginmedia/norigin-spatial-navigation`).
- Botón Atrás: plugin `@capacitor/app` (`backButton`).
- Login por código: tabla `tv_login_codes` (código, estado, expiración 10 min) con RLS, funciones de servidor para crear/consultar/confirmar, y ruta `/tv-link` en el móvil.

## Lo que necesitarás tú

- Keystore para firmar y Android Studio para generar el `.aab`.
- Un Google TV o el emulador de Android Studio para probar.
