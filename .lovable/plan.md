# Aviso "Esta conexión no es segura" en Safari

## Qué he comprobado

He hecho peticiones reales al sitio publicado:

- `https://safetube-kids-play.lovable.app/` responde **200 OK** por HTTPS.
- `http://...` devuelve **301** hacia `https://...`, con la cabecera
  `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
- El certificado TLS es válido para `*.lovable.app`, está emitido por Google
  Trust Services y cubre la fecha actual.
- La URL oficial configurada como publicada es exactamente
  `https://safetube-kids-play.lovable.app`.
- La vista previa también está cargando por HTTPS y no está controlada por un
  service worker antiguo.

Es decir: el sitio sí admite HTTPS y fuerza HTTPS. El texto del aviso de Safari
("este sitio web no admite conexiones seguras por HTTPS") no corresponde al
comportamiento real del servidor. Como también ocurre con datos móviles y en
otro dispositivo, queda descartado un problema exclusivo de caché, Wi-Fi o del
iPhone. En la captura, además, la barra está vacía y muestra "Buscar o introducir
sitio web", por lo que Safari no llegó a presentar la URL que intentó abrir.
No hay evidencia de un fallo HTTPS en el código o en el dominio publicado.

## Causas probables (en orden)

1. La acción de la vista previa está pasando a Safari una URL incompleta o con
   un esquema incorrecto, aunque el dominio publicado al copiarlo sea correcto.
2. Safari está intentando restaurar un acceso directo o pestaña anterior con
   una URL antigua/incompleta.
3. Incidencia transitoria del navegador o del enlace generado por el editor.

## Pasos a seguir (no requieren cambios en la app)

1. No usar el botón de vista previa para esta prueba: copiar y pegar directamente
   `https://safetube-kids-play.lovable.app` en una pestaña privada nueva.
2. Si funciona, eliminar el marcador/acceso directo anterior y volver a crearlo
   desde esa página ya cargada.
3. Si el enlace directo vuelve a mostrar el aviso, pulsar **Retroceder** (no
   **Continuar**) y capturar la barra de direcciones con la URL visible; eso
   permitirá identificar qué dirección está intentando abrir realmente Safari.

## Cambios en el código

Ninguno previsto: cambiar la aplicación no puede reparar un aviso que sucede
antes de que Safari conecte con ella. Si el enlace directo falla mostrando la
URL correcta en la barra, se escala como incidencia de plataforma adjuntando la
captura, porque el dominio, DNS, redirección y certificado están operativos.
