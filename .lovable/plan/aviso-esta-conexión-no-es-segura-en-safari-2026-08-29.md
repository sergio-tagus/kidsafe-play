# Aviso "Esta conexión no es segura" en Safari

## Diagnóstico confirmado

Pruebas realizadas:

- `https://safetube-kids-play.lovable.app/` responde **200 OK** por HTTPS.
- `http://...` devuelve **301** hacia `https://...` con
  `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
- Certificado TLS válido para `*.lovable.app` (Google Trust Services, en vigor).
- Un navegador externo independiente abrió la URL publicada y mostró la
  pantalla de acceso de SafeTube Kids sin ningún aviso.
- **Con VPN activada, te funciona.** Sin VPN, falla en móvil (datos y Wi-Fi)
  y en portátil, también en pestaña privada.

Conclusión: la app y su dominio son seguros y funcionan. Tu ruta de red normal
(ISP / DNS / operador) está redirigiendo las peticiones hacia `*.lovable.app`
a un servidor intermedio que sí usa HTTP sin cifrar, y Safari lo detecta. Al
activar la VPN, el tráfico se cifra de extremo a extremo y esquiva ese punto
intermedio, por eso funciona.

Que ocurra tanto en datos móviles como en Wi-Fi apunta a que ambas conexiones
salen por el mismo operador, o a un filtro de DNS parental/seguridad configurado
igual en ambos dispositivos (por ejemplo, un DNS filtrado, "DNS seguro" o una
app de control parental que actúa en todos los perfiles).

## Qué hacer

1. Solución inmediata: seguir usando la app con la VPN activada. No hay riesgo;
   la conexión va cifrada igualmente.
2. Localizar el filtro: revisa si tienes configurado un DNS privado/seguro en
   iPhone y portátil (Ajustes > Wi-Fi > DNS; Ajustes > VPN y gestión de
   dispositivos; apps de control parental o antivirus) y prueba a desactivarlo
   para el dominio `lovable.app` o a volver al DNS automático.
3. Si no hay nada de lo anterior, el bloqueo viene de tu operador de red
   (algunos operadores aplican filtros de contenido por defecto). Contacta con
   tu operador para que desbloqueen `*.lovable.app` o te desactiven el filtro.
4. Nunca pulsar "Continuar" en ese aviso para la app: entrarías por una
   conexión interceptada sin cifrar.

## Cambios en el código

Ninguno. No es un problema de la aplicación, del certificado ni del dominio;
modificar el código no puede corregir una interceptación de red previa al
servidor. La app queda como está.
