import { test, expect, type Page } from "@playwright/test";
import {
  makeRdv,
  mockAuth,
  mockRdvDetail,
  mockRdvList,
  paginate,
  seedSession,
  todayAt,
} from "./fixtures";

/** Ouvre le planning authentifié (cookie + refresh OK déjà posés par l'appelant). */
async function gotoPlanning(page: Page): Promise<void> {
  await page.goto("/admin/planning");
}

test.describe("Back-office — Planning (#34)", () => {
  test.beforeEach(async ({ page, context }) => {
    await seedSession(context);
    await mockAuth(page, { refresh: "ok" });
  });

  test("affiche la toolbar, la légende et la vue Semaine par défaut", async ({ page }) => {
    mockRdvList(page, () => paginate([makeRdv()]));
    await gotoPlanning(page);

    await expect(page.getByRole("button", { name: "Aujourd'hui" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Changer de vue" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Semaine" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Légende des statuts (sémantique charte).
    await expect(page.getByText("Nouveau", { exact: true })).toBeVisible();
    await expect(page.getByText("Confirmé", { exact: true })).toBeVisible();
  });

  test("affiche les RDV teintés par statut", async ({ page }) => {
    mockRdvList(page, () =>
      paginate([
        makeRdv({ id: "rdv-1", statut: "NOUVEAU", debut: todayAt(10), fin: todayAt(11) }),
        makeRdv({ id: "rdv-2", statut: "CONFIRME", debut: todayAt(14), fin: todayAt(15) }),
      ]),
    );
    await gotoPlanning(page);

    const events = page.getByTestId("calendar-event");
    await expect(events.first()).toBeVisible();
    await expect(page.locator('[data-testid="calendar-event"][data-statut="NOUVEAU"]')).toHaveCount(
      1,
    );
    await expect(
      page.locator('[data-testid="calendar-event"][data-statut="CONFIRME"]'),
    ).toHaveCount(1);
  });

  test("bascule entre les vues Jour / Semaine / Mois", async ({ page }) => {
    mockRdvList(page, () => paginate([makeRdv()]));
    await gotoPlanning(page);

    await page.getByRole("button", { name: "Mois", exact: true }).click();
    await expect(page.getByRole("button", { name: "Mois", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // « Jour » exact pour ne pas capter « Aujourd'hui ».
    await page.getByRole("button", { name: "Jour", exact: true }).click();
    await expect(page.getByRole("button", { name: "Jour", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("navigue dans le temps (‹ / ›) et revient à aujourd'hui", async ({ page }) => {
    mockRdvList(page, () => paginate([makeRdv()]));
    await gotoPlanning(page);

    const label = page.locator("h1");
    const initial = (await label.textContent()) ?? "";
    await page.getByRole("button", { name: "Période suivante" }).click();
    await expect(label).not.toHaveText(initial);
    await page.getByRole("button", { name: "Aujourd'hui" }).click();
    await expect(label).toHaveText(initial);
  });

  test("supporte les raccourcis clavier (→ puis t)", async ({ page }) => {
    mockRdvList(page, () => paginate([makeRdv()]));
    await gotoPlanning(page);

    const label = page.locator("h1");
    const initial = (await label.textContent()) ?? "";
    await page.locator("body").press("ArrowRight");
    await expect(label).not.toHaveText(initial);
    await page.locator("body").press("t");
    await expect(label).toHaveText(initial);
  });

  test("ouvre la fiche au clic sur un RDV", async ({ page }) => {
    const rdv = makeRdv({ id: "rdv-42" });
    mockRdvList(page, () => paginate([rdv]));
    await mockRdvDetail(page, { "rdv-42": rdv });
    await gotoPlanning(page);

    await page.getByTestId("calendar-event").first().click();
    await expect(page).toHaveURL(/\/admin\/rendez-vous\/rdv-42/);
  });

  test("affiche l'état vide hors de la vue jour", async ({ page }) => {
    mockRdvList(page, () => paginate([]));
    await gotoPlanning(page);
    await expect(page.getByText("Aucun rendez-vous sur cette période.")).toBeVisible();
  });

  test("affiche l'état d'erreur avec Réessayer", async ({ page }) => {
    await page.route(/\/api\/rendez-vous(\?|$)/, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
    );
    await gotoPlanning(page);
    await expect(page.getByText("Impossible de charger le planning.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  });
});
