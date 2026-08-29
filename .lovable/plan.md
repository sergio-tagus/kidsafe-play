# Aviso "Esta conexión no es segura" en Safari

## Qué he comprobado

He hecho peticiones reales al sitio publicado:

- `https://safetube-kids-play.lovable.app/` responde **200 OK** por HTTPS.
- `http://...` devuelve **301** hacia `https://...`, con la cabecera
  `Strict-Transport-Security: max-age=31536000; includeSubDomains`.

Es decir: el sitio sí admite HTTPS y fuerza HTTPS. El texto del aviso de Safari
("este sitio web no admite conexiones seguras por HTTPS") no corresponde al
comportamiento real del servidor, y en la captura la barra de direcciones está
vacía (aún cargando). No es un fallo del código de la aplicación.

## Causas probables (en orden)

1. La dirección se abrió sin `https://` y Safari, con "Modo HTTPS" activado,
   muestra el aviso antes de seguir la redirección.
2. Red intermedia que intercepta el tráfico: Wi-Fi público, portal cautivo, VPN,
   DNS familiar/filtro de contenido o antivirus con inspección SSL.
3. Fecha/hora del dispositivo incorrecta, que invalida el certificado.
4. Enlace antiguo de vista previa del editor ya caducado.

## Pasos a seguir (no requieren cambios en la app)

1. Escribir la URL completa con `https://` delante y volver a probar.
2. Probar en datos móviles en lugar de Wi-Fi (descarta filtro/proxy de red).
3. Ajustes > Safari > Borrar historial y datos, y reintentar.
4. Comprobar que fecha y hora del iPhone están en automático.
5. Si el acceso se hizo desde un icono guardado en la pantalla de inicio,
   borrarlo y volver a añadirlo desde la URL publicada actual.

## Cambios en el código

Ninguno previsto. Si tras los pasos 1-4 el aviso persiste solo en tu dispositivo
o red, el siguiente paso sería confirmar desde qué red/perfil ocurre; si
ocurriera en varios dispositivos, revisaríamos la configuración de dominio y
publicación del proyecto.
