# Tasks

## 1. Navegación

- [x] 1.1 Renderizar la navegación desde `getSessionUser`, con el menú público, el de Estudiante y Profesor, el de Administrador, el correo y el cierre de sesión existente, y un fallback que solo muestra Inicio, y verificar en `tests/e2e/navigation.spec.ts` cada menú, que un `?rol=ADMINISTRADOR` no muestra Roles a un estudiante y que al cerrar sesión vuelve el menú público
- [x] 1.2 Mantener la redirección actual de `/salas`, `/reservas` y `/admin/roles` sin sesión, y verificar en ese spec que la URL termina en ingreso y que no aparece el contenido protegido

## 2. Portada y presentación

- [x] 2.1 Mostrar al visitante la presentación de espacios de estudio, con Ingresar y Crear cuenta también en una pantalla estrecha, y a la sesión solo los accesos de su rol, y verificarlo en el spec E2E
- [x] 2.2 Aplicar el tratamiento visual de libre, ocupada, cancelación y actividad sin cambiar los textos que las pruebas ya reconocen, y verificar que `npm run test:e2e` sigue encontrando Activa, Libre, Ocupada y CANCELADA

## 3. Cierre

- [x] 3.1 Ejecutar `npm run lint`, `npm run build`, `npm run test:unit` y `npm run test:e2e` con `BOOKINGAPP_E2E_DATABASE_URL` fuera de `prisma/`, más `openspec validate navegacion-por-sesion --strict`, y verificar que todos terminan sin errores
- [x] 3.2 Revisar `git diff --check` y que no cambien `prisma/migrations`, `prisma/dev.db` ni `prisma/e2e.db`

## Workflow follow-up

- Sincronizar las especificaciones y archivar `navegacion-por-sesion` solo si el grupo 3 pasa.
- No crear un commit ni hacer push.
