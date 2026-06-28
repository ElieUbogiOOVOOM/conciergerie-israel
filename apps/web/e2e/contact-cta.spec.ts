import { test, expect, type Page } from "@playwright/test";

/**
 * Suite E2E du bloc contact commun et de son CTA adaptatif (ContactCta).
 *
 * Le CTA « Prendre rendez-vous » mène désormais au funnel RDV, pré-filtré sur
 * l'univers de la page courante (`/rdv?type=…`) ou générique ailleurs — il
 * remplace l'ancien `mailto:` qui restait inopérant sans client mail configuré.
 * L'adresse e-mail reste affichée en lien secondaire (`mailto:`), forcée en LTR
 * pour rester lisible en hébreu.
 *
 * Couvre : cible du CTA selon la page (typée vs générique), distinction
 * CTA principal / lien e-mail secondaire, conservation du `mailto:` (objet
 * pré-rempli), i18n FR/EN/HE + RTL, responsive (cible tactile) et présence sur
 * toutes les familles de pages.
 */

const LOCALES = ["fr", "en", "he"] as const;
type Locale = (typeof LOCALES)[number];

const CONTACT_CTA: Record<Locale, RegExp> = {
  fr: /Prendre rendez-vous/i,
  en: /Book an appointment/i,
  he: /קביעת פגישה/,
};

const CONTACT_EMAIL = "contact@hymea.com";
const MIN_TOUCH_TARGET = 44;

async function contactSection(page: Page, path: string) {
  await page.goto(path);
  const contact = page.locator("#contact");
  await expect(contact).toBeVisible();
  return contact;
}

// ---------------------------------------------------------------------------
// A. Cible adaptative du CTA selon la page
// ---------------------------------------------------------------------------
test.describe("CTA contact — cible adaptative", () => {
  const TYPED = [
    { path: "centres-commerciaux", type: "mall" },
    { path: "entreprises", type: "entreprise" },
    { path: "particuliers", type: "particulier" },
  ] as const;

  for (const { path, type } of TYPED) {
    test(`/${path} : CTA pré-filtré ?type=${type}`, async ({ page }) => {
      const contact = await contactSection(page, `/fr/${path}`);
      const cta = contact.getByRole("link", { name: CONTACT_CTA.fr });
      await expect(cta).toHaveAttribute("href", `/fr/rdv?type=${type}`);
    });
  }

  for (const path of ["", "mentions-legales", "politique-confidentialite"] as const) {
    test(`/${path || "(accueil)"} : CTA générique vers /rdv`, async ({ page }) => {
      const contact = await contactSection(page, `/fr/${path}`);
      const cta = contact.getByRole("link", { name: CONTACT_CTA.fr });
      await expect(cta).toHaveAttribute("href", "/fr/rdv");
    });
  }

  test("le clic sur le CTA ouvre bien le funnel RDV", async ({ page }) => {
    const contact = await contactSection(page, "/fr/particuliers");
    await contact.getByRole("link", { name: CONTACT_CTA.fr }).click();
    await expect(page).toHaveURL(/\/fr\/rdv\?type=particulier$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// B. CTA principal vs lien e-mail secondaire
// ---------------------------------------------------------------------------
test.describe("CTA principal vs e-mail secondaire", () => {
  test("le CTA est un lien interne, distinct du lien mailto", async ({ page }) => {
    const contact = await contactSection(page, "/fr/particuliers");

    const cta = contact.getByRole("link", { name: CONTACT_CTA.fr });
    await expect(cta).toHaveAttribute("href", "/fr/rdv?type=particulier");

    // Le lien e-mail reste présent, en secondaire, et pointe toujours en mailto:.
    const email = contact.getByRole("link", { name: CONTACT_EMAIL });
    await expect(email).toHaveAttribute("href", new RegExp(`^mailto:${CONTACT_EMAIL}`));
    // Les deux actions sont bien deux liens distincts.
    await expect(cta).not.toHaveAttribute("href", new RegExp("^mailto:"));
  });

  test("le mailto conserve un objet pré-rempli", async ({ page }) => {
    const contact = await contactSection(page, "/fr");
    const email = contact.getByRole("link", { name: CONTACT_EMAIL });
    await expect(email).toHaveAttribute("href", /mailto:.*\?subject=/);
  });

  test("l'adresse e-mail est forcée en LTR (lisible en RTL)", async ({ page }) => {
    const contact = await contactSection(page, "/he/particuliers");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const email = contact.getByRole("link", { name: CONTACT_EMAIL });
    await expect(email).toHaveAttribute("dir", "ltr");
  });
});

// ---------------------------------------------------------------------------
// C. i18n & RTL — le CTA reste typé dans les trois langues
// ---------------------------------------------------------------------------
test.describe("CTA contact — i18n & RTL", () => {
  for (const locale of LOCALES) {
    test(`${locale} : CTA typé + offre -20 % présents`, async ({ page }) => {
      const contact = await contactSection(page, `/${locale}/entreprises`);
      const cta = contact.getByRole("link", { name: CONTACT_CTA[locale] });
      await expect(cta).toHaveAttribute("href", `/${locale}/rdv?type=entreprise`);
      await expect(contact).toContainText(/20\s*%/);
    });
  }
});

// ---------------------------------------------------------------------------
// D. Responsive — cible tactile du lien e-mail secondaire
// ---------------------------------------------------------------------------
test.describe("Responsive — cible tactile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("le lien e-mail respecte une hauteur de cible d'au moins 44 px", async ({ page }) => {
    const contact = await contactSection(page, "/fr/particuliers");
    const email = contact.getByRole("link", { name: CONTACT_EMAIL });
    await email.scrollIntoViewIfNeeded();
    const box = await email.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });
});
