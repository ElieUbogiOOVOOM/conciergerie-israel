import { test, expect, type Page } from "@playwright/test";

/**
 * Suite E2E de l'intégration des photographies réelles HYMEA
 * (feature feat/integrate-client-photos).
 *
 * Le site remplace les `PhotoPlaceholder` (« Photographie à venir ») par les
 * visuels livrés par le client, aux 9 emplacements réservés :
 *  - accueil : 3 cartes univers (`UniverseCard`, ratio 4/5)
 *  - héros des pages Entreprises & Particuliers (`PageHero`, ratio 4/3, priority)
 *  - 4 cartes prestations Particuliers (`FeatureFlipCard`, photo révélée au dos)
 *
 * Le placeholder reste le fallback quand aucune photo n'est fournie (ex. le
 * héros éditorial des centres commerciaux n'a pas de photo).
 *
 * Couvre : présence des `<img>` (next/image servi via /_next/image), src des
 * fichiers attendus, alt localisé non vide, distinction photo/placeholder,
 * flip recto↔dos, responsive mobile, RTL hébreu et accessibilité.
 */

const LOCALES = ["fr", "en", "he"] as const;
type Locale = (typeof LOCALES)[number];
const HEADING_LEVEL1 = 1;

// Légende du placeholder (« photo à venir ») — sert à distinguer un emplacement
// non encore pourvu d'une photo réelle.
const PLACEHOLDER_CAPTION: Record<Locale, RegExp> = {
  fr: /Photographie à venir/i,
  en: /Photography coming soon/i,
  he: /תמונה בקרוב/,
};

// Mot-clé présent dans la src (next/image encode les `/` en `%2F`, mais les noms
// de fichiers restent littéraux).
const HOME_CARDS = [
  { slug: "centres-commerciaux", srcKeyword: "home%2Fcentres-commerciaux" },
  { slug: "entreprises", srcKeyword: "home%2Fentreprises" },
  { slug: "particuliers", srcKeyword: "home%2Fparticuliers" },
] as const;

// Alt localisé attendu pour la carte univers « Centres commerciaux » (accueil).
const HOME_MALL_ALT: Record<Locale, RegExp> = {
  fr: /centre commercial de luxe/i,
  en: /shopping mall/i,
  he: /קניון/,
};

type HeroSpec = {
  slug: string;
  srcKeyword: string;
  alt: Record<Locale, RegExp>;
};

const HERO_PAGES: HeroSpec[] = [
  {
    slug: "entreprises",
    srcKeyword: "entreprises-hero",
    alt: {
      fr: /lounge HYMEA en entreprise/i,
      en: /HYMEA corporate lounge/i,
      he: /לאונג'? HYMEA/i,
    },
  },
  {
    slug: "particuliers",
    srcKeyword: "particuliers-hero",
    alt: {
      fr: /plan de travail en pierre/i,
      en: /stone countertop/i,
      he: /משטח עבודה/,
    },
  },
];

// Les 4 prestations Particuliers et le mot-clé de leur photo (dos de flip card).
const PRESTATIONS = [
  { key: "homes", srcKeyword: "habitations" },
  { key: "vehicles", srcKeyword: "vehicules" },
  { key: "furniture", srcKeyword: "mobilier" },
  { key: "textiles", srcKeyword: "textiles" },
] as const;
const PRESTATION_COUNT = PRESTATIONS.length;

const FLIP_BACK_HINT: Record<Locale, RegExp> = {
  fr: /Revenir au texte/i,
  en: /Back to text/i,
  he: /חזרה לטקסט/,
};

async function gotoPage(page: Page, locale: string, slug: string) {
  await page.goto(`/${locale}/${slug}`);
  await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toBeVisible();
}

/** Localise une photo réelle (next/image) par mot-clé de son fichier source. */
function photo(page: Page, srcKeyword: string) {
  return page.locator(`img[src*="${srcKeyword}"]`);
}

// ---------------------------------------------------------------------------
// A. Accueil — cartes univers
// ---------------------------------------------------------------------------
test.describe("Accueil — photos des cartes univers", () => {
  for (const locale of LOCALES) {
    test(`/${locale} affiche les 3 photos univers avec un alt localisé`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toBeVisible();

      for (const card of HOME_CARDS) {
        const img = photo(page, card.srcKeyword);
        await expect(img).toHaveCount(1);
        await expect(img).toBeVisible();
        const alt = await img.getAttribute("alt");
        expect(alt?.trim()).toBeTruthy();
      }
    });
  }

  test("la carte « Centres commerciaux » porte un alt traduit par langue", async ({ page }) => {
    for (const locale of LOCALES) {
      await page.goto(`/${locale}`);
      const img = photo(page, "home%2Fcentres-commerciaux");
      await expect(img).toHaveAttribute("alt", HOME_MALL_ALT[locale]);
    }
  });

  test("les photos univers sont servies via l'optimiseur next/image", async ({ page }) => {
    await page.goto("/fr");
    const img = photo(page, "home%2Fparticuliers");
    await expect(img).toHaveAttribute("src", /\/_next\/image\?url=.*\.webp/);
  });
});

// ---------------------------------------------------------------------------
// B. Héros des pages Entreprises & Particuliers
// ---------------------------------------------------------------------------
test.describe("Héros de page — photo prioritaire", () => {
  for (const hero of HERO_PAGES) {
    test(`/${hero.slug} : photo de héros visible avec alt localisé`, async ({ page }) => {
      for (const locale of LOCALES) {
        await gotoPage(page, locale, hero.slug);
        const img = photo(page, hero.srcKeyword);
        await expect(img).toBeVisible();
        await expect(img).toHaveAttribute("alt", hero.alt[locale]);
      }
    });

    test(`/${hero.slug} : la photo de héros est chargée en priorité (non lazy)`, async ({
      page,
    }) => {
      await gotoPage(page, "fr", hero.slug);
      const img = photo(page, hero.srcKeyword);
      // `priority` sur next/image => loading="eager" (jamais "lazy").
      await expect(img).not.toHaveAttribute("loading", "lazy");
    });
  }
});

