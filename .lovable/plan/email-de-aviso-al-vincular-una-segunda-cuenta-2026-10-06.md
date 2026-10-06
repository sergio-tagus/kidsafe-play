# Email de aviso al vincular una segunda cuenta

## Por qué no llegó nada
Hasta ahora, vincular un email no enviaba ningún correo. La vinculación ya funciona: basta con entrar con ese Google. Este plan añade el aviso.

## Lo que hace falta primero (tu parte)
Para enviar emails la app necesita un dominio tuyo como remitente (por ejemplo `aviso@mediaatlastv.com`). Al aprobar, se te abrirá una ventana para configurarlo y tendrás que añadir unos registros en el panel de tu dominio. Hasta que el dominio quede verificado, los emails se guardan y se envían en cuanto termine la verificación.

## Qué se añade
- Al pulsar "Vincular", se envía un email al segundo correo, en el idioma de la app (español, inglés o portugués):
  - "Sergio Monteiro (sergio...@gmail.com) ha vinculado este email a su cuenta de SafeTube Kids."
  - Un botón "Entrar en SafeTube Kids" que abre la página de acceso con Google.
  - Un texto que dice que, si no reconoces esta vinculación, puedes ignorar el email.
- Botón "Reenviar aviso" en cada email que siga como "Pendiente".
- Los emails llevarán al pie un enlace para darse de baja, que es obligatorio. Si alguien se da de baja, deja de recibir avisos, pero la vinculación sigue funcionando.

## Detalles técnicos
- Configurar el dominio con el diálogo, preparar la infraestructura de envío y las plantillas de email de la app.
- Plantilla `linked-account-invite` con props `{ ownerName, ownerEmail, lang, loginUrl }`, en la marca de la app con fondo blanco.
- Enviarla después de un `addLinkedAccount` correcto mediante el envío autenticado, con la clave de idempotencia `link-invite-<id>`. Reenviar usa `link-invite-<id>-<timestamp>`.
- Página de baja con la marca de la app, en la ruta que indique la configuración.
