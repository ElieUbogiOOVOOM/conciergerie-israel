# syntax=docker/dockerfile:1
# Image de production de l'API HYMEA (NestJS + Kysely).
# ⚠️ Build context = RACINE du monorepo (pnpm workspaces a besoin de la racine
# et de packages/shared). Sur Dockploy : context=., dockerfile=apps/api/Dockerfile.

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# --- Étape build : install complet + build shared & api ---
FROM base AS build
# Manifests d'abord (cache des dépendances).
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# Sources puis build : app NestJS + compilation des migrations en JS
# (le conteneur de prod n'a pas ts-node).
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN pnpm --filter @hymea/shared build \
  && pnpm --filter @hymea/api build \
  && pnpm --filter @hymea/api build:migrations

# Bundle de prod auto-contenu (node_modules réel, deps workspace injectées).
RUN pnpm --filter @hymea/api deploy --prod /app/deploy

# --- Étape runtime : image minimale ---
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/deploy/node_modules ./node_modules
COPY --from=build /app/deploy/package.json ./package.json
COPY --from=build /app/apps/api/dist ./dist
# Migrations compilées (résolues par dist/database/migrate.js → ../../migrations).
COPY --from=build /app/apps/api/dist-migrations ./migrations

EXPOSE 4000
# Applique les migrations puis démarre l'API.
CMD ["sh", "-c", "node dist/database/migrate.js up && node dist/main.js"]
