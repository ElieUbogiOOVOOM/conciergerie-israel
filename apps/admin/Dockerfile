# syntax=docker/dockerfile:1
# Image de production du back-office HYMEA (Next.js, basePath /admin, noindex).
# ⚠️ Build context = RACINE du monorepo (pnpm workspaces a besoin de la racine
# et de packages/shared). Sur Dokploy : context=., dockerfile=apps/admin/Dockerfile.

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# --- Étape build : install complet + build shared & admin ---
FROM base AS build
# Manifests d'abord (cache des dépendances).
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/admin/package.json ./apps/admin/
RUN pnpm install --frozen-lockfile

# Sources puis build (le package partagé d'abord, puis le back-office).
COPY packages/shared ./packages/shared
COPY apps/admin ./apps/admin
RUN pnpm --filter @hymea/shared build && pnpm --filter @hymea/admin build

# --- Étape runtime : image minimale (sortie standalone Next) ---
FROM base AS runtime
ENV NODE_ENV=production
# Next standalone lit PORT/HOSTNAME ; on écoute sur toutes les interfaces.
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# La sortie standalone embarque le serveur minimal + node_modules nécessaires.
# Avec outputFileTracingRoot=racine, les fichiers vivent sous apps/admin/.
COPY --from=build /app/apps/admin/.next/standalone ./
COPY --from=build /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build /app/apps/admin/public ./apps/admin/public

EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
