# syntax=docker/dockerfile:1
# Image de la vitrine HYMEA (Next.js).
#
# ⚠️ TEMPLATE (jalon M0) — la vitrine n'est pas encore bootstrappée (Next.js
# arrive en #21/#22). Ce Dockerfile sera finalisé à ce moment-là (build Next
# en sortie `standalone`). Build context = racine du monorepo.
#
# Squelette cible (multi-stage) :
#
#   FROM node:20-alpine AS base
#   RUN corepack enable
#   WORKDIR /app
#
#   FROM base AS build
#   COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
#   COPY packages/shared/package.json ./packages/shared/
#   COPY apps/web/package.json ./apps/web/
#   RUN pnpm install --frozen-lockfile
#   COPY packages/shared ./packages/shared
#   COPY apps/web ./apps/web
#   RUN pnpm --filter @hymea/shared build && pnpm --filter @hymea/web build
#
#   FROM base AS runtime
#   ENV NODE_ENV=production
#   WORKDIR /app
#   COPY --from=build /app/apps/web/.next/standalone ./
#   COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
#   COPY --from=build /app/apps/web/public ./apps/web/public
#   EXPOSE 3000
#   CMD ["node", "apps/web/server.js"]
