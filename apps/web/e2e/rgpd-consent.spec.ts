import { test, expect, type Page } from "@playwright/test";
import { fillCoordinates, FR, mockRdvApi } from "./support/rdv";

/**
 * Suite E2E du consentement RGPD et de l'anti-spam (#29).
 *
 * Couvre : bouton Valider désactivé tant que le consentement n'est pas coché,
 * lien vers la politique de confidentialité, honeypot invisible hors tab order,
 * absence de widget Turnstile sans site key (dégradation gracieuse), et payload
 * envoyé à l'API (consentement true, website vide, pas de jeton Turnstile).
 */

/** Mène le funnel jusqu'à l'étape de validation via le parcours entreprise (sans créneau). */
async function reachValidation(page: Page) {
  await mockRdvApi(page);
  await page.goto("/fr/rdv?type=entreprise");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: FR.next }).click();
  await fillCoordinates(page, false);
  await page.getByRole("button", { name: FR.next }).click();
  await page.getByRole("checkbox", { name: FR.contactToggle }).check();
  await page.getByRole("button", { name: FR.next }).click();
}

test.describe("Consentement RGPD & anti-spam", () => {
  test("le bouton Valider est désactivé tant que le consentement n'est pas coché", async ({
    page,
  }) => {
    await reachValidation(page);
    const submit = page.getByRole("button", { name: FR.submit });
    await expect(submit).toBeDisabled();
    await expect(page.getByText(/Cochez le consentement/i)).toBeVisible();

    await page.getByRole("checkbox").check();
    await expect(submit).toBeEnabled();
  });

  test("le label de consentement renvoie vers la politique de confidentialité", async ({
    page,
  }) => {
    await reachValidation(page);
    // Lien inline du consentement (dans le funnel), distinct de celui du footer.
    const link = page.getByRole("main").getByRole("link", {
      name: /politique de confidentialité/i,
    });
    await expect(link).toHaveAttribute("href", "/fr/politique-confidentialite");
  });

  test("le champ honeypot est présent, vide et hors du tab order", async ({ page }) => {
    await reachValidation(page);
    const honeypot = page.locator('input[name="website"]');
    await expect(honeypot).toHaveCount(1);
    await expect(honeypot).toHaveAttribute("tabindex", "-1");
    await expect(honeypot).toHaveValue("");
  });

  test("aucun widget Turnstile n'est rendu sans site key", async ({ page }) => {
    await reachValidation(page);
    await expect(page.locator('iframe[src*="challenges.cloudflare.com"]')).toHaveCount(0);
  });

  test("le payload envoyé porte le consentement et un honeypot vide", async ({ page }) => {
    await reachValidation(page);
    await page.getByRole("checkbox").check();

    const requestPromise = page.waitForRequest("**/rendez-vous");
    await page.getByRole("button", { name: FR.submit }).click();
    const request = await requestPromise;

    expect(request.method()).toBe("POST");
    const body = request.postDataJSON();
    expect(body.consentement).toBe(true);
    expect(body.website).toBe("");
    expect(body.typeClient).toBe("entreprise");
    // Sans site key, aucun jeton n'est transmis.
    expect(body.turnstileToken).toBeUndefined();
  });
});
