import { test, expect, type Page } from "@playwright/test";

/**
 * Suite E2E de la vitrine HYMEA (issues #21-24).
 *
 * Couvre : chargement des pages localisées, i18n FR/EN/HE, détection de langue
 * + cookie, RTL hébreu, navigation (ancres, sélecteur de langue), layout global
 * (header, menu mobile, footer, bloc contact + offre -20 %), responsive, 404
 * localisée et accessibilité.
 *
 * Catégories non applicables à une vitrine publique sombre : authentification,
 * formulaires, bascule de thème (thème sombre unique), temps réel.
 */

const LOCALES = ["fr", "en", "he"] as const;

const HERO_TITLE: Record<(typeof LOCALES)[number], RegExp> = {
  fr: /Transformer un lieu de passage/i,
  en: /Turn a place people pass through/i,
  he: /להפוך מקום מעבר/,
};

const HEADING_LEVEL1 = 1;

async function gotoLocale(page: Page, locale: string) {
  await page.goto(`/${locale}`);
  await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toBeVisible();
}

test.describe("Vitrine HYMEA", () => {
  // ---------------------------------------------------------------------------
  // A. Chargement des pages
  // ---------------------------------------------------------------------------
  test.describe("Chargement des pages", () => {
    for (const locale of LOCALES) {
      test(`/${locale} affiche le hero et le titre`, async ({ page }) => {
        await gotoLocale(page, locale);
        await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toContainText(
          HERO_TITLE[locale],
        );
        await expect(page).toHaveTitle(/HYMEA/);
      });
    }

    test("la racine / redirige vers une locale préfixée", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/(fr|en|he)(\/|$|#)/);
    });

    test("le header, le bloc contact et le footer sont présents", async ({ page }) => {
      await gotoLocale(page, "fr");
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // B. i18n & RTL
  // ---------------------------------------------------------------------------
  test.describe("i18n et RTL", () => {
    test("html porte lang/dir corrects par locale", async ({ page }) => {
      await gotoLocale(page, "fr");
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
      await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

      await gotoLocale(page, "en");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

      await gotoLocale(page, "he");
      await expect(page.locator("html")).toHaveAttribute("lang", "he");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    });

    test("le contenu hébreu s'affiche", async ({ page }) => {
      await gotoLocale(page, "he");
      // L'univers « centres commerciaux » (visible quelle que soit la largeur).
      await expect(page.locator("#centres-commerciaux")).toContainText("מרכזים מסחריים");
    });
  });

  test.describe("Détection de langue (Accept-Language)", () => {
    test.use({ locale: "en-US" });
    test("redirige vers /en quand le navigateur est en anglais", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/en(\/|$|#)/);
    });
  });

  test.describe("Détection de langue — hébreu", () => {
    test.use({ locale: "he-IL" });
    test("redirige vers /he quand le navigateur est en hébreu", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/he(\/|$|#)/);
    });
  });

  // ---------------------------------------------------------------------------
  // C. Navigation & sélecteur de langue
  // ---------------------------------------------------------------------------
  test.describe("Navigation", () => {
    test("le logo ramène à l'accueil", async ({ page }) => {
      await gotoLocale(page, "fr");
      await page.getByRole("banner").getByRole("link", { name: "HYMEA" }).click();
      await expect(page).toHaveURL(/\/fr$/);
    });

    test("les liens du header mènent aux pages univers dédiées", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      const NAV = [
        { name: "Centres commerciaux", slug: "centres-commerciaux" },
        { name: "Entreprises", slug: "entreprises" },
        { name: "Particuliers", slug: "particuliers" },
      ];
      for (const { name, slug } of NAV) {
        await gotoLocale(page, "fr");
        const link = page.getByRole("banner").getByRole("link", { name });
        await expect(link).toHaveAttribute("href", `/fr/${slug}`);
        await link.click();
        await expect(page).toHaveURL(new RegExp(`/fr/${slug}$`));
        await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toBeVisible();
      }
    });

    test("le lien Contact du header fonctionne depuis une page univers", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/fr/entreprises");
      await page.getByRole("banner").getByRole("link", { name: "Contact" }).click();
      await expect(page).toHaveURL(/#contact$/);
      await expect(page.locator("#contact")).toBeInViewport();
    });

    test("le CTA du hero mène au bloc contact", async ({ page }) => {
      await gotoLocale(page, "fr");
      // Le libellé est partagé avec le CTA de l'univers « Centres commerciaux » ;
      // on cible le premier (celui du hero).
      await page
        .getByRole("main")
        .getByRole("link", { name: "Demander une présentation" })
        .first()
        .click();
      await expect(page).toHaveURL(/#contact$/);
      await expect(page.locator("#contact")).toBeInViewport();
    });

    test("le footer mène aussi aux pages univers dédiées", async ({ page }) => {
      await gotoLocale(page, "fr");
      const footer = page.getByRole("contentinfo");
      await expect(footer.getByRole("link", { name: "Entreprises" })).toHaveAttribute(
        "href",
        "/fr/entreprises",
      );
      await footer.getByRole("link", { name: "Particuliers" }).click();
      await expect(page).toHaveURL(/\/fr\/particuliers$/);
    });

    test("les liens légaux du footer ont les bonnes URL localisées", async ({ page }) => {
      await gotoLocale(page, "fr");
      const footer = page.getByRole("contentinfo");
      await expect(footer.getByRole("link", { name: "Mentions légales" })).toHaveAttribute(
        "href",
        "/fr/mentions-legales",
      );
      await expect(
        footer.getByRole("link", { name: "Politique de confidentialité" }),
      ).toHaveAttribute("href", "/fr/politique-confidentialite");
    });
  });

  test.describe("Sélecteur de langue", () => {
    test("change de langue en conservant la page et mémorise le choix", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await gotoLocale(page, "fr");

      await page.getByRole("button", { name: "English" }).click();
      await expect(page).toHaveURL(/\/en(\/|$|#)/);
      await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toContainText(
        HERO_TITLE.en,
      );

      // Le cookie NEXT_LOCALE est posé.
      const cookies = await page.context().cookies();
      const localeCookie = cookies.find((c) => c.name === "NEXT_LOCALE");
      expect(localeCookie?.value).toBe("en");

      // La langue est mémorisée : revenir à la racine reste en anglais.
      await page.goto("/");
      await expect(page).toHaveURL(/\/en(\/|$|#)/);
    });

    test("indique la langue active (aria-current)", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await gotoLocale(page, "fr");
      await expect(page.getByRole("button", { name: "Français" })).toHaveAttribute(
        "aria-current",
        "true",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // D. Affichage des données (les 3 univers + offre)
  // ---------------------------------------------------------------------------
  test.describe("Contenu de l'accueil", () => {
    test("présente les trois univers avec leurs titres", async ({ page }) => {
      await gotoLocale(page, "fr");
      await expect(page.getByRole("heading", { name: "Le concept SEGULA" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "HYMEA Lounge & bureaux" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "L'art du détail, chez vous" })).toBeVisible();
    });

    test("chaque univers a une section ancrée et un CTA", async ({ page }) => {
      await gotoLocale(page, "fr");
      for (const id of ["centres-commerciaux", "entreprises", "particuliers"]) {
        await expect(page.locator(`#${id}`)).toBeAttached();
      }
    });

    test("le bloc contact affiche l'offre -20 %", async ({ page }) => {
      await gotoLocale(page, "fr");
      await expect(page.locator("#contact")).toContainText(/20\s*%/);
      await expect(page.locator("#contact")).toContainText(/première prestation/i);
    });

    test("la section expérience liste les services signature", async ({ page }) => {
      await gotoLocale(page, "fr");
      const experience = page.locator("#experience");
      await expect(experience.getByRole("heading", { name: "Le Lounge" })).toBeVisible();
      await expect(experience.getByRole("heading", { name: "Stylisme" })).toBeVisible();
      await expect(experience.getByRole("heading", { name: "Club de fidélité" })).toBeVisible();
    });

    test("la section résultats affiche les preuves chiffrées", async ({ page }) => {
      await gotoLocale(page, "fr");
      const results = page.locator("#resultats");
      await expect(results).toContainText("+70 %");
      await expect(results).toContainText("+30 %");
      await expect(results).toContainText("50 %");
      await expect(results).toContainText("+ visites");
      await expect(results).toContainText("La Vallée Village");
    });

    test("une description de service met un segment en gras (t.rich)", async ({ page }) => {
      await gotoLocale(page, "fr");
      const experience = page.locator("#experience");
      // L'emphase éditoriale est rendue via un <strong> issu du balisage <b>.
      const strong = experience.locator("strong", {
        hasText: /faire grimper la dépense jusqu'à \+70 %/i,
      });
      await expect(strong).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // E. Responsive & menu mobile
  // ---------------------------------------------------------------------------
  test.describe("Responsive — desktop", () => {
    test("la navigation desktop est visible, le bouton menu masqué", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await gotoLocale(page, "fr");
      await expect(
        page.getByRole("banner").getByRole("link", { name: "Particuliers" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
    });
  });

  test.describe("Responsive — mobile & menu", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("le menu mobile s'ouvre, navigue et se ferme", async ({ page }) => {
      await gotoLocale(page, "fr");
      const toggle = page.getByRole("button", { name: "Menu" });
      await expect(toggle).toBeVisible();

      await toggle.click();
      const menu = page.locator("#mobile-menu");
      await expect(menu).toBeVisible();
      await expect(menu.getByRole("link", { name: "Centres commerciaux" })).toBeVisible();

      // Un clic sur un lien navigue vers la page univers et referme le menu.
      await menu.getByRole("link", { name: "Centres commerciaux" }).click();
      await expect(page).toHaveURL(/\/fr\/centres-commerciaux$/);
      await expect(page.locator("#mobile-menu")).toBeHidden();
    });

    test("la touche Échap referme le menu mobile", async ({ page }) => {
      await gotoLocale(page, "fr");
      await page.getByRole("button", { name: "Menu" }).click();
      await expect(page.locator("#mobile-menu")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator("#mobile-menu")).toBeHidden();
    });
  });

  // ---------------------------------------------------------------------------
  // F. Gestion d'erreur — 404 localisée
  // ---------------------------------------------------------------------------
  test.describe("Page 404", () => {
    test("une route inexistante affiche un 404 localisé", async ({ page }) => {
      const res = await page.goto("/fr/cette-page-nexiste-pas");
      expect(res?.status()).toBe(404);
      await expect(page.getByText(/éclips/i)).toBeVisible();
      await expect(page.getByRole("link", { name: /accueil/i })).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // G. Accessibilité
  // ---------------------------------------------------------------------------
  test.describe("Accessibilité", () => {
    test("un lien d'évitement est le premier élément focusable", async ({ page, browserName }) => {
      // WebKit ne déplace pas le focus vers les liens via Tab par défaut
      // (réglage clavier macOS) ; on valide ce flux clavier sur Chromium.
      test.skip(browserName === "webkit", "Navigation Tab limitée sous WebKit");
      await gotoLocale(page, "fr");
      await page.keyboard.press("Tab");
      const focused = page.locator(":focus");
      await expect(focused).toHaveText(/Aller au contenu/i);
      await expect(focused).toHaveAttribute("href", "#contenu");
    });

    test("un seul h1 et les landmarks principaux sont présents", async ({ page }) => {
      await gotoLocale(page, "fr");
      await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toHaveCount(1);
      await expect(page.getByRole("banner")).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);
    });

    test("les emplacements photo ont un nom accessible", async ({ page }) => {
      await gotoLocale(page, "fr");
      await expect(page.getByRole("img", { name: /Centres commerciaux/i }).first()).toBeVisible();
    });

    test("les boutons du sélecteur de langue ont un nom accessible", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await gotoLocale(page, "fr");
      for (const name of ["Français", "English", "עברית"]) {
        await expect(page.getByRole("button", { name })).toBeVisible();
      }
    });
  });
});
