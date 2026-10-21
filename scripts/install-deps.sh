#!/usr/bin/env bash
# Instala las dependencias del monorepo con las versiones vigentes y genera pnpm-lock.yaml.
# Se ejecuta UNA vez al arrancar el proyecto; después alcanza con `pnpm install`.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Herramientas de desarrollo (raíz)"
pnpm add -Dw typescript eslint @eslint/js typescript-eslint prettier @types/node

echo "→ packages/shared"
pnpm --filter @fintrack/shared add zod@4
pnpm --filter @fintrack/shared add -D vitest

echo "→ apps/api (dependencias)"
pnpm --filter @fintrack/api add express@5 cors cookie-parser helmet express-rate-limit \
  jsonwebtoken pino zod@4 @prisma/client@6 "@fintrack/shared@workspace:*"

echo "→ apps/api (desarrollo)"
pnpm --filter @fintrack/api add -D prisma@6 tsx tsup vitest supertest pino-pretty \
  @types/express @types/cors @types/cookie-parser @types/jsonwebtoken @types/supertest

echo "→ Generando el cliente de Prisma"
pnpm --filter @fintrack/api db:generate

echo "✔ Listo. Siguiente paso: cp apps/api/.env.example apps/api/.env && pnpm db:up && pnpm db:migrate"
