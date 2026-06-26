# syntax=docker/dockerfile:1
# Image de production de la vitrine HYMEA (Next.js, sortie `standalone`).
# ⚠️ Build context = RACINE du monorepo (pnpm workspaces a besoin de la racine
# et de packages/shared). Sur Dokploy : context=., dockerfile=apps/web/Dockerfile.

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# --- Étape build : install complet + build shared & web ---
FROM base AS build
# Manifests d'abord (cache des dépendances).
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# Base de l'API gravée dans le bundle : Next inline les NEXT_PUBLIC_* AU BUILD.
# Fournie par Dokploy en build arg ; défaut = API same-origin en HTTPS (évite le
# blocage « mixed content » d'une page HTTPS appelant une API en HTTP).
ARG NEXT_PUBLIC_API_URL=https://hymea.elie-ubogi.fr/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Sources puis build (le package partagé d'abord, puis la vitrine).
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN pnpm --filter @hymea/shared build && pnpm --filter @hymea/web build

# --- Étape runtime : image minimale (sortie standalone Next) ---
FROM base AS runtime
ENV NODE_ENV=production
# Next standalone lit PORT/HOSTNAME ; on écoute sur toutes les interfaces.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# La sortie standalone embarque le serveur minimal + node_modules nécessaires.
# Avec outputFileTracingRoot=racine, les fichiers vivent sous apps/web/.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
