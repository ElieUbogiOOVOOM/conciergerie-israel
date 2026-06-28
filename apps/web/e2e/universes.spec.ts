import { test, expect, type Page } from "@playwright/test";

/**
 * Suite E2E des pages univers HYMEA (issues #25 Centres commerciaux,
 * #26 Entreprises, #27 Particuliers).
 *
 * Couvre : chargement et métadonnées localisés, i18n FR/EN/HE + RTL, en-tête H1
 * unique, emphase éditoriale (t.rich), grilles de prestations / piliers, panneau
 * preuve chiffré, CTA de conversion + bloc contact/offre du layout, navigation
 * depuis l'accueil (liens « Découvrir »), responsive et accessibilité.
 */

const LOCALES = ["fr", "en", "he"] as const;
type Locale = (typeof LOCALES)[number];
const HEADING_LEVEL1 = 1;

// Libellé du CTA de conversion, désormais porté par le bloc contact commun
// (CTA adaptatif `ContactCta`), identique sur toutes les pages — le `PageCta`
// propre à chaque univers a été retiré.
const CONTACT_CTA: Record<Locale, string> = {
  fr: "Prendre rendez-vous",
  en: "Book an appointment",
  he: "קביעת פגישה",
};

type PageSpec = {
  slug: string;
  /** Type de client porté vers le funnel RDV (?type=). */
  funnelType: string;
  /** Titre H1 attendu par locale. */
  heroTitle: Record<Locale, RegExp>;
  /** Libellé du lien « Découvrir » sur l'accueil (FR). */
  learnMoreFr: string;
  /** Quelques preuves/contenus attendus sur la page. */
  expectedContent: RegExp[];
  /** La page expose-t-elle un emplacement photo dans son hero ? */
  hasHeroPhoto: boolean;
};

const PAGES: PageSpec[] = [
  {
    slug: "centres-commerciaux",
    funnelType: "mall",
    heroTitle: {
      fr: /Transformer un lieu de passage/i,
      en: /Turn a place people pass through/i,
      he: /להפוך מקום מעבר/,
    },
    learnMoreFr: "Découvrir les centres commerciaux",
    expectedContent: [/\+70\s*%/, /\+30\s*%/, /Personal Shopper/i],
    // Hero éditorial (expérience HYMEA déplacée de l'accueil) — sans emplacement photo.
    hasHeroPhoto: false,
  },
  {
    slug: "entreprises",
    funnelType: "entreprise",
    heroTitle: {
      fr: /HYMEA transforme le confort au travail/i,
      en: /transforms workplace convenience into a powerful employee experience/i,
      he: /הופכת את הנוחות במקום העבודה/,
    },
    learnMoreFr: "Découvrir les entreprises",
    expectedContent: [/9\s*%/, /74\s*%/, /HYMEA Lounge/i],
    hasHeroPhoto: true,
  },
  {
    slug: "particuliers",
    funnelType: "particulier",
    heroTitle: {
      fr: /L'art du détail/i,
      en: /The art of detail/i,
      he: /אמנות הפרט/,
    },
    learnMoreFr: "Découvrir les particuliers",
    expectedContent: [/Véhicules|Vehicles|רכבים/, /Textiles|טקסטיל/],
    hasHeroPhoto: true,
  },
];

async function gotoPage(page: Page, locale: string, slug: string) {
  await page.goto(`/${locale}/${slug}`);
  await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toBeVisible();
}

