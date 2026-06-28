import { test, expect, type Page } from "@playwright/test";
import {
  acceptConsent,
  expectConfirmation,
  fillCoordinates,
  FR,
  mockRdvApi,
  pickFirstSlot,
} from "./support/rdv";

/**
 * Suite E2E du funnel RDV en 4 étapes (#28).
 *
 * Couvre : chargement, pré-sélection `?type=`, parcours complets particulier
 * (créneau obligatoire) et entreprise/mall (recontact optionnel), validation des
 * champs (CDC 5.2), états d'erreur API (créneaux, 429), indices de CTA désactivé,
 * i18n FR/EN/HE + RTL, liens depuis les pages univers, accessibilité.
 *
 * L'API publique est entièrement mockée (indisponible en CI).
 */

const LOCALES = ["fr", "en", "he"] as const;
const HEADING_LEVEL1 = 1;

const RDV_TITLE: Record<(typeof LOCALES)[number], RegExp> = {
  fr: /Composons votre rendez-vous/i,
  en: /set up your appointment/i,
  he: /נרכיב יחד את התור/,
};

async function gotoFunnel(page: Page, locale: string, type?: string) {
  await mockRdvApi(page);
  await page.goto(`/${locale}/rdv${type ? `?type=${type}` : ""}`);
  await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toBeVisible();
}

