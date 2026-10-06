# Vincular una segunda cuenta de Google a la cuenta principal

## Qué verá el usuario
- En el panel de padres, nueva sección **"Cuentas vinculadas"** (en Ajustes/menú de padres, protegida por PIN).
- Escribe el email de la otra cuenta de Google y pulsa "Vincular". Aparece en la lista como "Pendiente" hasta el primer acceso, luego "Activa".
- Cuando alguien inicia sesión con Google usando ese email, entra **directamente en la cuenta principal**: mismos hijos, canales, PIN, historial y ajustes. Todo igual (el rol de superadministrador sigue ligado a la cuenta principal, así que también se hereda si la principal lo tiene).
- Se puede desvincular un email en cualquier momento; a partir de ahí ese Google vuelve a ser una cuenta independiente (vacía).
- Pequeño aviso en la cabecera del padre: "Has entrado con: email-secundario@gmail.com".

## Reglas
- Un email solo puede estar vinculado a una cuenta principal.
- No se puede vincular el email de la propia cuenta principal ni el de una cuenta que ya tenga hijos o canales propios (para no perder datos); se muestra un mensaje claro.
- Máximo 3 emails vinculados por cuenta.
- Solo se puede vincular/desvincular desde la cuenta principal (no desde una sesión secundaria).

## Cómo funciona (resumen)
1. El usuario inicia sesión con Google normalmente.
2. Justo después, la app comprueba si ese email está vinculado a otra cuenta.
3. Si lo está, el servidor cambia la sesión a la cuenta principal (mismo mecanismo seguro ya usado para la impersonación) y cierra la sesión secundaria. Se registra el acceso.

## Detalles técnicos
- Migración: tabla `linked_accounts` (`id`, `primary_user_id`, `email` único en minúsculas, `linked_user_id` nullable, `created_at`, `last_used_at`) con GRANTs, RLS: el propietario (`primary_user_id = auth.uid()`) puede ver/insertar/borrar sus filas.
- `src/lib/linked-accounts.functions.ts` (requireSupabaseAuth):
  - `listLinkedAccounts`, `addLinkedAccount` (valida email, límite 3, no propio, no cuenta con datos), `removeLinkedAccount` — exigen PIN desbloqueado y que no sea sesión secundaria.
  - `resolveLinkedLogin`: si el email del usuario actual está en `linked_accounts`, con `supabaseAdmin` genera un magic link del usuario principal y devuelve `token_hash`; el cliente hace `verifyOtp` y queda como principal. Guarda el email secundario en sessionStorage para el aviso.
- `src/lib/session.tsx`: tras `SIGNED_IN`, llamar una vez a `resolveLinkedLogin` antes de navegar (evitar bucles; ignorar durante impersonación).
- Nueva ruta `src/routes/_authenticated/parent/linked-accounts.tsx` + entrada en `parent-shell.tsx`, traducciones es/en/pt.
- Test pequeño de reglas: límite de 3, rechazo de email propio y duplicado.
