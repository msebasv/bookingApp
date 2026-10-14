# BookingApp

BookingApp es una aplicación web para consultar espacios de estudio de una universidad y reservarlos. El objetivo es que estudiantes, profesores y administradores usen el mismo sistema, con una sesión de servidor y permisos distintos según el rol guardado en la base de datos.

## Funcionalidades principales

- Registro público e inicio de sesión con correo y contraseña. La sesión dura 12 horas y se puede cerrar.
- Catálogo de salas, con nombre, código, ubicación, capacidad, descripción y estado activa o inactiva.
- Horario de cada sala, configurado por el administrador.
- Reservas de 60 minutos, de lunes a viernes, en la zona `America/Bogota`, sobre una grilla de 30 minutos y dentro de los 30 días siguientes.
- Consulta del horario antes de reservar y una agenda de franjas libres u ocupadas, sin datos de las reservas de otras personas.
- Listado de reservas próximas, pasadas o canceladas. Una reserva se confirma al crearla, no se edita y solo se cancela antes de su inicio.
- Navegación según la sesión: un visitante ve el ingreso y el registro; una sesión ve las opciones de su rol.

## Roles

Este rol se guarda en el servidor. El registro público siempre crea un estudiante e ignora un rol enviado por el cliente.

| Rol | Qué puede hacer |
| --- | --- |
| Estudiante | Consultar salas activas, ver horarios, reservar y cancelar sus propias reservas, y ver su cuenta. |
| Profesor | Las mismas acciones que un estudiante. No administra salas ni asigna roles. |
| Administrador | Además, crear y editar salas, activarlas o desactivarlas, configurar horarios, ver y cancelar cualquier reserva, y asignar a otro usuario el rol de estudiante o de profesor. |

El administrador no se crea desde el registro público. Solo puede crearse con `npm run admin:init`, y el script no crea un segundo administrador si ya existe uno. Un administrador tampoco puede convertir a otra persona en administrador.

## Tecnologías

- [Next.js](https://nextjs.org) 16.4.0 y React 19
- TypeScript
- Tailwind CSS 4
- Prisma 6 con SQLite
- OpenSpec, en `openspec/specs/`, para las especificaciones de comportamiento
- Playwright, para las pruebas de extremo a extremo

## Requisitos previos

- Node.js 22.6 o posterior, porque `npm run test:unit` usa `--experimental-strip-types`
- npm

## Instalación y variables de entorno

En la raíz del repositorio:

```bash
npm install
```

Copia el ejemplo de entorno. El archivo `.env` no debe subirse al repositorio.

```bash
copy .env.example .env
```

`.env.example` define una sola variable:

```text
DATABASE_URL="file:./dev.db"
```

Prisma resuelve esa ruta SQLite junto a `prisma/schema.prisma`, así que la base local queda en `prisma/dev.db`. Ese archivo está ignorado por Git.

`npm run dev` y la CLI de Prisma leen `.env`. El script `scripts/init-admin.js` no lo carga: recibe `DATABASE_URL`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` desde el entorno del proceso.

## Base de datos y ejecución local

Las migraciones están en `prisma/migrations/`. Para aplicarlas a la base indicada por `DATABASE_URL`:

```bash
npx prisma migrate deploy
```

`npm install` ejecuta el `postinstall` de `@prisma/client`, que genera el cliente. Si cambias `prisma/schema.prisma`, vuelve a generarlo con:

```bash
npx prisma generate
```

Arranca la aplicación en desarrollo:

```bash
npm run dev
```

Ábrela en [http://localhost:3000](http://localhost:3000).

Para servir la compilación de producción, primero construye y después inicia:

```bash
npm run build
npm run start
```

## Lint y pruebas

Lint:

```bash
npm run lint
```

Ejecuta ESLint.

Pruebas unitarias:

```bash
npm run test:unit
```

Ejecuta `tests/unit/reservations.test.ts` y `tests/unit/consultation.test.ts` con el ejecutor de Node.

Pruebas de extremo a extremo:

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

`npm run test:e2e` ejecuta Playwright sobre `tests/e2e`. El proyecto configurado es Chromium. El servidor de pruebas es `npx next start` en el puerto 3100, así que usa la última compilación de `npm run build`.

La base de esas pruebas no es `prisma/dev.db`. Si no defines `BOOKINGAPP_E2E_DATABASE_URL`, la suite usa `file:./e2e.db`, borra `prisma/e2e.db` y aplica las migraciones ahí. Si defines la variable, la ruta tiene que quedar fuera de `prisma/`; `tests/global-setup.ts` se niega a borrar una base dentro de esa carpeta. En PowerShell:

```powershell
$env:BOOKINGAPP_E2E_DATABASE_URL = "file:C:/ruta/temporal/bookingapp-e2e.db"
npm run test:e2e
```

## Usuario administrador

El mecanismo existente es `npm run admin:init`, que ejecuta `scripts/init-admin.js`.

El script exige `ADMIN_EMAIL` y `ADMIN_PASSWORD` en el entorno. El correo debe contener `@`. La contraseña debe tener al menos 8 caracteres. No incluyas esos valores en el repositorio ni en este archivo: elígelos solo en tu máquina.

En PowerShell, desde la raíz del proyecto y con la base ya migrada:

```powershell
$env:DATABASE_URL = "file:./dev.db"
$env:ADMIN_EMAIL = "<correo-del-administrador>"
$env:ADMIN_PASSWORD = "<contraseña-de-al-menos-8-caracteres>"
npm run admin:init
```

Si no existe un administrador, el script imprime `Administrador creado.` Si ya existe uno, imprime `Ya existe un administrador. No se creó otro.` y no inserta otra cuenta. Después entra por `/ingreso` con ese correo y esa contraseña.

## Estructura de carpetas

```text
app/                 páginas: inicio, ingreso, registro, salas, reservas, cuenta y admin/roles
components/          navegación, formularios y presentación compartida
lib/                 autenticación, salas, reservas y cliente de Prisma
prisma/              schema.prisma y migraciones
scripts/             init-admin.js
tests/e2e/           pruebas Playwright
tests/unit/          pruebas de las reglas de reserva y consulta
openspec/specs/      especificaciones vigentes
openspec/changes/    cambios de OpenSpec, incluidos los archivados
public/              archivos estáticos
```
