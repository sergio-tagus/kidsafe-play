# Impersonar usuario (solo Super Administrador)

Permite al superadministrador ver y usar la aplicación exactamente como cualquier otro usuario, y volver a su propia cuenta con un clic, sin volver a iniciar sesión.

## Qué verá el usuario

1. **Nueva opción en el menú de padres: "Impersonar usuario"**, visible únicamente para el superadministrador. Si otro usuario entra por URL directa, se le redirige al panel de padres.
2. **Buscador de usuarios**: campo único que busca por nombre, apellidos o correo. Resultados en lista con nombre, correo y avatar, y botón "Impersonar".
3. **Sesión de impersonación**: la aplicación se recarga mostrando todo tal cual lo ve ese usuario (sus hijos, sus canales, sus categorías, sus ajustes y sus permisos; las funciones de superadministrador quedan ocultas porque el usuario impersonado no tiene ese rol).
4. **Banner permanente arriba del todo**: "Estás impersonando a: Nombre Apellido (correo)" con un botón "Finalizar impersonación". El banner se ve en todas las pantallas, incluida la zona infantil.
5. **Finalizar**: restaura la sesión original del superadministrador al instante, sin pedir credenciales, y vuelve al buscador de usuarios.

## Decisiones de comportamiento

- La impersonación es **completa** (no de solo lectura): el objetivo es validar la experiencia real, así que las acciones que haga el superadministrador se guardan como si fueran del usuario. El banner rojo deja claro en todo momento que no es la cuenta propia.
- El PIN parental del usuario impersonado no se pide: al entrar en impersonación se considera desbloqueado durante esa sesión, para poder revisar el panel.
- Cada inicio y fin de impersonación queda registrado (quién, a quién, cuándo).

## Detalles técnicos

**Base de datos**
- Nueva tabla `impersonation_logs` (actor_user_id, target_user_id, started_at, ended_at) con RLS: solo lectura/escritura para quien tenga rol `superadmin`; GRANT a `authenticated` y `service_role`.
- Función de búsqueda `search_users(term)` SECURITY DEFINER que consulta `public.profiles` (nombre/email) y devuelve como máximo 20 filas; aborta con "Forbidden" si el llamante no es `superadmin` (`has_role`).

**Servidor** (`src/lib/impersonation.functions.ts`)
- `searchUsers({ term })` — middleware `requireSuperAdmin`, llama a la RPC anterior.
- `startImpersonation({ userId })` — middleware `requireSuperAdmin`; carga `supabaseAdmin` dentro del handler, genera un enlace mágico con `auth.admin.generateLink({ type: 'magiclink', email })`, registra el log y devuelve solo el `token_hash` y los datos públicos del usuario objetivo. Nunca devuelve claves de servicio.
- `endImpersonation({ logId })` — cierra el registro.

**Cliente**
- `src/lib/impersonation.tsx`: contexto que guarda en `localStorage` los tokens de la sesión original del superadministrador (clave `safetube.impersonation`) junto con el objetivo y el `logId`.
  - Iniciar: guardar sesión actual → `supabase.auth.verifyOtp({ type: 'magiclink', token_hash })` → marcar PIN desbloqueado → `router.invalidate()` + limpiar caché de consultas → navegar a `/parent`.
  - Finalizar: `supabase.auth.setSession(tokensOriginales)` → borrar la marca → limpiar caché → volver a `/parent/impersonate`.
  - Se monta dentro de `SessionProvider` en `__root.tsx`.
- `src/components/impersonation-banner.tsx`: barra fija superior (color destacado, `z-50`, respeta el safe-area) renderizada en la raíz; añade padding superior al contenido cuando está activa.
- `src/routes/_authenticated/parent/impersonate.tsx`: buscador con debounce y lista de resultados; entrada nueva en la barra lateral de `parent-shell.tsx` condicionada a `useIsSuperAdmin()`.
- `src/lib/session.tsx`: no llamar a `touchActivity()` cuando la sesión proviene de una impersonación, para no falsear la actividad del usuario.
- Textos en español, inglés y portugués en `src/lib/i18n.tsx`.

## Limitación conocida

La impersonación usa el correo del usuario objetivo para crear su sesión, por lo que solo funciona con cuentas que tengan correo en la plataforma (todas las actuales lo tienen).
