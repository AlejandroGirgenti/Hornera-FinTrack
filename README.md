# FinTrack

Dashboard de finanzas personales: registrá ingresos y gastos en pesos y dólares, organizalos por categorías, fijá presupuestos mensuales y mirá hacia dónde va tu dinero.

> **Estado del proyecto:** base del monorepo + API con autenticación completa (registro, login, refresh token rotativo, logout). Siguiente: categorías, transacciones y reportes. La especificación completa está en el documento de proyecto (Word).

**Stack:** React + Vite + TypeScript (próximamente) · Node.js + Express 5 · PostgreSQL + Prisma 6 · Zod · Vitest + Supertest · pnpm workspaces · GitHub Actions

## Requisitos

- Node.js 22 o superior
- pnpm 10 (`corepack enable` lo activa)
- Docker (para PostgreSQL local)

## Primeros pasos

```bash
# 1. Instalar dependencias (solo la primera vez: resuelve versiones y genera pnpm-lock.yaml)
bash scripts/install-deps.sh

# 2. Variables de entorno de la API
cp apps/api/.env.example apps/api/.env      # y cambiá JWT_ACCESS_SECRET

# 3. Base de datos y migración inicial
pnpm db:up
pnpm db:migrate --name init                 # crea y aplica la migración; commiteá apps/api/prisma/migrations

# 4. Datos de ejemplo (usuario demo con 6 meses de movimientos)
pnpm db:seed

# 5. Levantar la API
pnpm dev:api                                # http://localhost:3000/health
```

Después del primer paso, el resto del equipo (o vos en otra máquina) solo necesita `pnpm install`.

Antes del primer commit, dejá el código con el formato del proyecto y verificá que todo esté en verde:

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm test
```

**Usuario demo:** `demo@fintrack.dev` / `Demo1234`

## Probar la autenticación con curl

```bash
# Registro (guarda la cookie del refresh token en cookies.txt)
curl -i -c cookies.txt -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ana Pérez","email":"ana@example.com","password":"Segura123"}'

# Usuario autenticado (reemplazá TOKEN por el accessToken recibido)
curl http://localhost:3000/api/v1/auth/me -H 'Authorization: Bearer TOKEN'

# Renovar la sesión: usa la cookie y la rota (la anterior queda revocada)
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/v1/auth/refresh

# Cerrar sesión
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/v1/auth/logout
```

## Scripts

| Comando                                 | Qué hace                                         |
| --------------------------------------- | ------------------------------------------------ |
| `pnpm dev:api`                          | API en modo desarrollo con recarga automática    |
| `pnpm build`                            | Compila todos los paquetes                       |
| `pnpm test`                             | Tests de todos los paquetes                      |
| `pnpm lint` / `pnpm format`             | ESLint / Prettier                                |
| `pnpm typecheck`                        | Chequeo de tipos en todo el monorepo             |
| `pnpm db:up` / `pnpm db:down`           | Levanta / baja PostgreSQL con Docker             |
| `pnpm db:migrate`                       | Crea y aplica migraciones de Prisma (desarrollo) |
| `pnpm db:seed`                          | Carga el usuario demo y sus datos                |
| `pnpm --filter @fintrack/api db:studio` | Explorador visual de la base                     |

## Tests

- **Unitarios** (no necesitan base): hash de contraseñas, tokens, esquemas compartidos.
- **Integración** (`apps/api/tests`): recorren la API completa contra PostgreSQL real. Si la base no responde, se omiten con un aviso.

Para correr los de integración en local, aplicá las migraciones a la base de test (la crea Docker la primera vez):

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fintrack_test \
  pnpm --filter @fintrack/api exec prisma migrate deploy
pnpm test
```

> Si el volumen de Docker ya existía antes de agregar `docker/init-test-db.sql`, creá la base a mano:
> `docker exec fintrack-db psql -U postgres -c "CREATE DATABASE fintrack_test"`.

## Estructura

```
fintrack/
├── apps/
│   └── api/                    # Express + Prisma
│       ├── prisma/             # schema, migraciones y seed
│       ├── src/
│       │   ├── config/         # variables de entorno validadas con Zod
│       │   ├── lib/            # prisma, logger, errores
│       │   ├── middlewares/    # auth, validación, errores, rate limit, logs
│       │   ├── modules/auth/   # router → controller → service
│       │   ├── app.ts          # arma Express (sin escuchar, testeable)
│       │   └── server.ts       # arranque y apagado ordenado
│       └── tests/              # integración con Supertest
├── packages/
│   └── shared/                 # esquemas Zod y tipos compartidos con el frontend
├── docker/                     # inicialización de la base de test
├── scripts/install-deps.sh
└── .github/workflows/ci.yml
```

## Cómo funciona la autenticación

1. `register` / `login` devuelven un **access token** JWT (15 min) en el cuerpo y un **refresh token** en una cookie `httpOnly`.
2. El frontend guarda el access token **solo en memoria** y lo envía como `Authorization: Bearer`.
3. Cuando vence, el frontend llama a `POST /auth/refresh`: el refresh token **rota** (el anterior se revoca).
4. En la base solo se guarda el **hash SHA-256** del refresh token.
5. Si se presenta un refresh token ya revocado, se asume robo y se **revocan todas las sesiones** del usuario.
6. Login y registro tienen rate limiting (solo cuentan los intentos fallidos) y el login tarda lo mismo exista o no el email.

**Para el frontend:** serializá las llamadas a `/auth/refresh` (una sola en vuelo a la vez). Si dos pestañas o dos peticiones lo usan al mismo tiempo, la segunda se interpreta como reutilización y cierra la sesión.

**Cookies en producción:** si el frontend y la API están en dominios distintos, la cookie usa `SameSite=None; Secure` (se activa sola con `NODE_ENV=production`) y `CORS_ORIGIN` debe contener el dominio exacto del frontend. Probá el login ya desplegado en los primeros días.

## Decisiones técnicas

- **scrypt (`node:crypto`) en lugar de argon2:** es memory-hard y recomendado por OWASP, y no requiere compilar módulos nativos, lo que simplifica el despliegue en hostings gratuitos. Los parámetros viajan dentro del hash, así que se pueden endurecer sin invalidar los existentes. Si preferís argon2id, solo cambia `password.ts`.
- **`app.ts` separado de `server.ts`:** permite testear la API con Supertest sin abrir un puerto.
- **Esquemas Zod compartidos** (`packages/shared`): una única fuente de verdad para validar en el servidor y en los formularios.
- **Bundle con tsup:** el paquete compartido se publica como TypeScript y se incluye en el build de la API.

## Próximos pasos

1. Módulo `categories` (CRUD) y test de aislamiento: un usuario no puede ver ni modificar datos de otro.
2. Módulo `transactions` con filtros, paginación y borrado lógico.
3. `reports`: resumen, gasto por categoría y evolución mensual (agregaciones en la base).
4. `budgets` y conversión ARS/USD.
5. `apps/web` con React + Vite + TanStack Query.
