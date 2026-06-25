import { test, expect } from "@playwright/test";

/**
 * Suite E2E des pages légales (#30) : mentions légales et politique de
 * confidentialité, publiées dans les 3 langues. Couvre chargement, titres,
 * sections, métadonnées, accès depuis le footer, RTL hébreu et accessibilité.
 */

const LOCALES = ["fr", "en", "he"] as const;
type Locale = (typeof LOCALES)[number];

const PAGES = [
  {
    slug: "mentions-legales",
    h1: { fr: /Mentions légales/i, en: /Legal notice/i, he: /הצהרה משפטית/ } as Record<
      Locale,
      RegExp
    >,
  },
  {
    slug: "politique-confidentialite",
    h1: {
      fr: /Politique de confidentialité/i,
      en: /Privacy policy/i,
      he: /מדיניות פרטיות/,
    } as Record<Locale, RegExp>,
  },
] as const;

test.describe("Pages légales", () => {
  // ---------------------------------------------------------------------------
  // A. Chargement, titres et sections
  // ---------------------------------------------------------------------------
  for (const { slug, h1 } of PAGES) {
    for (const locale of LOCALES) {
      test(`/${locale}/${slug} affiche le titre et des sections`, async ({ page }) => {
        await page.goto(`/${locale}/${slug}`);
        const heading = page.getByRole("heading", { level: 1 });
        await expect(heading).toBeVisible();
        await expect(heading).toContainText(h1[locale]);
        await expect(heading).toHaveCount(1);
        // Au moins une section (intertitre H2).
        await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
        await expect(page).toHaveTitle(/HYMEA/);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // B. RTL hébreu
  // ---------------------------------------------------------------------------
  test("la politique de confidentialité passe en RTL en hébreu", async ({ page }) => {
    await page.goto("/he/politique-confidentialite");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  // ---------------------------------------------------------------------------
  // C. Accès depuis le footer (URLs localisées)
  // ---------------------------------------------------------------------------
  test("les liens du footer mènent aux pages légales localisées", async ({ page }) => {
    await page.goto("/fr");
    const footer = page.getByRole("contentinfo");

    await footer.getByRole("link", { name: "Mentions légales" }).click();
    await expect(page).toHaveURL(/\/fr\/mentions-legales$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Mentions légales/i);

    await page.goto("/fr");
    await footer.getByRole("link", { name: "Politique de confidentialité" }).click();
    await expect(page).toHaveURL(/\/fr\/politique-confidentialite$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /Politique de confidentialité/i,
    );
  });

  // ---------------------------------------------------------------------------
  // D. Contenu RGPD clé (politique de confidentialité)
  // ---------------------------------------------------------------------------
  test("la politique mentionne la conservation 12 mois et les droits", async ({ page }) => {
    await page.goto("/fr/politique-confidentialite");
    await expect(page.getByText(/12 mois/i).first()).toBeVisible();
    await expect(page.getByText(/droit d'accès/i).first()).toBeVisible();
    await expect(page.getByText(/2026-06-v1/).first()).toBeVisible();
  });
});