test.describe("Funnel RDV", () => {
  // ---------------------------------------------------------------------------
  // A. Chargement & i18n
  // ---------------------------------------------------------------------------
  test.describe("Chargement et i18n", () => {
    for (const locale of LOCALES) {
      test(`/${locale}/rdv affiche le titre et le fil d'étapes`, async ({ page }) => {
        await gotoFunnel(page, locale);
        await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toContainText(
          RDV_TITLE[locale],
        );
        await expect(page.getByRole("list").first()).toBeVisible();
        await expect(page).toHaveTitle(/HYMEA/);
      });
    }

    test("html porte dir=rtl en hébreu", async ({ page }) => {
      await gotoFunnel(page, "he");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    });

    test("une seule balise h1 sur la page", async ({ page }) => {
      await gotoFunnel(page, "fr", "particulier");
      await expect(page.getByRole("heading", { level: HEADING_LEVEL1 })).toHaveCount(1);
    });
  });

  // ---------------------------------------------------------------------------
  // B. Pré-sélection du type via ?type=
  // ---------------------------------------------------------------------------
  test.describe("Pré-sélection du type", () => {
    test("?type=particulier active la carte et charge les prestations", async ({ page }) => {
      await gotoFunnel(page, "fr", "particulier");
      await expect(page.getByRole("button", { name: FR.typeParticulier })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(page.getByRole("radio")).toHaveCount(2);
    });

    test("un ?type= invalide ne pré-sélectionne rien", async ({ page }) => {
      await gotoFunnel(page, "fr", "banane");
      await expect(page.getByRole("button", { name: FR.typeParticulier })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      await expect(page.getByRole("radio")).toHaveCount(0);
    });
  });

  // ---------------------------------------------------------------------------
  // C. Parcours complets
  // ---------------------------------------------------------------------------
  test.describe("Parcours complets", () => {
    test("particulier : service → coordonnées → créneau → validation → confirmation", async ({
      page,
    }) => {
      await gotoFunnel(page, "fr", "particulier");

      // Étape 1 — prestation
      await page.getByRole("radio").first().check();
      await page.getByRole("button", { name: FR.next }).click();

      // Étape 2 — coordonnées (adresse requise)
      await fillCoordinates(page, true);
      await page.getByRole("button", { name: FR.next }).click();

      // Étape 3 — créneau obligatoire
      await pickFirstSlot(page);
      await page.getByRole("button", { name: FR.next }).click();

      // Étape 4 — validation
      await acceptConsent(page);
      await page.getByRole("button", { name: FR.submit }).click();

      await expectConfirmation(page);
    });

    test("entreprise : recontact optionnel sans créneau → confirmation", async ({ page }) => {
      await gotoFunnel(page, "fr", "entreprise");

      await page.getByRole("radio").first().check();
      await page.getByRole("button", { name: FR.next }).click();

      await fillCoordinates(page, false);
      await page.getByRole("button", { name: FR.next }).click();

      // Étape créneau optionnelle : on demande à être recontacté
      await page.getByRole("checkbox", { name: FR.contactToggle }).check();
      await page.getByRole("button", { name: FR.next }).click();

      await acceptConsent(page);
      await page.getByRole("button", { name: FR.submit }).click();

      await expectConfirmation(page);
    });
  });

  // ---------------------------------------------------------------------------
  // D. Validation des champs
  // ---------------------------------------------------------------------------
  test.describe("Validation", () => {
    async function reachDetails(page: Page) {
      await gotoFunnel(page, "fr", "particulier");
      await page.getByRole("radio").first().check();
      await page.getByRole("button", { name: FR.next }).click();
    }

    test("champs vides : erreurs obligatoires affichées", async ({ page }) => {
      await reachDetails(page);
      await page.getByRole("button", { name: FR.next }).click();
      await expect(page.locator("#rdv-nom-error")).toBeVisible();
      await expect(page.locator("#rdv-email-error")).toBeVisible();
    });

    test("email invalide : message dédié", async ({ page }) => {
      await reachDetails(page);
      await page.locator("#rdv-nom").fill("Cohen");
      await page.locator("#rdv-prenom").fill("David");
      await page.locator("#rdv-email").fill("pas-un-email");
      await page.locator("#rdv-telephone").fill("+972500000000");
      await page.locator("#rdv-adresse").fill("12 rue Herzl");
      await page.getByRole("button", { name: FR.next }).click();
      await expect(page.locator("#rdv-email-error")).toContainText(/e-mail valide/i);
    });

    test("particulier sans adresse : erreur sur l'adresse", async ({ page }) => {
      await reachDetails(page);
      await fillCoordinates(page, false); // adresse laissée vide
      await page.getByRole("button", { name: FR.next }).click();
      await expect(page.locator("#rdv-adresse-error")).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // E. CTA désactivé : indice contextuel
  // ---------------------------------------------------------------------------
  test.describe("Indice de CTA désactivé", () => {
    test("étape service : indice tant qu'aucune prestation choisie", async ({ page }) => {
      await gotoFunnel(page, "fr", "particulier");
      await expect(page.getByText(/Sélectionnez une prestation/i)).toBeVisible();
      await expect(page.getByRole("button", { name: FR.next })).toBeDisabled();
      await page.getByRole("radio").first().check();
      await expect(page.getByRole("button", { name: FR.next })).toBeEnabled();
    });
  });

  // ---------------------------------------------------------------------------
  // F. États d'erreur API
  // ---------------------------------------------------------------------------
  test.describe("Erreurs API", () => {
    test("créneaux indisponibles : message + bouton Réessayer", async ({ page }) => {
      await mockRdvApi(page, { slotsError: true });
      await page.goto("/fr/rdv?type=particulier");
      await page.getByRole("radio").first().check();
      await page.getByRole("button", { name: FR.next }).click();
      await fillCoordinates(page, true);
      await page.getByRole("button", { name: FR.next }).click();
      await page.getByRole("button", { name: FR.nextMonth }).click();
      await page.getByRole("button", { name: "15", exact: true }).click();
      await expect(page.getByRole("button", { name: /Réessayer/i })).toBeVisible();
    });

    test("limite de débit (429) : message dédié à la soumission", async ({ page }) => {
      await mockRdvApi(page, { rateLimited: true });
      await page.goto("/fr/rdv?type=entreprise");
      await page.getByRole("radio").first().check();
      await page.getByRole("button", { name: FR.next }).click();
      await fillCoordinates(page, false);
      await page.getByRole("button", { name: FR.next }).click();
      await page.getByRole("checkbox", { name: FR.contactToggle }).check();
      await page.getByRole("button", { name: FR.next }).click();
      await acceptConsent(page);
      await page.getByRole("button", { name: FR.submit }).click();
      await expect(page.getByText(/Trop de demandes/i)).toBeVisible();
    });

    test("aucune prestation active : état vide", async ({ page }) => {
      await mockRdvApi(page, { emptyPrestations: true });
      await page.goto("/fr/rdv?type=mall");
      await expect(page.getByText(/Aucune prestation disponible/i)).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // G. CTA adaptatif du bloc contact → funnel RDV
  // ---------------------------------------------------------------------------
  test.describe("CTA adaptatif du bloc contact", () => {
    const CONTACT_CTA = "Prendre rendez-vous";

    // Sur les pages univers, le CTA du bloc contact est pré-filtré sur le type.
    const TYPED_CASES = [
      { path: "centres-commerciaux", type: "mall" },
      { path: "entreprises", type: "entreprise" },
      { path: "particuliers", type: "particulier" },
    ] as const;

    for (const { path, type } of TYPED_CASES) {
      test(`${path} : le CTA contact renvoie vers /rdv?type=${type}`, async ({ page }) => {
        await page.goto(`/fr/${path}`);
        const cta = page.locator("#contact").getByRole("link", { name: CONTACT_CTA });
        await expect(cta).toHaveAttribute("href", `/fr/rdv?type=${type}`);
      });
    }

    // Hors univers (accueil, pages légales), le CTA mène au funnel générique.
    const GENERIC_PATHS = ["", "mentions-legales"] as const;
    for (const path of GENERIC_PATHS) {
      test(`/${path || "(accueil)"} : le CTA contact renvoie vers /rdv générique`, async ({
        page,
      }) => {
        await page.goto(`/fr/${path}`);
        const cta = page.locator("#contact").getByRole("link", { name: CONTACT_CTA });
        await expect(cta).toHaveAttribute("href", "/fr/rdv");
      });
    }
  });
});
