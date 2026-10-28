# Documentación técnica

Detalles de Hornera FinTrack para quien quiera correrlo, entender el código o desplegarlo. Para una presentación general del proyecto, volvé al [README](../README.md).

## Variables de entorno

**API** (`apps/api/.env`, hay un ejemplo comentado en `.env.example`):

| Variable                       | Para qué sirve                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                 | Conexión a PostgreSQL                                                                                         |
| `JWT_ACCESS_SECRET`            | Secreto para firmar los tokens (mínimo 32 caracteres)                                                         |
| `ACCESS_TOKEN_TTL_MINUTES`     | Duración del token de acceso (15 por defecto)                                                                 |
| `REFRESH_TOKEN_TTL_DAYS`       | Duración de la sesión (7 por defecto)                                                                         |
| `CORS_ORIGIN`                  | Dominio(s) de la web permitidos, separados por coma                                                           |
| `APP_URL`                      | Dirección pública de la web, usada en los enlaces de los correos (por defecto, el primer `CORS_ORIGIN`)       |
| `RESEND_API_KEY` y `MAIL_FROM` | Envío de correos con [Resend](https://resend.com). Sin clave, los correos se muestran en la consola de la API |

**Web** (`apps/web/.env`): `VITE_API_URL` solo hace falta en producción cuando la web y la API están en dominios distintos.

## Scripts

| Comando                                 | Qué hace                                         |
| --------------------------------------- | ------------------------------------------------ |
| `pnpm dev:api` / `pnpm dev:web`         | API / web en modo desarrollo con recarga         |
| `pnpm build`                            | Compila todos los paquetes                       |
| `pnpm test`                             | Tests de todos los paquetes                      |
| `pnpm lint` / `pnpm format`             | ESLint / Prettier                                |
| `pnpm typecheck`                        | Chequeo de tipos en todo el monorepo             |
| `pnpm db:up` / `pnpm db:down`           | Levanta / baja PostgreSQL con Docker             |
| `pnpm db:migrate`                       | Crea y aplica migraciones de Prisma (desarrollo) |
| `pnpm db:seed`                          | Carga el usuario demo y sus datos                |
| `pnpm --filter @fintrack/api db:studio` | Explorador visual de la base                     |

## Tests

- **Unitarios** (no necesitan base): hash de contraseñas, tokens, esquemas compartidos, cálculo de presupuestos, formatos y lógica de la web.
- **Integración** (`apps/api/tests`): recorren la API completa contra PostgreSQL real, incluido el aislamiento entre usuarios. Si la base no responde, se omiten con un aviso.

Para correr los de integración en local, aplicá las migraciones a la base de test (la crea Docker la primera vez):

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fintrack_test \
  pnpm --filter @fintrack/api exec prisma migrate deploy
pnpm test
```

> Si el volumen de Docker ya existía antes de agregar `docker/init-test-db.sql`, creá la base a mano:
> `docker exec fintrack-db psql -U postgres -c "CREATE DATABASE fintrack_test"`.

El CI (GitHub Actions) corre lint, formato, tipos, migraciones, tests y build con una base PostgreSQL real en cada push.

## Estructura

```
fintrack/
├── apps/
│   ├── api/                    # Express + Prisma
│   │   ├── prisma/             # schema, migraciones y seed
│   │   ├── src/
│   │   │   ├── config/         # variables de entorno validadas con Zod
│   │   │   ├── lib/            # prisma, logger, errores
│   │   │   ├── middlewares/    # auth, validación, errores, rate limit, logs
│   │   │   ├── modules/        # auth, categories, transactions, reports,
│   │   │   │                   # budgets, exchange-rates (router → controller → service)
│   │   │   ├── app.ts          # arma Express (sin escuchar, testeable)
│   │   │   └── server.ts       # arranque y apagado ordenado
│   │   └── tests/              # integración con Supertest
│   └── web/                    # React + Vite
│       └── src/
│           ├── app/            # rutas y layout
│           ├── components/     # piezas de interfaz reutilizables
│           ├── features/       # auth, dashboard, transactions, categories,
│           │                   # budgets, settings
│           └── lib/            # cliente HTTP, formatos, fechas
├── packages/
│   └── shared/                 # esquemas Zod, tipos y reglas compartidas con la web
├── docker/                     # inicialización de la base de test
└── .github/workflows/ci.yml
```

## API

Todas las rutas cuelgan de `/api/v1` y, salvo las de registro, login, refresh, logout y recuperación de contraseña, requieren sesión.

| Recurso               | Qué ofrece                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/auth`               | Registro, login, refresh, logout, perfil, contraseña, correo, borrado de cuenta y recuperación de contraseña |
| `/categories`         | Listar, crear, editar y borrar categorías                                                                    |
| `/transactions`       | CRUD con filtros y paginación, y `/export` a CSV o Excel                                                     |
| `/budgets`            | Ver el mes (`GET`), fijar (`PUT`) o quitar (`DELETE`) un límite y copiar del mes anterior (`POST /copy`)     |
| `/reports`            | Resumen, gastos por categoría y evolución mensual                                                            |
| `/exchange-rates/usd` | Cotización del dólar según el tipo elegido                                                                   |

Las respuestas exitosas llegan como `{ "data": … }` y los errores como `{ "error": { "code", "message", "details" } }`.

## Cómo funciona la autenticación

1. `register` / `login` devuelven un **access token** JWT (15 min) en el cuerpo y un **refresh token** en una cookie `httpOnly`.
2. La web guarda el access token **solo en memoria** y lo envía como `Authorization: Bearer`.
3. Cuando vence, la web llama a `POST /auth/refresh`: el refresh token **rota** (el anterior se revoca). Las renovaciones simultáneas comparten una sola llamada.
4. En la base solo se guarda el **hash SHA-256** del refresh token.
5. Si se presenta un refresh token ya revocado, se asume robo y se **revocan todas las sesiones** del usuario.
6. Login y registro tienen rate limiting (solo cuentan los intentos fallidos) y el login tarda lo mismo exista o no el email.
7. La recuperación de contraseña nunca revela si un correo está registrado; el enlace es de un solo uso, vence en 1 hora y solo se guarda su hash.

**Cookies en producción:** si la web y la API están en dominios distintos, la cookie usa `SameSite=None; Secure` (se activa sola con `NODE_ENV=production`) y `CORS_ORIGIN` debe contener el dominio exacto de la web.

## Decisiones técnicas

- **Dinero como decimales exactos:** los montos se guardan como `Decimal` en la base y viajan como texto con dos decimales; las comparaciones de presupuestos se hacen en centavos enteros para evitar errores de redondeo.
- **Moneda base y cotización por movimiento:** cada movimiento guarda su cotización y su equivalente en la moneda base, así los reportes no cambian cuando varía el dólar. Por eso la moneda base no se puede cambiar mientras haya movimientos.
- **Presupuestos por mes:** el mes se guarda como fecha del día 1. Lo gastado se calcula siempre en la moneda base, por la fecha del movimiento y sin contar los borrados.
- **Borrado lógico de movimientos**, y borrado de cuenta que elimina todo en un orden explícito.
- **scrypt (`node:crypto`) en lugar de argon2:** es memory-hard y recomendado por OWASP, y no requiere compilar módulos nativos, lo que simplifica el despliegue en hostings gratuitos. Los parámetros viajan dentro del hash, así que se pueden endurecer sin invalidar los existentes.
- **`app.ts` separado de `server.ts`:** permite testear la API con Supertest sin abrir un puerto.
- **Esquemas Zod compartidos** (`packages/shared`): una única fuente de verdad para validar en el servidor y en los formularios.
- **Bundle con tsup:** el paquete compartido se publica como TypeScript y se incluye en el build de la API.
- **Identidad visual con variables CSS:** el color de acento es una escala generada a partir de una sola variable, por eso cada usuario puede elegir el suyo.

## Próximos pasos

- Publicar la API, la web y la base de datos, con envío de correo real.
- Movimientos recurrentes y metas de ahorro.
