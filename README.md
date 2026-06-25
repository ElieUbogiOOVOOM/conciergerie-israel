<div align="center">

# HYMEA — *The office conciergerie*

**Conciergerie & nettoyage premium — Israël**
Site vitrine trilingue (FR / EN / עברית) + plateforme de prise de rendez‑vous & back‑office.

</div>

---

> 📄 La spécification fonctionnelle complète vit dans **[`SPEC.md`](./SPEC.md)** (issue des questions de cadrage + `CDC.pdf`).
> Ce README fige la **charte graphique / design system** et donne la vue d'ensemble technique.

## Sommaire

- [Présentation](#présentation)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Structure du monorepo](#structure-du-monorepo)
- [Design system (charte HYMEA)](#design-system--charte-hymea)
- [Internationalisation](#internationalisation)
- [Déploiement](#déploiement)
- [Roadmap & tickets](#roadmap--tickets)

---

## Présentation

HYMEA est une marque de nettoyage et de conciergerie haut de gamme opérant en Israël, déclinée
sur **trois marchés** :

| Univers | Promesse | Action attendue sur le site |
|---|---|---|
| **Centres commerciaux** | Concept SEGULA : lounge, voiturier, personal shopper, styliste, club fidélité | Demander une présentation |
| **Entreprises** | HYMEA Lounge & entretien premium des bureaux | Demander un devis / planifier une visite |
| **Particuliers** | Nettoyage haut de gamme : habitations, véhicules, mobilier, textiles | Réserver un créneau d'intervention |

Le produit comprend un **site vitrine éditorial** et une **plateforme de prise de rendez‑vous**
avec planning en back‑office.

## Architecture

Trois services indépendants + PostgreSQL, dans un **monorepo**. La vitrine et l'admin sont
**strictement séparées** : aucun lien depuis la vitrine ne mène à l'admin.

```
                      ┌─────────────────────────────┐
   hymea.com  ───────▶│  apps/web    (Next.js)       │  Vitrine SSG/SSR, SEO, i18n+RTL
                      └─────────────────────────────┘
                      ┌─────────────────────────────┐
   hymea.com/admin ──▶│  apps/admin  (Next.js)       │  Back-office (noindex, basePath)
                      └─────────────────────────────┘
                      ┌─────────────────────────────┐
   hymea.com/api  ───▶│  apps/api    (NestJS+Kysely) │  Auth, RDV, dispos, emails, cron
                      └──────────────┬──────────────┘
                                     │
                              ┌──────▼──────┐
                              │ PostgreSQL  │
                              └─────────────┘
```

Un **reverse‑proxy** (Dockploy) route par préfixe : `/admin` et `/api` sont résolus **avant**
la vitrine, afin que le routing de langue (`/fr` `/en` `/he`) ne capte pas ces chemins.

## Stack technique

| Brique | Choix |
|---|---|
| Vitrine | **Next.js** (App Router) · `next-intl` · SSG/SSR |
| Admin | **Next.js** (`basePath: /admin`, `noindex`) |
| API | **NestJS** + **Kysely** (query builder, pas d'ORM) |
| Base de données | **PostgreSQL** |
| Emails | **Resend** + React Email (FR/EN/HE) |
| Anti‑spam | **Cloudflare Turnstile** + honeypot + rate‑limit |
| Auth | **JWT** access + refresh (cookie httpOnly), hash **argon2** |
| Monorepo | **pnpm workspaces** + **Turborepo** |
| Hébergement | **Dockploy** (relié à GitHub) |

## Structure du monorepo

```
hymea/
├── apps/
│   ├── web/      → vitrine (Next.js)        + Dockerfile
│   ├── admin/    → back-office (Next.js)    + Dockerfile
│   └── api/      → API (NestJS + Kysely)    + Dockerfile
├── packages/
│   └── shared/   → types, contrats API, config i18n
├── SPEC.md       → spécification fonctionnelle complète
└── README.md
```

---

## Design system — charte HYMEA

> **Direction artistique : luxe sobre.** Fond charbon, or champagne & ivoire.
> **Pas de dégradés agressifs ni d'effets superflus.** Photographies réelles fournies par le client.
> *(Source : `CDC.pdf` § 07 — cette charte est imposée par la marque et fait foi.)*

### Palette

Les valeurs **hex sont la source de vérité** (marque). Les équivalents **OKLCH** sont fournis pour
l'implémentation (perceptuellement uniformes ; réduire la chroma près des extrêmes).

| Rôle | Hex | OKLCH (approx.) | Token |
|---|---|---|---|
| Charbon — fond principal | `#100e0b` | `oklch(0.16 0.008 60)` | `--color-charbon` |
| Or champagne — accent | `#c2a36b` | `oklch(0.72 0.070 78)` | `--color-or-champagne` |
| Ivoire — sections claires | `#f4efe4` | `oklch(0.95 0.012 85)` | `--color-ivoire` |
| Crème — texte sur fond sombre | `#e9e1d2` | `oklch(0.90 0.018 82)` | `--color-creme` |
| Or profond — titres / liens | `#a9854f` | `oklch(0.62 0.075 70)` | `--color-or-profond` |

**Règles d'usage**
- Répartition **60 / 30 / 10** (poids visuel) : surfaces charbon/ivoire ≈ 60 %, texte/bordures crème ≈ 30 %, or ≈ 10 %. L'or reste **rare** pour garder sa force.
- **Neutres teintés** vers le charbon (hue ~60–80) pour la cohérence — jamais de gris pur ni de `#000`/`#fff`.
- **Contraste** : crème `#e9e1d2` sur charbon `#100e0b` pour le corps ; or profond `#a9854f` réservé aux titres/liens (vérifier AA sur fond clair).
- **Aucun dégradé décoratif**, aucun « gradient text », aucune bande latérale colorée (`border-left` accent).

### Typographies

| Usage | Police | Nature |
|---|---|---|
| Titres & logotype | **Cinzel** | serif à capitales, gravé/lapidaire |
| Corps de texte & accents | **Cormorant Garamond** | serif éditorial |
| Labels, navigation, boutons | **Jost** | sans‑serif géométrique |

- Échelle typographique modulaire, fluide (`clamp`) sur les titres de la vitrine ; fixe (`rem`) dans l'admin.
- Hiérarchie marquée (ratio ≥ 1.25 entre niveaux), corps limité à ~65–75 ch par ligne.
- Texte clair sur fond sombre : **+0.05–0.1** d'interligne (la graisse perçue est plus légère).
- ⚠️ *Note design* : `Cormorant Garamond` figure parmi les polices « réflexe » d'Impeccable. Ici elle est **imposée par la charte client** (CDC § 07) et fait donc autorité — on l'utilise volontairement, ce n'est pas un défaut.

### Thèmes par contexte

- **Vitrine** : thème **sombre** (fond charbon) — registre luxe, navigation contemplative.
- **Back‑office** : surfaces **ivoire/claires** avec encre charbon et accents or — privilégie la **lisibilité en usage quotidien** (planning consulté toute la journée), tout en restant dans la charte. La sémantique des statuts reste colorée (voir ci‑dessous).

### Statuts de rendez‑vous (couleurs sémantiques)

`Nouveau` (or champagne pâle) · `Confirmé` (vert) · `Replanifié` (bleu) · `Réalisé` (charbon/gris) · `Annulé` (rouge).
Dans le calendrier admin : un RDV **Nouveau** s'affiche en teinte **pâle**, et passe en **couleur pleine** une fois **Confirmé**.

---

## Internationalisation

- Langues : **FR / EN / עברית**, avec **RTL complet** pour l'hébreu (mise en page, menu, alignements inversés).
- URLs localisées `/fr` `/en` `/he` (SEO, `hreflang`, métadonnées par locale).
- 1ʳᵉ visite : détection navigateur (`Accept-Language`), **repli FR**. Choix **mémorisé** (cookie) ensuite.
- Contenu éditorial : fichiers `messages/{fr,en,he}.json` (versionnés). Emails et formulaire également trilingues.

## Déploiement

Hébergement **Dockploy**, relié au dépôt GitHub. Trois services (web, admin, api) + PostgreSQL,
un Dockerfile par app. Voir le ticket de déploiement pour le reverse‑proxy, le domaine, DKIM/SPF
et les clés Turnstile/Resend.

**À fournir** (cf. `SPEC.md` § 14) : tokens **Resend** + DKIM/SPF sur `hymea.com`, clés **Cloudflare
Turnstile**, contenus définitifs (textes FR/EN/HE) + **photographies réelles**, accès **Dockploy**.

## Roadmap & tickets

L'implémentation est découpée en **issues GitHub** (jalons M0 → M4), traitées une à une via
`/new-feature`. Voir l'onglet [Issues](https://github.com/ElieUbogiOOVOOM/conciergerie-israel/issues)
et les [Milestones](https://github.com/ElieUbogiOOVOOM/conciergerie-israel/milestones).

| Jalon | Périmètre |
|---|---|
| **M0** | Fondations : monorepo, BDD, Docker, CI, package partagé |
| **M1** | Backend API : auth, RDV, dispos, prestations, clients, emails, cron, exports |
| **M2** | Vitrine : pages éditoriales, funnel RDV, i18n/RTL, SEO, pages légales |
| **M3** | Back‑office : planning, fiches, filtres, dispos, prestations, intervenants |
| **M4** | Qualité & mise en ligne : tests, recette multilingue, a11y/perf, déploiement, doc |
