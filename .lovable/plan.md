# Propuesta de mejoras para SafeTube Kids

Elige las que quieras y las construyo. Están agrupadas por prioridad.

## 1. Seguridad infantil (prioridad alta)
- **Bloqueo por horario**: franjas sin vídeos (p. ej. 21:00–08:00 y horas de colegio), por perfil.
- **Pausa de descanso**: cada X minutos de uso seguido, pantalla de "descansa los ojos" de 5 min.
- **Aviso 5 minutos antes** de que se acabe el tiempo, para que el niño no se corte a mitad de vídeo.
- **Bloquear vídeos concretos** desde el historial del niño (sin quitar el canal entero).

## 2. Panel de padres
- **Informe semanal**: minutos por día, canales y categorías más vistos, por niño.
- **Solicitudes del niño**: botón "Pedir más tiempo" en la pantalla de bloqueo, que llega al aviso de padres.
- **Aprobar/ampliar desde el móvil con notificación push** (Android), no solo al abrir el panel.

## 3. Experiencia del niño
- **Modo sin lectura** para los más pequeños: solo iconos grandes, sin buscador.
- **Listas de reproducción** creadas por los padres (p. ej. "Antes de dormir").
- **Continuar viendo**: fila en inicio con vídeos a medias y retomar en el segundo exacto.

## 4. Google TV
- **Pantalla de protección** tras 10 min sin actividad en pausa.
- **Búsqueda por voz** con el micrófono del mando (solo dentro de la lista blanca).
- **Revisión con el simulador** de todas las pantallas para detectar foco perdido.

## 5. Calidad y mantenimiento
- **Pruebas automáticas del flujo de PIN** (salir del panel y volver con Atrás siempre pide PIN).
- **Detección de vídeos eliminados o privados** en YouTube para quitarlos solos del catálogo.
- **Ocultar "Cuentas vinculadas"** cuando la cuenta no tenga correos vinculados.

## Detalles técnicos
- Horarios, descansos y aviso previo: nuevos campos en la configuración del perfil + comprobación en el servidor junto a `recordWatchTick`.
- "Pedir más tiempo" reutiliza `screen_time_alerts`.
- Push: Capacitor Push Notifications + Firebase (requiere nueva versión de la app).
- Continuar viendo: guardar posición en el historial cada tick.
