import { test, expect, type Page } from "@playwright/test";

/**
 * Suite E2E SEO de la vitrine HYMEA (issue #31).
 *
 * Couvre : métadonnées par page et par locale (title/description), URL canonique,
 * balises hreflang (fr/en/he + x-default, URLs absolues), Open Graph & Twitter
 * cards, image OG générée par locale, sitemap.xml (routes × locales + alternates)
 * et robots.txt (exclusion admin/api, référence sitemap). Vérifie aussi la
 * non-régression RTL hébreu.
 *
 * Les URLs canoniques/hreflang sont absolues et bâties sur PUBLIC_SITE_URL au
 * build (repli https://hymea.com) : on assert donc le schéma + le suffixe de
 * chemin plutôt qu'un domaine en dur, pour rester robuste en CI.
 */

const LOCALES = ["fr", "en", "he"] as const;
type Locale = (typeof LOCALES)[number];

// Routes publiques (slugs non localisés) — miroir de ROUTES dans src/lib/seo.ts.
const ROUTES = [
  "",
  "/centres-commerciaux",
  "/entreprises",
  "/particuliers",
  "/rdv",
  "/mentions-legales",
  "/politique-confidentialite",
] as const;

const OG_LOCALE: Record<Locale, string> = { fr: "fr_FR", en: "en_US", he: "he_IL" };

// On ne restreint pas au <head> : pour les pages rendues dynamiquement (ex. /rdv
// avec searchParams), Next injecte les balises metadata en streaming hors du head.
/** Lit le contenu d'une balise meta (property ou name). */
async function metaContent(page: Page, selector: string): Promise<string | null> {
  const loc = page.locator(selector);
  await expect(loc).toHaveCount(1);
  return loc.getAttribute("content");
}

test.describe("SEO — métadonnées par page et par locale", () => {
  for (const locale of LOCALES) {
    for (const path of ROUTES) {
      const url = `/${locale}${path}`;

      test(`${url} expose des métadonnées SEO complètes`, async ({ page }) => {
        await page.goto(url);

        // Title & description non triviaux, marqués HYMEA.
        await expect(page).toHaveTitle(/HYMEA/);
        const description = await metaContent(page, 'meta[name="description"]');
        expect(description, "description présente").toBeTruthy();
        expect((description ?? "").length).toBeGreaterThan(40);

        // URL canonique absolue pointant la page localisée courante.
        const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
        expect(canonical).toMatch(new RegExp(`^https?://[^/]+${url}$`));

        // hreflang : une entrée par locale + x-default (repli FR), URLs absolues.
        for (const alt of LOCALES) {
          const href = await page
            .locator(`link[rel="alternate"][hreflang="${alt}"]`)
            .getAttribute("href");
          expect(href, `hreflang ${alt}`).toMatch(new RegExp(`^https?://[^/]+/${alt}${path}$`));
        }
        const xDefault = await page
          .locator('link[rel="alternate"][hreflang="x-default"]')
          .getAttribute("href");
        expect(xDefault).toMatch(new RegExp(`^https?://[^/]+/fr${path}$`));

        // Open Graph.
        expect(await metaContent(page, 'meta[property="og:title"]')).toBeTruthy();
        expect(await metaContent(page, 'meta[property="og:description"]')).toBeTruthy();
        expect(await metaContent(page, 'meta[property="og:site_name"]')).toBe("HYMEA");
        expect(await metaContent(page, 'meta[property="og:type"]')).toBe("website");
        expect(await metaContent(page, 'meta[property="og:locale"]')).toBe(OG_LOCALE[locale]);
        expect(await metaContent(page, 'meta[property="og:url"]')).toMatch(
          new RegExp(`^https?://[^/]+${url}$`),
        );
        expect(await metaContent(page, 'meta[property="og:image"]')).toMatch(
          new RegExp(`/${locale}/opengraph-image`),
        );

        // Twitter card.
        expect(await metaContent(page, 'meta[name="twitter:card"]')).toBe("summary_large_image");
        expect(await metaContent(page, 'meta[name="twitter:image"]')).toMatch(
          new RegExp(`/${locale}/opengraph-image`),
        );
      });
    }
  }

  test("og:locale:alternate liste les deux autres locales", async ({ page }) => {
    await page.goto("/fr");
    const alts = await page
      .locator('meta[property="og:locale:alternate"]')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("content")));
    expect(alts).toEqual(expect.arrayContaining(["en_US", "he_IL"]));
    expect(alts).not.toContain("fr_FR");
  });

  test("le title diffère entre l'accueil et une page univers", async ({ page }) => {
    await page.goto("/fr");
    const home = await page.title();
    await page.goto("/fr/entreprises");
    const business = await page.title();
    expect(home).not.toBe(business);
  });
});

test.describe("SEO — RTL hébreu (non-régression)", () => {
  test("la page hébraïque garde lang=he et dir=rtl", async ({ page }) => {
    await page.goto("/he/entreprises");
    await expect(page.locator("html")).toHaveAttribute("lang", "he");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
});

test.describe("SEO — sitemap.xml", () => {
  test("est servi en XML et liste toutes les routes × locales", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("xml");
    const body = await res.text();

    // 7 routes × 3 locales = 21 entrées <loc>.
    const locCount = (body.match(/<loc>/g) ?? []).length;
    expect(locCount).toBe(ROUTES.length * LOCALES.length);

    // Chaque route apparaît pour chaque locale, avec alternates hreflang.
    for (const locale of LOCALES) {
      for (const path of ROUTES) {
        expect(body).toContain(`<loc>https://hymea.com/${locale}${path}</loc>`);
      }
    }
    expect(body).toContain('hreflang="x-default"');
  });
});

test.describe("SEO — robots.txt", () => {
  test("autorise l'indexation, exclut admin/api et référence le sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/User-Agent:\s*\*/i);
    expect(body).toMatch(/Allow:\s*\//i);
    expect(body).toMatch(/Disallow:\s*\/admin/i);
    expect(body).toMatch(/Disallow:\s*\/api/i);
    expect(body).toMatch(/Sitemap:\s*https:\/\/hymea\.com\/sitemap\.xml/i);
  });
});

test.describe("SEO — image Open Graph par locale", () => {
  for (const locale of LOCALES) {
    test(`/${locale}/opengraph-image renvoie un PNG 1200×630`, async ({ request }) => {
      const res = await request.get(`/${locale}/opengraph-image`);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toContain("image/png");
      const buf = await res.body();
      expect(buf.byteLength).toBeGreaterThan(1000);
    });
  }
});
