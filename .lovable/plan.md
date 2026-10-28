# Recuperar las categorías "Manualidades" y "Animales"

## Qué ha pasado
- "Manualidades" no se ha borrado: sigue guardada y tiene 9 canales asignados.
- Desaparece porque se creó sin dueño y no está marcada como categoría estándar.
- Con la corrección de seguridad reciente, cada familia solo ve las categorías estándar y las suyas propias. Una categoría sin dueño ya no la ve nadie.
- A "Animales" le pasa lo mismo (3 canales). "Cocina" y "Origami" tienen dueño y se ven bien.

## Arreglo
1. Asignar "Manualidades" y "Animales" a la cuenta que creó "Cocina" y "Origami" (tu cuenta), para que vuelvan a verse con sus canales.
2. Cuando se crea una categoría nueva, guardar siempre quién la crea, para que esto no vuelva a pasar.
3. Comprobar en la página de Categorías que aparecen las dos con su número real de canales.

## Detalles técnicos
- Migración: `update categories set created_by = '36dc8bd8-…' where id in (manualities, animals) and created_by is null`.
- Revisar la función que crea categorías para que rellene `created_by` con `userId`; si falta, añadir default `auth.uid()` en la columna.
- La política de lectura (`is_default OR created_by = auth.uid()`) no cambia.