// ---------------------------------------------------------------------------
// C. Particuliers — flip cards révélant la photo au dos
// ---------------------------------------------------------------------------
test.describe("Particuliers — photos au dos des flip cards", () => {
  test("les 4 prestations exposent chacune leur photo (dos de carte)", async ({ page }) => {
    await gotoPage(page, "fr", "particuliers");
    for (const prestation of PRESTATIONS) {
      const img = photo(page, prestation.srcKeyword);
      await expect(img).toHaveCount(1);
      const alt = await img.getAttribute("alt");
      expect(alt?.trim()).toBeTruthy();
    }
  });

  test("un clic retourne la carte (aria-pressed bascule) et révèle le cartouche", async ({
    page,
  }) => {
    await gotoPage(page, "fr", "particuliers");
    const cards = page.locator("button[aria-pressed]");
    await expect(cards).toHaveCount(PRESTATION_COUNT);

    const first = cards.first();
    await expect(first).toHaveAttribute("aria-pressed", "false");
    await first.click();
    await expect(first).toHaveAttribute("aria-pressed", "true");
    // Le cartouche « Revenir au texte » devient lisible sur la photo.
    await expect(first.getByText(FLIP_BACK_HINT.fr)).toBeVisible();

    // Un second clic revient au recto.
    await first.click();
    await expect(first).toHaveAttribute("aria-pressed", "false");
  });

  test("le cartouche de retour est traduit dans les trois langues", async ({ page }) => {
    for (const locale of LOCALES) {
      await gotoPage(page, locale, "particuliers");
      const first = page.locator("button[aria-pressed]").first();
      await expect(first.getByText(FLIP_BACK_HINT[locale])).toBeAttached();
    }
  });
});

// ---------------------------------------------------------------------------
// D. Placeholder — fallback là où aucune photo n'est fournie
// ---------------------------------------------------------------------------
test.describe("Placeholder — fallback", () => {
  test("le héros éditorial des centres commerciaux n'a pas de photo", async ({ page }) => {
    await gotoPage(page, "fr", "centres-commerciaux");
    // Aucune photo réelle n'est attendue sur cette page (héros sans visuel).
    await expect(page.locator('img[src*="photos"]')).toHaveCount(0);
  });

  test("le placeholder conserve une légende accessible quand il est rendu", async ({ page }) => {
    // Les emplacements pourvus d'une photo ne doivent PAS exposer la légende
    // « Photographie à venir » : on vérifie que le fallback reste distinct.
    await gotoPage(page, "fr", "particuliers");
    const heroPhoto = photo(page, "particuliers-hero");
    const heroAlt = await heroPhoto.getAttribute("alt");
    expect(heroAlt).not.toMatch(PLACEHOLDER_CAPTION.fr);
  });
});

// ---------------------------------------------------------------------------
// E. Responsive — mobile
// ---------------------------------------------------------------------------
test.describe("Responsive — mobile 375px", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("les photos univers restent rendues sur l'accueil mobile", async ({ page }) => {
    await page.goto("/fr");
    for (const card of HOME_CARDS) {
      await expect(photo(page, card.srcKeyword)).toBeVisible();
    }
  });

  test("la photo de héros Particuliers reste rendue sur mobile", async ({ page }) => {
    await gotoPage(page, "fr", "particuliers");
    await expect(photo(page, "particuliers-hero")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// F. RTL — hébreu
// ---------------------------------------------------------------------------
test.describe("RTL — hébreu", () => {
  test("les photos univers se rendent avec alt en hébreu (dir=rtl)", async ({ page }) => {
    await page.goto("/he");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    for (const card of HOME_CARDS) {
      const img = photo(page, card.srcKeyword);
      await expect(img).toBeVisible();
      const alt = await img.getAttribute("alt");
      expect(alt?.trim()).toBeTruthy();
    }
  });

  test("la photo de héros Entreprises se rend en hébreu", async ({ page }) => {
    await gotoPage(page, "he", "entreprises");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(photo(page, "entreprises-hero")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// G. Accessibilité
// ---------------------------------------------------------------------------
test.describe("Accessibilité des photos", () => {
  test("aucune photo réelle ne porte la légende du placeholder comme alt", async ({ page }) => {
    for (const locale of LOCALES) {
      await page.goto(`/${locale}`);
      // Une photo réelle est une <img> ; sa src pointe vers /photos. Son alt ne
      // doit jamais être la légende « Photographie à venir » (et non vide).
      const imgs = page.locator('img[src*="photos"]');
      const count = await imgs.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const alt = await imgs.nth(i).getAttribute("alt");
        expect(alt?.trim()).toBeTruthy();
        expect(alt).not.toMatch(PLACEHOLDER_CAPTION[locale]);
      }
    }
  });

  test("chaque photo de prestation a un nom accessible unique", async ({ page }) => {
    await gotoPage(page, "fr", "particuliers");
    const alts = new Set<string>();
    for (const prestation of PRESTATIONS) {
      const alt = await photo(page, prestation.srcKeyword).getAttribute("alt");
      expect(alt?.trim()).toBeTruthy();
      alts.add(alt as string);
    }
    // Les 4 alt sont distincts (pas de copier-coller).
    expect(alts.size).toBe(PRESTATION_COUNT);
  });
});
