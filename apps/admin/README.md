# @hymea/admin — Back-office

Back-office HYMEA (Next.js, App Router). Servi sous **`/admin`** (`basePath`), **non
indexable** (`noindex`), thème **clair** à la charte. Strictement séparé de la vitrine :
aucun lien entrant depuis `apps/web`.

## Périmètre (jalon M3)

- **#32** — bootstrap Next.js (`basePath: /admin`, `noindex`) + tokens admin (thème clair)
- **#33** — authentification : login, refresh silencieux (cookie httpOnly), garde middleware, logout
- **#34** — planning calendrier (vues jour / semaine / mois, RDV teintés par statut)
- **#35** — liste des RDV : table paginée + recherche + filtres combinables

## Architecture

- **Authentification.** Le login appelle l'API (`/api/auth/login`) qui dépose le cookie
  refresh **httpOnly** (scopé `/api/auth`) et renvoie un **access token** conservé **en
  mémoire** (jamais en `localStorage`). Un `AuthProvider` réhydrate la session au montage
  (refresh silencieux) puis programme un refresh **anticipé** avant chaque expiration.
- **Garde.** Le cookie refresh étant illisible côté front (httpOnly, path `/api/auth`), un
  **cookie de présence non secret** (`hymea_admin_session`, path `/admin`) permet au
  **middleware** de rediriger vers `/login`. La sécurité réelle reste portée par le Bearer
  côté API. Une garde client (`AdminShell`) complète le middleware.
- **Données.** Toutes les vues consomment les routes admin de l'API (`GET /api/rendez-vous`,
  `GET /api/rendez-vous/:id`, `GET /api/prestations`) via un client qui rejoue la requête
  après un refresh sur `401`.
- **Fuseau.** Les instants UTC de l'API sont affichés à l'heure d'Israël (`Asia/Jerusalem`) ;
  la semaine court du dimanche au samedi.

## Développement

```bash
pnpm --filter @hymea/admin dev   # http://localhost:3001/admin
```

Variables d'env (cf. `.env.example`) :

- `NEXT_PUBLIC_API_URL` — base de l'API (dev : `http://localhost:4000/api` ; prod : base
  relative `/api`, same-origin via le reverse-proxy).
- `CORS_ORIGINS` (côté API) — autoriser `http://localhost:3001` en dev (cross-origin).

Un compte admin est requis : `pnpm --filter @hymea/api seed:admin`.

## Tests

E2E Playwright (`pnpm --filter @hymea/admin test:e2e`) : les appels API sont **mockés**
(interception réseau), sans backend live — flux d'auth, navigation du planning, filtres et
recherche de la liste, responsive et accessibilité.
