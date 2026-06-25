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
    heroTitle: {
      fr: /Faire du bureau une expérience/i,
      en: /Turn the workplace into an experience/i,
      he: /להפוך את המשרד לחוויה/,
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

    test("le CTA de conversion mène au bloc contact", async ({ page }) => {
      await gotoPage(page, "fr", spec.slug);
      await page.getByRole("main").getByRole("link", { name: spec.cta.fr }).first().click();
      await expect(page).toHaveURL(/#contact$/);
      await expect(page.locator("#contact")).toBeInViewport();
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
