# Aviso de tiempo agotado que no aparece

## Lo comprobado
- El aviso sí se creó: Elsita llegó a 300 de 300 minutos y hay un aviso pendiente de hoy (creado a las 22:18 UTC) asignado a tu cuenta.
- Así que el fallo está en mostrarlo, no en crearlo. Lo más probable: estás usando la app publicada (o la TV), que aún no tiene esta función porque no se ha publicado. Otra posibilidad es un fallo al leer el aviso en el panel. Todavía no lo he confirmado.

## Pasos
1. Abrir el panel de padres en la vista previa con tu cuenta y comprobar si aparece la tarjeta "A Elsita se le ha acabado el tiempo de hoy" y la campana.
2. Si no aparece: revisar la consulta de avisos (la lectura del nombre del niño junto al aviso y los permisos) y corregirla. Probar luego "Ampliar 1 hora" y confirmar que Elsita queda con 60 minutos extra hoy.
3. Hacer el aviso más visible:
   - En el móvil, mostrar la campana con su número también en la barra superior (ahora solo se ve en el menú lateral del ordenador).
   - Al pulsar la campana, ir directamente al aviso.
4. Si en la vista previa funciona, publicar la web para que llegue a la app publicada y a la TV.

## Fuera de alcance
- Notificaciones push al móvil o por correo (se puede plantear después).

## Detalles técnicos
- Test con Playwright, con la sesión iniciada, en /parent (ventana de desbloqueo con PIN), a 1280 px y a 375 px.
- Revisar `listScreenTimeAlerts`, que hace el embed `child_profiles(...)` a través de la FK, y la política RLS `parent_id = auth.uid()`.
