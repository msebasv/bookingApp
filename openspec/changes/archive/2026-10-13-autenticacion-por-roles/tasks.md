# Tasks

## 1. Persistencia

- [x] 1.1 Añadir Prisma, el cliente SQLite y bcrypt, y verificar que la instalación termina sin error
- [x] 1.2 Definir los modelos Usuario y Sesion, aplicar la migración sobre un archivo SQLite vacío y verificar que ambas tablas existen
- [x] 1.3 Excluir el archivo SQLite del repositorio y dejar un ejemplo de DATABASE_URL sin credenciales; verificar que el archivo real no queda rastreado por Git

## 2. Registro y contraseña

- [x] 2.1 Implementar el registro público en una Server Action que guarda el correo en minúsculas, rechaza menos de 8 caracteres y solo persiste el hash bcrypt; verificar que la respuesta no contiene la contraseña
- [x] 2.2 Cubrir con Playwright el registro aceptado, el correo duplicado y la contraseña corta, y verificar que solo el caso aceptado permite iniciar sesión
- [x] 2.3 Verificar en la base de prueba que el valor guardado es distinto de la contraseña enviada

## 3. Sesión

- [x] 3.1 Implementar el inicio de sesión que crea una fila Sesion de 12 horas y una cookie httpOnly con solo su identificador, y verificar con Playwright que las credenciales válidas abren sesión y las inválidas no crean fila ni cookie
- [x] 3.2 Implementar el cierre de sesión que borra la fila y la cookie, y verificar con Playwright que esa sesión ya no autoriza una operación protegida
- [x] 3.3 Verificar que la creación de la cuenta y la expiración de la sesión se interpretan en America/Bogota, no en la zona local de la máquina
- [x] 3.4 Verificar con Playwright que una sesión de menos de 12 horas sigue autorizando y que, pasadas 12 horas en America/Bogota, la misma sesión es rechazada

## 4. Roles y acceso no autorizado

- [x] 4.1 Implementar el script de inicialización que crea un Administrador solo si no existe ninguno, y verificar que una segunda ejecución no crea otro
- [x] 4.2 Verificar con Playwright que el registro público deja el rol Estudiante aunque la petición pida Administrador o Profesor
- [x] 4.3 Verificar con Playwright que un usuario autenticado no puede cambiar su propio rol y que el rol almacenado no cambia
- [x] 4.4 Verificar con Playwright que el Administrador puede asignar Profesor o Estudiante a otra cuenta y que asignar Administrador es rechazado
- [x] 4.5 Verificar con Playwright el acceso anónimo, el Estudiante que pide la operación de administrador y el Estudiante que envía un rol privilegiado: los tres son rechazados y no modifican datos

## 5. Comprobación de conjunto

- [x] 5.1 Ejecutar la suite Playwright con un solo trabajador y una base vacía, y verificar que pasan los escenarios de user-auth y role-authorization

## Workflow follow-up

- Revisar los artefactos y, cuando se pida implementación, usar el flujo de apply. No archivar este cambio hasta que esa implementación esté aceptada.
