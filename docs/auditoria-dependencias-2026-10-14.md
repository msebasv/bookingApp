# Auditoría de dependencias npm — BookingApp

- **Fecha de auditoría:** 2026-10-14
- **Incidencia:** KAN-37 — Auditar y remediar hallazgos de seguridad de dependencias npm
- **Repositorio y rama base:** msebasv/bookingApp, main
- **Commit revisado:** c9dbb8a28b8b284b7a9f42107db411ebf3317370
- **Alcance de esta contribución:** documentación de resultados. No se actualizaron dependencias ni código de la aplicación.

## Resumen

La ejecución actual de npm audit reporta **8 hallazgos de severidad alta** en el árbol completo. npm audit --omit=dev reporta **3 altos**. Los avisos se agrupan en dos cadenas transitivas:

- braces 3.0.3, dentro de las dependencias de eslint-config-next y herramientas de glob.
- deepmerge-ts 7.1.5, dentro de la dependencia Prisma CLI, que está declarada en dependencies.

Los avisos describen riesgos de agotamiento de pila ante patrones u objetos recursivos especialmente construidos. La auditoría no demuestra que esos caminos sean alcanzables con entradas controladas por usuarios en BookingApp; por tanto, no se declara una vulnerabilidad explotable en la aplicación.

npm audit fix --force no es una remediación aceptable sin evaluación: propone instalar eslint-config-next 14.2.35 y Prisma 6.12.0, en lugar de las versiones actuales 16.4.0 y 6.19.3. Esos downgrades pueden ser incompatibles con el proyecto.

## Entorno y método

La auditoría se realizó en una copia aislada del repositorio, con Node.js 24.16.0 y npm 11.13.0. npm ci había completado correctamente. Se ejecutaron npm audit y npm audit --omit=dev el 2026-10-14. Ambos finalizaron con código 1 porque encontraron hallazgos de seguridad; el acceso al registro npm estaba disponible en esta repetición.

La instalación observada fue:

- braces 3.0.3 ← micromatch 4.0.8 ← fast-glob 3.3.1 ← @next/eslint-plugin-next 16.4.0 ← eslint-config-next 16.4.0.
- deepmerge-ts 7.1.5 ← @prisma/config 6.19.3 ← prisma 6.19.3.

El número que muestra npm es el total agregado de hallazgos por severidad; no equivale a ocho paquetes afectados ni a ocho vulnerabilidades distintas.

## Hallazgos

### 1. braces — severidad alta

**Cadena observada:** eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces.

El aviso GHSA-vfj7-8cjw-p6xm describe agotamiento de pila ante patrones profundamente anidados. npm incluye esta cadena en la auditoría completa, pero no en la salida de npm audit --omit=dev. El riesgo se clasifica como dependiente de la cadena de herramientas de desarrollo; no se verificó si BookingApp procesa patrones controlados por terceros que alcancen el caso vulnerable.

La corrección automática propuesta por npm degrada eslint-config-next a 14.2.35. No aplicar esa degradación sin revisar compatibilidad con Next.js 16.

Referencia: [GitHub Security Advisory GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

### 2. deepmerge-ts — severidad alta

**Cadena observada:** prisma → @prisma/config → deepmerge-ts.

El aviso GHSA-ggr8-5vv4-36mx describe agotamiento de pila al combinar grafos de objetos recursivos. npm audit --omit=dev sigue informando 3 hallazgos altos por esta cadena. Prisma CLI figura en dependencies del proyecto, por lo que esta dependencia también aparece al omitir dependencias de desarrollo.

El aviso de GitHub marca deepmerge-ts 8.0.0 como versión corregida. Antes de aplicar un override o actualizar la cadena, se debe verificar que sea compatible con la versión de Prisma utilizada. La corrección automática propuesta por npm degrada Prisma a 6.12.0; no aplicar ese cambio sin revisar compatibilidad.

Referencia: [GitHub Security Advisory GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx).

## Resultado actual de npm audit

| Comando | Resultado observado el 2026-10-14 |
|---|---|
| npm audit | 8 hallazgos altos: cadenas de braces y deepmerge-ts. |
| npm audit --omit=dev | 3 hallazgos altos: cadena de deepmerge-ts. |
| npm audit fix --force | No ejecutado. npm propone degradar eslint-config-next a 14.2.35 y Prisma a 6.12.0. |

No se modificaron package.json ni package-lock.json durante esta auditoría.

## Plan de remediación propuesto

1. Revisar la disponibilidad de actualizaciones compatibles en las cadenas de eslint-config-next y Prisma; registrar las versiones elegidas y por qué conservan compatibilidad con Next.js 16 y Prisma 6.19.
2. Resolver braces sin degradar eslint-config-next. Si no hay actualización compatible, investigar reemplazo o mitigación de la dependencia transitiva y dejar documentada cualquier excepción residual.
3. Resolver deepmerge-ts mediante una versión compatible de Prisma o un override validado con las restricciones del árbol. No asumir que un override es seguro solo porque el advisory marca 8.0.0 como corregida.
4. Actualizar el lockfile de forma reproducible y comparar npm audit con npm audit --omit=dev antes y después.
5. Volver a ejecutar lint, TypeScript, pruebas unitarias, build y E2E. No declarar la remediación completa si alguna verificación no se ejecutó; registrar explícitamente los bloqueos de entorno.

## Verificaciones funcionales y limitaciones

En la auditoría de calidad sobre el mismo commit se obtuvo:

- npm run lint: pasó.
- npm run test:unit: pasaron 28 pruebas de 28.
- npx tsc --noEmit: pasó.
- npm run build: no completó. Turbopack no pudo crear un junction para Prisma dentro de .next; Windows devolvió Acceso denegado (os error 5). Un intento alternativo con webpack terminó con un error genérico de compilación.
- npm run test:e2e: Playwright descubrió 38 casos, pero no ejecutó ninguno porque no había un build de producción disponible para arrancar el servidor.

Chromium estaba instalado. E2E se intentó con una SQLite temporal externa al directorio prisma y sin datos reales. La compilación pendiente impide considerar validado el flujo E2E.

## Trazabilidad y autoría

Este documento registra una auditoría técnica realizada sobre el commit indicado y no atribuye el código existente ni el trabajo previo a la persona que presenta esta contribución. La rama y el pull request contienen documentación nueva; no incluyen cambios de aplicación ni de dependencias.
