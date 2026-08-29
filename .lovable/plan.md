# Aviso "Esta conexión no es segura" en Safari

## Diagnóstico confirmado

Pruebas realizadas:

- `https://oauth.lovable.app` establece HTTPS correctamente y devuelve una respuesta HTTP válida con HSTS. El `404` de su portada es normal porque es un servicio de autenticación, no una página para visitar directamente.
- `https://kidsafe-play.tagus-consulting.com` responde **200 OK** por HTTPS.
- `https://kidsafe-play.lovable.app` redirige correctamente al dominio propio.
- El certificado y la conexión funcionan desde redes externas.
- Sin VPN, el aviso aparece en móvil, portátil, Wi-Fi, datos móviles y navegación privada.
- Con VPN, tanto la aplicación como la autenticación funcionan.

Esto confirma que la ruta de red normal está bloqueando o interceptando el dominio `lovable.app` completo, incluido `oauth.lovable.app`. No es un fallo del certificado ni del código de SafeTube Kids. La VPN evita el filtro y por eso funciona.

## Qué hacer

1. Entrar en la aplicación mediante el dominio propio: `https://kidsafe-play.tagus-consulting.com`.
2. Mientras persista el bloqueo de `oauth.lovable.app`, mantener la VPN activa durante el inicio de sesión con Google. El dominio propio evita el bloqueo para la app, pero el acceso necesita contactar con el servicio OAuth.
3. Revisar y desactivar temporalmente DNS filtrado, control parental, antivirus con inspección HTTPS o perfiles de administración instalados en ambos dispositivos.
4. Solicitar al operador o proveedor del filtro que permita estos dominios:
   - `oauth.lovable.app`
   - `*.lovable.app`
   - `kidsafe-play.tagus-consulting.com`
5. No pulsar **Continuar** cuando Safari indique que la conexión no es segura.

## Cambios en la aplicación

No se requieren cambios de código: la aplicación y el dominio propio sirven HTTPS correctamente. El punto pendiente es desbloquear `oauth.lovable.app` en la red para que el inicio de sesión pueda completarse sin VPN.