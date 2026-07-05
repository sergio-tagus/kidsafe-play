# Plan: PIN parental + recomendador de canales

## 1. PIN parental (4 dígitos)

**Base de datos** (nueva tabla `parent_pins`):
- `user_id` (PK, FK a auth.users)
- `pin_hash` (bcrypt/sha256 con salt)
- `recovery_email` (por defecto el email del usuario)
- RLS: solo el propio padre lee/edita su fila.

**Server functions** (`src/lib/pin.functions.ts`):
- `hasPin()` → boolean, indica si ya está configurado.
- `setPin({ pin })` → hash + guardar. También sirve para cambiarlo.
- `verifyPin({ pin })` → devuelve `{ ok, token }` con un token corto (JWT firmado con `SESSION_SECRET`, exp ~10 min) que el cliente guarda en `sessionStorage`.
- `requestPinReset()` → genera token de 1 uso (15 min), lo guarda en tabla `parent_pin_resets` y envía email vía `sendTransactionalEmail` con enlace a `/parent/reset-pin?token=...`.
- `resetPin({ token, pin })` → valida y actualiza.

**UI**:
- Nueva ruta `/_authenticated/parent/unlock.tsx`: teclado de 4 dígitos, botón "¿Olvidaste tu PIN?" y, si no hay PIN, flujo de creación (introducir + confirmar).
- Nuevo layout `src/routes/_authenticated/parent/route.tsx` con `beforeLoad` que:
  1. Comprueba `sessionStorage.getItem('parent_pin_token')` y su expiración.
  2. Si no hay token válido → `redirect('/parent/unlock')` (con `search.next`).
- Requisito del usuario: pedir PIN cada vez que se entra a `/parent`. El token se borra automáticamente al salir del área de padres (efecto en `parent-shell` que limpia al desmontar por navegación fuera de `/parent`).
- Ruta pública dentro del layout: `/parent/reset-pin` acepta `token` por query y muestra formulario.

**Email**: plantilla nueva `parent-pin-reset.tsx` en `src/lib/email-templates/` con enlace de recuperación. Requiere que el dominio de email esté configurado (si no lo está, se avisa al usuario al pulsar "¿Olvidaste tu PIN?").

**i18n**: claves `pin.title`, `pin.setup`, `pin.confirm`, `pin.wrong`, `pin.forgot`, `pin.emailSent`, `pin.reset.title`, `pin.reset.success` en ES/EN/PT.

## 2. Recomendador de canales (IA)

**Server function** (`src/lib/recommendations.functions.ts`):
- `recommendChannels()` con `requireSupabaseAuth`:
  1. Lee `whitelist_channels` activos del padre (nombre, handle, categoría) + edades de `child_profiles`.
  2. Llama a Lovable AI Gateway (`google/gemini-3-flash-preview`) con salida estructurada (Output.object sin bounds) pidiendo 8 canales similares apropiados: `[{ channel_name, channel_handle, reason, suggested_category }]`.
  3. Filtra los que ya están en la whitelist (por handle/nombre normalizado).
  4. Devuelve la lista + `run_id` para telemetría.
- Prompt en español/inglés según `lang` del cliente (pasado como input).
- Cachea resultado durante 6h en tabla `channel_recommendations_cache` (`user_id`, `payload jsonb`, `generated_at`).
- `approveRecommendation({ channel_handle, category })` → reutiliza `previewChannelFromUrl` con `https://youtube.com/@handle` para validar existencia y traer thumbnail, luego devuelve preview (no importa aún).

**UI en `/parent/whitelist/index.tsx`**:
- Nuevo botón "Recomendar canales" arriba, junto al de añadir.
- Abre un `Dialog` con:
  - Estado loading (spinner + "Analizando tu whitelist con IA…").
  - Lista de tarjetas: nombre, handle, categoría sugerida (badge), razón (1-2 líneas), botón "Ver detalles" y "Descartar".
  - "Ver detalles" abre segundo `Dialog` (preview): thumbnail, subs, videoCount, `Select` de categoría (usa `listCategories`), botón "Aprobar e importar" (llama a `importChannelFromUrl` con el handle) y "Cancelar".
  - Toast al importar; se invalida `["whitelist"]` y se cierra el diálogo.
- Botón "Regenerar" en el header del diálogo (fuerza recomputo saltando caché).

**i18n**: `whitelist.recommend`, `whitelist.recommend.loading`, `whitelist.recommend.reason`, `whitelist.recommend.approve`, `whitelist.recommend.preview`, `whitelist.recommend.regenerate`, `whitelist.recommend.none`.

## 3. Detalles técnicos

- `SESSION_SECRET` para firmar tokens PIN: reutilizar variable existente o crear via `add_secret` si falta.
- Hash del PIN con `bcryptjs` (edge-safe) — instalar dependencia.
- Emails: si no hay dominio configurado, `requestPinReset` devuelve error legible y la UI muestra "Configura el dominio de email en Ajustes" (mensaje traducido).
- Todo el flujo respeta RLS existente y el middleware `requireSupabaseAuth`.

## Fuera de alcance
- Bloqueo por intentos (rate limit) — se puede añadir después.
- Biometría / WebAuthn.
- Aprobación en batch de varias recomendaciones simultáneas.
- Historial de canales descartados.
