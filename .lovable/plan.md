# Plan: Lanzamiento en Google Play, bienvenida TV, capturas TV y GitHub

## 1. Pantalla de bienvenida en modo TV
- Nueva pantalla que aparece solo en modo TV cuando el padre no tiene canales aprobados ni PIN.
- Contenido: saludo y 2 pasos: "Configura el PIN" y "Añade canales desde el ordenador", con la dirección web bien visible (recomendado: más cómodo para buscar y revisar canales) y un QR como alternativa para el móvil.
- Botones grandes navegables con el mando: "Ya lo he configurado" y "Continuar en la TV".
- Desaparece sola cuando ya hay PIN y al menos un canal.
- Textos en español, inglés y portugués.

## Pantallas 4K y 8K
- Tamaños de texto, botones, miniaturas y QR proporcionales a la pantalla, para que se vean igual de nítidos y legibles en Full HD, 4K y 8K.
- Imágenes de canales y vídeos en la mayor calidad disponible en pantallas grandes.
- Comprobación visual en 1920x1080, 3840x2160 y 7680x4320.

## 2. Capturas de Google TV con sesión real
- Iniciar sesión en la vista previa con tu cuenta real y abrir la app en modo TV.
- Capturar a 1920x1080 (formato que pide Play Console) y además a 3840x2160 para revisar la calidad en 4K.
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