for (const spec of PAGES) {
  test.describe(`Page univers — ${spec.slug}`, () => {
    // -------------------------------------------------------------------------
    // Chargement & métadonnées
    // -------------------------------------------------------------------------
    test.describe("Chargement & métadonnées", () => {
      for (const locale of LOCALES) {
        test(`/${locale}/${spec.slug} affiche le H1 attendu`, async ({ page }) => {
          await gotoPage(page, locale, spec.slug);
          await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toContainText(
            spec.heroTitle[locale],
          );
          await expect(page).toHaveTitle(/HYMEA/);
        });
      }

      test("expose des métadonnées propres (title distinct de l'accueil)", async ({ page }) => {
        await gotoPage(page, "fr", spec.slug);
        const pageTitle = await page.title();
        await page.goto("/fr");
        const homeTitle = await page.title();
        expect(pageTitle).not.toBe(homeTitle);
      });
    });

    // -------------------------------------------------------------------------
    // i18n & RTL
    // -------------------------------------------------------------------------
    test("html porte lang/dir corrects (RTL en hébreu)", async ({ page }) => {
      await gotoPage(page, "he", spec.slug);
      await expect(page.locator("html")).toHaveAttribute("lang", "he");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

      await gotoPage(page, "en", spec.slug);
      await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    });

    // -------------------------------------------------------------------------
    // Contenu : emphase, preuves, CTA
    // -------------------------------------------------------------------------
    test("le chapô met un segment en gras (t.rich)", async ({ page }) => {
      await gotoPage(page, "fr", spec.slug);
      await expect(page.getByRole("main").locator("strong").first()).toBeVisible();
    });

    test("présente le contenu / les preuves attendus", async ({ page }) => {
      await gotoPage(page, "fr", spec.slug);
      const main = page.getByRole("main");
      for (const content of spec.expectedContent) {
        await expect(main).toContainText(content);
      }
    });

    test("le CTA adaptatif du bloc contact mène au funnel RDV typé", async ({ page }) => {
      await gotoPage(page, "fr", spec.slug);
      // La conversion est portée par le CTA adaptatif du bloc contact (ContactCta),
      // pré-filtré sur l'univers courant — le PageCta propre à la page a été retiré.
      const cta = page.locator("#contact").getByRole("link", { name: CONTACT_CTA.fr });
      await expect(cta).toHaveAttribute("href", `/fr/rdv?type=${spec.funnelType}`);
      await cta.click();
      await expect(page).toHaveURL(new RegExp(`/fr/rdv\\?type=${spec.funnelType}$`));
      await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toBeVisible();
    });

    test("le CTA adaptatif reste typé dans les trois langues (RTL inclus)", async ({ page }) => {
      for (const locale of LOCALES) {
        await gotoPage(page, locale, spec.slug);
        const cta = page.locator("#contact").getByRole("link", { name: CONTACT_CTA[locale] });
        await expect(cta).toHaveAttribute("href", `/${locale}/rdv?type=${spec.funnelType}`);
      }
    });

    test("le hero propose un CTA de réservation typé en haut de page", async ({ page }) => {
      await gotoPage(page, "fr", spec.slug);
      // CTA de réservation dès le haut de page (dans <main>), distinct du CTA
      // du bloc contact (en pied, hors <main>) — tous deux pré-filtrés.
      const heroCta = page.getByRole("main").getByRole("link", { name: CONTACT_CTA.fr });
      await expect(heroCta).toHaveAttribute("href", `/fr/rdv?type=${spec.funnelType}`);
      await heroCta.click();
      await expect(page).toHaveURL(new RegExp(`/fr/rdv\\?type=${spec.funnelType}$`));
      await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toBeVisible();
    });

    test("les deux accès au funnel (hero + contact) sont typés sur l'univers", async ({ page }) => {
      await gotoPage(page, "fr", spec.slug);
      // Garde-fou : exactement deux liens vers le funnel (hero + contact), tous
      // deux pré-filtrés sur le type de l'univers — aucun lien funnel générique
      // ni résiduel (l'ancien PageCta a été retiré).
      await expect(page.locator('a[href^="/fr/rdv"]')).toHaveCount(2);
      await expect(page.locator(`a[href="/fr/rdv?type=${spec.funnelType}"]`)).toHaveCount(2);
    });

    test("le bloc contact + offre -20 % du layout est présent", async ({ page }) => {
      await gotoPage(page, "fr", spec.slug);
      await expect(page.locator("#contact")).toContainText(/20\s*%/);
    });

    // -------------------------------------------------------------------------
    // Responsive
    // -------------------------------------------------------------------------
    test.describe("Responsive — mobile", () => {
      test.use({ viewport: { width: 375, height: 812 } });
      test("le H1 reste visible sur mobile", async ({ page }) => {
        await gotoPage(page, "fr", spec.slug);
        await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toBeVisible();
      });
    });

    // -------------------------------------------------------------------------
    // Accessibilité
    // -------------------------------------------------------------------------
    test("un seul h1 et les landmarks principaux sont présents", async ({ page }) => {
      await gotoPage(page, "fr", spec.slug);
      await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toHaveCount(1);
      await expect(page.getByRole("banner")).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);
    });

    test("l'emplacement photo du hero a un nom accessible", async ({ page }) => {
      test.skip(
        !spec.hasHeroPhoto,
        "Le hero des centres commerciaux est éditorial, sans emplacement photo.",
      );
      await gotoPage(page, "fr", spec.slug);
      await expect(page.getByRole("img").first()).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// Entreprises — section offres « A tailored solution » (deck p.24-25)
// 4 paliers (Basic / Silver / Gold mis en avant / Sur demande) avec le détail
// des services de chacun, remplaçant l'ancienne grille de services.
// ---------------------------------------------------------------------------
test.describe("Entreprises — paliers d'offre « A tailored solution »", () => {
  const SECTION_TITLE: Record<Locale, RegExp> = {
    fr: /formules qui s'adaptent/i,
    en: /Packages that adapt/i,
    he: /חבילות שמתאימות/,
  };
  const TIERS: Record<Locale, string[]> = {
    fr: ["L'offre de base", "Formule Silver", "Formule Gold", "Sur demande"],
    en: ["The basic offer", "Silver package", "Gold package", "Upon request"],
    he: ["החבילה הבסיסית", "חבילת Silver", "חבילת Gold", "לפי בקשה"],
  };
  const FEATURED: Record<Locale, string> = {
    fr: "Recommandé",
    en: "Recommended",
    he: "מומלץ",
  };
  // Un service échantillon par palier (basic / silver / gold / onRequest) pour
  // vérifier que le détail des prestations est bien rendu.
  const SAMPLE_SERVICES: Record<Locale, RegExp[]> = {
    fr: [/Personal Shopper/i, /Cordonnerie/i, /Physiothérapie/i, /organise vos événements/i],
    en: [/Personal Shopper/i, /Cobbler/i, /Physiotherapy/i, /plans your events/i],
    he: [/פרסונל שופר/, /סנדלרות/, /פיזיותרפיה/, /מפיקה את האירועים/],
  };
  const OFFER_HEADINGS = 4;
  const SINGLE = 1;

  for (const locale of LOCALES) {
    test(`/${locale}/entreprises — 4 paliers + détail des services`, async ({ page }) => {
      await gotoPage(page, locale, "entreprises");
      const section = page.getByRole("region", { name: SECTION_TITLE[locale] });
      await expect(section).toBeVisible();
      await expect(section.getByRole("heading", { level: 3 })).toHaveCount(OFFER_HEADINGS);
      for (const tier of TIERS[locale]) {
        await expect(section).toContainText(tier);
      }
      for (const service of SAMPLE_SERVICES[locale]) {
        await expect(section).toContainText(service);
      }
    });

    test(`/${locale}/entreprises — un seul palier marqué « ${FEATURED[locale]} » (Gold)`, async ({
      page,
    }) => {
      await gotoPage(page, locale, "entreprises");
      const section = page.getByRole("region", { name: SECTION_TITLE[locale] });
      await expect(section.getByText(FEATURED[locale], { exact: true })).toHaveCount(SINGLE);
    });
  }

  test("la grille d'offres remplace l'ancienne grille de services", async ({ page }) => {
    await gotoPage(page, "fr", "entreprises");
    // Garde-fou : l'ancien eyebrow « L'offre HYMEA Office » ne doit plus exister.
    await expect(page.getByText("L'offre HYMEA Office")).toHaveCount(0);
  });

  test.describe("Responsive — mobile", () => {
    test.use({ viewport: { width: 375, height: 812 } });
    test("les 4 paliers restent rendus une fois empilés", async ({ page }) => {
      await gotoPage(page, "fr", "entreprises");
      const section = page.getByRole("region", { name: SECTION_TITLE.fr });
      await expect(section.getByRole("heading", { level: 3 })).toHaveCount(OFFER_HEADINGS);
    });
  });

  test("RTL — la section offres se rend correctement en hébreu", async ({ page }) => {
    await gotoPage(page, "he", "entreprises");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const section = page.getByRole("region", { name: SECTION_TITLE.he });
    await expect(section.getByRole("heading", { level: 3 })).toHaveCount(OFFER_HEADINGS);
  });
});

// ---------------------------------------------------------------------------
// Navigation depuis l'accueil (liens « Découvrir »)
// ---------------------------------------------------------------------------
test.describe("Accueil → pages univers", () => {
  for (const spec of PAGES) {
    test(`le lien « ${spec.learnMoreFr} » mène à /fr/${spec.slug}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/fr");
      const link = page.getByRole("link", { name: spec.learnMoreFr });
      await expect(link).toHaveAttribute("href", `/fr/${spec.slug}`);
      await link.click();
      await expect(page).toHaveURL(new RegExp(`/fr/${spec.slug}$`));
      await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toContainText(
        spec.heroTitle.fr,
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Centres commerciaux — l'expérience premium HYMEA (déplacée de l'ancienne page
// d'accueil) : leviers, services signature, preuve chiffrée et emphase t.rich.
// ---------------------------------------------------------------------------
test.describe("Centres commerciaux — expérience premium HYMEA", () => {
  test("liste les trois leviers de valeur", async ({ page }) => {
    await gotoPage(page, "fr", "centres-commerciaux");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Augmenter le panier moyen" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Faire revenir les visiteurs" })).toBeVisible();
    await expect(
      main.getByRole("heading", { name: "Élargir la zone de chalandise" }),
    ).toBeVisible();
  });

  test("la section expérience liste les services signature", async ({ page }) => {
    await gotoPage(page, "fr", "centres-commerciaux");
    const experience = page.locator("#experience");
    await expect(experience.getByRole("heading", { name: "Le Lounge" })).toBeVisible();
    await expect(experience.getByRole("heading", { name: "Stylisme" })).toBeVisible();
    await expect(experience.getByRole("heading", { name: "Club de fidélité" })).toBeVisible();
  });

  test("la section résultats affiche les preuves chiffrées", async ({ page }) => {
    await gotoPage(page, "fr", "centres-commerciaux");
    const results = page.locator("#resultats");
    await expect(results).toContainText("+70 %");
    await expect(results).toContainText("+30 %");
    await expect(results).toContainText("50 %");
    await expect(results).toContainText("+ visites");
    await expect(results).toContainText("La Vallée Village");
  });

  test("une description de service met un segment en gras (t.rich)", async ({ page }) => {
    await gotoPage(page, "fr", "centres-commerciaux");
    const experience = page.locator("#experience");
    const strong = experience.locator("strong", {
      hasText: /faire grimper la dépense jusqu'à \+70 %/i,
    });
    await expect(strong).toBeVisible();
  });

  test("le CTA secondaire du hero mène à la section expérience", async ({ page }) => {
    await gotoPage(page, "fr", "centres-commerciaux");
    await page.getByRole("main").getByRole("link", { name: "Découvrir l'expérience" }).click();
    await expect(page).toHaveURL(/#experience$/);
  });
});
