# Tasks

## 1. Persistencia

- [x] 1.1 Añadir el modelo Sala en una migración nueva, sin editar `20261014015041_init` ni los modelos Usuario y Sesion, y verificar que la tabla Sala y los índices únicos de código y código normalizado existen mientras las tablas de autenticación siguen iguales
- [x] 1.2 Verificar en esa migración que la descripción puede quedar ausente, que el estado inicial es activa y que Sala no tiene relación con Usuario

## 2. Alta, edición y estado

- [x] 2.1 Implementar la validación compartida y la creación solo para un Administrador, con nombre de hasta 100 caracteres, código de hasta 20, ubicación de hasta 120, descripción de hasta 500 y capacidad entera mayor o igual que 1, y verificar con Playwright el alta de una sala activa, la descripción vacía, los valores en el máximo permitido, el rechazo por encima de ese máximo, el rechazo de nombre, código o ubicación en blanco, el rechazo de una capacidad inválida y el rechazo de un código duplicado aunque solo cambien las mayúsculas
- [x] 2.2 Implementar la edición de nombre, código, ubicación, capacidad y descripción sin cambiar el estado, y verificar con Playwright la edición aceptada, el borrado de la descripción, la conservación del código de la propia sala y el rechazo cuando el código choca con otra sala
- [x] 2.3 Implementar activar y desactivar sin borrar la fila, y verificar con Playwright que la sala queda inactiva, el Administrador sigue viéndola, vuelve a activa y el registro no desaparece

## 3. Consulta y acceso

- [x] 3.1 Implementar `/salas` con el listado filtrado en el servidor, ordenado por nombre sin distinguir mayúsculas, y verificar con Playwright que el Administrador ve activas e inactivas, que Estudiante y Profesor ven solo activas, que un catálogo sin salas visibles no inventa datos y que abrir `/salas` sin sesión redirige a `/ingreso`
- [x] 3.2 Ocultar los controles de escritura a Estudiante y Profesor y rechazar en el servidor las peticiones directas, incluidas las que afirman ser Administrador, y verificar con Playwright que un anónimo, un Estudiante y un Profesor no modifican salas

## 4. Comprobación de conjunto

- [x] 4.1 Ejecutar la compilación, el análisis de código y la suite completa de Playwright, y verificar que pasan las pruebas nuevas de salas y las nueve pruebas de autenticación ya existentes

## Workflow follow-up

- Archivar el cambio cuando la implementación esté aceptada, para copiar la especificación a `openspec/specs/room-management/`.
