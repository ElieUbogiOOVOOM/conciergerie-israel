import { test, expect, type Page } from "@playwright/test";

/**
 * Suite E2E de la page de garde HYMEA (refonte « page de garde »).
 *
 * Couvre : bannière signature (logo, slogan, titre expérience, CTA), bloc de
 * redirection vers les trois univers, histoire du groupe Sandra Bibas Holding
 * (principes, marques, émergence), partenariat + CTA contact, i18n FR/EN/HE +
 * RTL, responsive, accessibilité (H1 unique, nom accessible du logo) et repli
 * sans JavaScript (les révélations au scroll ne doivent jamais masquer le
 * contenu).
 */

const LOCALES = ["fr", "en", "he"] as const;
type Locale = (typeof LOCALES)[number];
const HEADING_LEVEL1 = 1;

const HERO_TITLE: Record<Locale, RegExp> = {
  fr: /L'expérience HYMEA/i,
  en: /The HYMEA experience/i,
  he: /חוויית HYMEA/,
};

const HISTORY_TITLE: Record<Locale, RegExp> = {
  fr: /histoire du groupe/i,
  en: /history of the group/i,
  he: /סיפור הקבוצה/,
};

const PARTNERSHIP_TITLE: Record<Locale, RegExp> = {
  fr: /Travailler avec nous/i,
  en: /Work with us/i,
  he: /לעבוד איתנו/,
};

// Marques du groupe — présentes quelle que soit la locale (noms propres).
const ENTITIES = ["Les pépites Agency", "OOVOOM", "OOVOOM Driver", "Ma Vape Mobile"];

async function gotoLanding(page: Page, locale: string) {
  await page.goto(`/${locale}`);
  await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toBeVisible();
}

test.describe("Page de garde HYMEA", () => {
  // ---------------------------------------------------------------------------
  // Bannière signature
  // ---------------------------------------------------------------------------
  test.describe("Bannière", () => {
    for (const locale of LOCALES) {
      test(`/${locale} — logo, slogan et titre expérience`, async ({ page }) => {
        await gotoLanding(page, locale);
        // Slogan de marque (identique sur les trois locales).
        await expect(page.getByText("The office conciergerie").first()).toBeVisible();
        // Titre signature = H1 unique.
        await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toContainText(
          HERO_TITLE[locale],
        );
        // Le logo de la bannière porte un nom accessible.
        await expect(page.getByRole("main").getByRole("img", { name: "HYMEA" })).toBeVisible();
      });
    }

    test("les deux CTA de la bannière pointent vers les bonnes ancres", async ({ page }) => {
      await gotoLanding(page, "fr");
      const main = page.getByRole("main");
      await expect(main.getByRole("link", { name: "Découvrir nos univers" })).toHaveAttribute(
        "href",
        "#univers",
      );
      await expect(
        main.getByRole("link", { name: "Travailler avec nous" }).first(),
      ).toHaveAttribute("href", "#contact");
    });
  });

  // ---------------------------------------------------------------------------
  // Histoire du groupe
  // ---------------------------------------------------------------------------
  test.describe("Histoire du groupe", () => {
    for (const locale of LOCALES) {
      test(`/${locale} — titre, deux principes et quatre marques`, async ({ page }) => {
        await gotoLanding(page, locale);
        const histoire = page.locator("#histoire");
        await expect(histoire.getByRole("heading", { name: HISTORY_TITLE[locale] })).toBeVisible();
        await expect(histoire).toContainText("Sandra Bibas Holding");
        // Les deux principes fondateurs sont numérotés (01, 02).
        await expect(histoire).toContainText("01");
        await expect(histoire).toContainText("02");
        // Les quatre marques du groupe sont présentes.
        for (const entity of ENTITIES) {
          await expect(histoire).toContainText(entity);
        }
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Partenariat
  // ---------------------------------------------------------------------------
  test.describe("Partenariat", () => {
    for (const locale of LOCALES) {
      test(`/${locale} — titre, signature et CTA contact`, async ({ page }) => {
        await gotoLanding(page, locale);
        const partenariat = page.locator("#partenariat");
        await expect(
          partenariat.getByRole("heading", { name: PARTNERSHIP_TITLE[locale] }),
        ).toBeVisible();
        await expect(partenariat).toContainText("The Service, Your Partner, A Strategy");
        await expect(partenariat.getByRole("link")).toHaveAttribute("href", "#contact");
      });
    }

    test("le CTA contact défile jusqu'au bloc contact du layout", async ({ page }) => {
      await gotoLanding(page, "fr");
      await page.locator("#partenariat").getByRole("link", { name: "Nous contacter" }).click();
      await expect(page).toHaveURL(/#contact$/);
      await expect(page.locator("#contact")).toBeInViewport();
    });
  });

  // ---------------------------------------------------------------------------
  // i18n & RTL
  // ---------------------------------------------------------------------------
  test("html porte lang/dir corrects (RTL en hébreu)", async ({ page }) => {
    await gotoLanding(page, "he");
    await expect(page.locator("html")).toHaveAttribute("lang", "he");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    // Les sections clés restent rendues en RTL.
    await expect(page.locator("#histoire")).toContainText("Sandra Bibas Holding");
    await expect(page.locator("#partenariat")).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Accessibilité
  // ---------------------------------------------------------------------------
  test("un seul h1 et les landmarks principaux sont présents", async ({ page }) => {
    await gotoLanding(page, "fr");
    await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toHaveCount(1);
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
  });

  // ---------------------------------------------------------------------------
  // Repli sans JavaScript — les révélations au scroll ne doivent jamais masquer
  // le contenu (SEO + a11y). Sans JS, html.js est absent : tout reste visible.
  // ---------------------------------------------------------------------------
  test.describe("Sans JavaScript", () => {
    test.use({ javaScriptEnabled: false });
    test("l'histoire du groupe et le partenariat restent visibles", async ({ page }) => {
      await page.goto("/fr");
      await expect(page.locator("html")).not.toHaveClass(/(^|\s)js(\s|$)/);
      const histoire = page.locator("#histoire");
      await expect(histoire.getByRole("heading", { name: HISTORY_TITLE.fr })).toBeVisible();
      await expect(histoire).toContainText("Ma Vape Mobile");
      await expect(
        page.locator("#partenariat").getByRole("heading", { name: PARTNERSHIP_TITLE.fr }),
      ).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // Responsive — mobile
  // ---------------------------------------------------------------------------
  test.describe("Responsive — mobile", () => {
    test.use({ viewport: { width: 375, height: 812 } });
    test("la bannière, l'histoire et le partenariat s'empilent et restent lisibles", async ({
      page,
    }) => {
      await gotoLanding(page, "fr");
      await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toBeVisible();
      await expect(page.locator("#histoire")).toContainText("Sandra Bibas Holding");
      await expect(page.locator("#partenariat")).toContainText(
        "The Service, Your Partner, A Strategy",
      );
    });
  });
});
