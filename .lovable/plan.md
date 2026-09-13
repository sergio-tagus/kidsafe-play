# Acceso restringido: "Consumo API" solo para el superusuario

Objetivo: que la sección "Consumo API" sea visible y ejecutable únicamente por la cuenta `sergio.g.p.monteiro@gmail.com`. El resto de usuarios no la verán en el menú, no podrán abrir la página aunque escriban la dirección, y las peticiones de datos serán rechazadas en el servidor.

## Qué cambia

1. **Sistema de roles**: se crea una tabla de roles de usuario (separada del perfil, por seguridad) con el rol `superadmin`, asignado a la cuenta indicada.
2. **Menú de padres**: la entrada "Consumo API" solo aparece si la cuenta actual es superusuario (en escritorio y en la barra móvil).
3. **Página `/parent/api-usage`**: si un usuario no autorizado entra directamente por URL, se le redirige al panel de padres.
4. **Servidor**: todas las funciones de consumo de API (resumen, por canal, historial de sincronizaciones, guardar cuota) exigen el rol de superusuario; sin él devuelven error.

Nota: el registro del consumo de la API sigue funcionando igual para todos; solo se restringe la visualización y la configuración de la cuota.

## Detalles técnicos

**Migración (una sola)**
- `create type public.app_role as enum ('superadmin')`.
- Tabla `public.user_roles` (`id`, `user_id` → `auth.users`, `role app_role`, único `(user_id, role)`).
- `grant select on public.user_roles to authenticated; grant all to service_role;` + RLS activada, política de SELECT propia (`auth.uid() = user_id`); sin políticas de escritura para clientes.
- Función `public.has_role(_user_id uuid, _role app_role)` `security definer`, `stable`, `set search_path = public`.
- INSERT del rol `superadmin` seleccionando el `id` de `auth.users` cuyo email es `sergio.g.p.monteiro@gmail.com` (`on conflict do nothing`). Si esa cuenta aún no existe en la base de datos, la migración no insertará nada; en ese caso se añade el rol tras su primer inicio de sesión.

**Servidor**
- Nuevo `src/lib/require-superadmin.ts`: middleware `requireSuperAdmin` encadenado tras `requireSupabaseAuth`, que llama a `has_role(context.userId, 'superadmin')` vía `context.supabase.rpc` y lanza error si es falso.
- `src/lib/api-usage.functions.ts`: `getApiUsageSummary`, `getApiUsageByChannel`, `listSyncRuns` y `setQuotaSettings` pasan a usar `requireSuperAdmin` (en `setQuotaSettings` se mantiene además el desbloqueo por PIN).
- Nueva función pública `isSuperAdmin()` (con `requireSupabaseAuth`) que devuelve `{ isSuperAdmin: boolean }` para la UI.

**Cliente**
- Nuevo hook/consulta `useIsSuperAdmin()` (react-query, clave `["is-superadmin"]`) sobre `isSuperAdmin()`.
- `src/components/parent-shell.tsx`: se filtra la entrada "Consumo API" del array `nav` cuando el hook devuelve falso.
- `src/routes/_authenticated/parent/api-usage.tsx`: mientras carga el rol muestra un estado vacío; si no es superusuario, redirige a `/parent` con `navigate({ to: "/parent", replace: true })`.
