# @hymea/web — Vitrine

> ⚠️ **Placeholder (jalon M0).** Ce package n'est pour l'instant qu'un emplacement réservé
> dans le monorepo afin que Turborepo et la CI le voient.

Le bootstrap réel de la vitrine est planifié dans les issues du jalon **M2 — Vitrine** :

- **#21** — bootstrap Next.js vitrine + design tokens + fonts (charte HYMEA)
- **#22** — i18n next-intl (FR/EN/HE) + routing localisé + détection + RTL

Tant que ces issues ne sont pas traitées, les scripts (`build`, `lint`, `type-check`, `test:e2e`)
sont des no-op qui réussissent, et la CI saute les jobs web/admin (garde sur `next.config.*`).
