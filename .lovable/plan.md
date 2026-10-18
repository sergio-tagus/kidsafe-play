# Plan: Lanzamiento en Google Play, bienvenida TV, capturas TV y GitHub

## 1. Pantalla de bienvenida en modo TV
- Nueva pantalla que aparece solo en modo TV cuando el padre no tiene canales aprobados ni PIN.
- Contenido: saludo, 2 pasos claros ("Configura el PIN" y "Añade canales") y un QR + enlace corto para hacerlo desde el móvil (escribir en la TV con el mando es incómodo).
- Botones grandes navegables con el mando: "Configurar en el móvil", "Continuar en la TV".
- Desaparece sola cuando ya hay PIN y al menos un canal.
- Textos en español, inglés y portugués.

## 2. Capturas de Google TV con sesión real
- Iniciar sesión en la vista previa con tu cuenta real y abrir la app en modo TV a 1920x1080.
- Capturar: inicio del niño, categorías, un canal, reproductor, búsqueda, selección de perfil y la nueva bienvenida.
- Guardarlas listas para subir a Play Console (sección Android TV) y enseñártelas antes.

## 3. Archivo .aab firmado
- Intentar compilar el .aab aquí instalando Java temporalmente.
- La firma necesita tu keystore y contraseñas: lo más seguro es que lo hagas tú en Android Studio o con el flujo automático de GitHub (ya preparado en `build-android.yml`), guardando el keystore como secreto de GitHub.
- Si no se puede firmar aquí, te dejo un .aab sin firmar para pruebas y los pasos exactos.

## 4. Ficha de Play Store
- Preparar todos los textos (título, descripción corta y larga en 3 idiomas), categoría, cuestionario de seguridad de datos y público infantil, en un documento listo para copiar.
- Enlace de privacidad: https://kidsafe-play.mediaatlastv.com/privacy (se publicará la web para que esté activo).
- Limitación: no tengo acceso a tu Play Console, así que la subida del .aab y el envío a revisión los haces tú siguiendo el documento.

## 5. Sincronización con GitHub
- Se activa desde Ajustes del proyecto → Git → Conectar GitHub (requiere tu cuenta; yo no puedo conectarla).
- Tras conectar, moveré `build-android.yml` a `.github/workflows/` para que GitHub genere el .aab firmado automáticamente, y te indicaré los 4 secretos a añadir en GitHub.

## Lo que depende de ti
- Conectar GitHub.
- Keystore y contraseñas (en GitHub o Android Studio).
- Subir el .aab y la ficha en Play Console.
