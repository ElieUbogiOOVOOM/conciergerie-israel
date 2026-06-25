# @hymea/admin — Back-office

> ⚠️ **Placeholder (jalon M0).** Ce package n'est pour l'instant qu'un emplacement réservé
> dans le monorepo afin que Turborepo et la CI le voient.

Le bootstrap réel du back-office est planifié dans le jalon **M3 — Back-office** :

- **#32** — bootstrap Next.js admin (`basePath: /admin`, `noindex`) + tokens admin (thème clair)

Tant que cette issue n'est pas traitée, les scripts (`build`, `lint`, `type-check`, `test:e2e`)
sont des no-op qui réussissent, et la CI saute les jobs web/admin (garde sur `next.config.*`).
