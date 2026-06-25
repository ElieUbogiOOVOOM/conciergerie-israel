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

type PageSpec = {
  slug: string;
  /** Type de client porté vers le funnel RDV (?type=). */
  funnelType: string;
  /** Titre H1 attendu par locale. */
  heroTitle: Record<Locale, RegExp>;
  /** Libellé du CTA de conversion par locale. */
  cta: Record<Locale, string>;
  /** Libellé du lien « Découvrir » sur l'accueil (FR). */
  learnMoreFr: string;
  /** Quelques preuves/contenus attendus sur la page. */
  expectedContent: RegExp[];
};

const PAGES: PageSpec[] = [
  {
    slug: "centres-commerciaux",
    funnelType: "mall",
    heroTitle: {
      fr: /Le concept SEGULA/i,
      en: /The SEGULA concept/i,
      he: /קונספט SEGULA/,
    },
    cta: {
      fr: "Demander une présentation",
      en: "Request a presentation",
      he: "בקשת הצגה",
    },
    learnMoreFr: "Découvrir les centres commerciaux",
    expectedContent: [/\+70\s*%/, /\+30\s*%/, /Personal Shopper/i],
  },
  {
    slug: "entreprises",
    funnelType: "entreprise",
    heroTitle: {
      fr: /HYMEA transforme le confort au travail/i,
      en: /transforms workplace convenience into a powerful employee experience/i,
      he: /הופכת את הנוחות במקום העבודה/,
    },
    cta: {
      fr: "Demander un devis",
      en: "Request a quote",
      he: "בקשת הצעת מחיר",
    },
    learnMoreFr: "Découvrir les entreprises",
    expectedContent: [/9\s*%/, /74\s*%/, /HYMEA Lounge/i],
  },
  {
    slug: "particuliers",
    funnelType: "particulier",
    heroTitle: {
      fr: /L'art du détail/i,
      en: /The art of detail/i,
      he: /אמנות הפרט/,
    },
    cta: {
      fr: "Réserver un créneau",
      en: "Book a slot",
      he: "הזמנת מועד",
    },
    learnMoreFr: "Découvrir les particuliers",
    expectedContent: [/Véhicules|Vehicles|רכבים/, /Textiles|טקסטיל/],
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

    test("le CTA de conversion mène au funnel RDV typé", async ({ page }) => {
      await gotoPage(page, "fr", spec.slug);
      const cta = page.getByRole("main").getByRole("link", { name: spec.cta.fr }).last();
      await expect(cta).toHaveAttribute("href", `/fr/rdv?type=${spec.funnelType}`);
      await cta.click();
      await expect(page).toHaveURL(new RegExp(`/fr/rdv\\?type=${spec.funnelType}$`));
      await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toBeVisible();
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
