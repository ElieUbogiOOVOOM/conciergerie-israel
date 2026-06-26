import { test, expect } from "@playwright/test";
import {
  makeClient,
  makeIntervenant,
  makeRdv,
  mockAuth,
  mockIntervenants,
  mockRdvActions,
  seedSession,
} from "./fixtures";

/**
 * E2E des actions de la fiche RDV (#36) : changement de statut, attribution
 * d'un intervenant, replanification et annulation via modale. Toutes les routes
 * API sont mockées (aucun backend live).
 */
test.describe("Back-office — Fiche RDV actions (#36)", () => {
  test.beforeEach(async ({ page, context }) => {
    await seedSession(context);
    await mockAuth(page, { refresh: "ok" });
    await mockIntervenants(page, [
      makeIntervenant({ id: "int-1", nom: "Levy", prenom: "David" }),
      makeIntervenant({ id: "int-2", nom: "Azoulay", prenom: null }),
    ]);
  });

  test("affiche la fiche et le panneau d'actions", async ({ page }) => {
    mockRdvActions(page, makeRdv({ id: "rdv-1", statut: "NOUVEAU" }));
    await page.goto("/admin/rendez-vous/rdv-1");

    await expect(page.getByRole("heading", { name: /Cohen\s+Sarah/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Actions" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmer" })).toBeVisible();
    await expect(page.getByLabel("Attribuer un intervenant")).toBeVisible();
    await expect(page.getByLabel("Replanifier le créneau")).toBeVisible();
  });

  test("confirme un RDV nouveau et met à jour le statut", async ({ page }) => {
    const cap = mockRdvActions(page, makeRdv({ id: "rdv-1", statut: "NOUVEAU" }));
    await page.goto("/admin/rendez-vous/rdv-1");

    const req = page.waitForRequest(
      (r) => r.url().includes("/rendez-vous/rdv-1/statut") && r.method() === "PATCH",
    );
    await page.getByRole("button", { name: "Confirmer" }).click();
    await req;

    await expect(page.getByRole("status")).toContainText("Statut mis à jour");
    await expect(page.getByText("Confirmé", { exact: true })).toBeVisible();
    expect(cap.statut).toEqual(["CONFIRME"]);
    // La transition Confirmer n'est plus proposée (le RDV est désormais confirmé).
    await expect(page.getByRole("button", { name: "Confirmer" })).toHaveCount(0);
  });

  test("attribue un intervenant", async ({ page }) => {
    const cap = mockRdvActions(page, makeRdv({ id: "rdv-1", statut: "CONFIRME" }));
    await page.goto("/admin/rendez-vous/rdv-1");

    const req = page.waitForRequest((r) => r.url().includes("/rendez-vous/rdv-1/intervenant"));
    await page.getByLabel("Attribuer un intervenant").selectOption("int-1");
    await req;

    await expect(page.getByRole("status")).toContainText("Intervenant attribué");
    expect(cap.intervenant).toEqual(["int-1"]);
  });

  test("retire l'attribution en sélectionnant « Non attribué »", async ({ page }) => {
    const cap = mockRdvActions(
      page,
      makeRdv({ id: "rdv-1", statut: "CONFIRME", intervenantId: "int-1" }),
    );
    await page.goto("/admin/rendez-vous/rdv-1");

    const req = page.waitForRequest((r) => r.url().includes("/rendez-vous/rdv-1/intervenant"));
    await page.getByLabel("Attribuer un intervenant").selectOption("");
    await req;

    await expect(page.getByRole("status")).toContainText("Attribution retirée");
    expect(cap.intervenant).toEqual([null]);
  });

  test("replanifie sur un nouveau créneau", async ({ page }) => {
    const cap = mockRdvActions(page, makeRdv({ id: "rdv-1", statut: "CONFIRME" }));
    await page.goto("/admin/rendez-vous/rdv-1");

    await page.getByLabel("Replanifier le créneau").fill("2026-08-01T10:00");
    const req = page.waitForRequest((r) => r.url().includes("/rendez-vous/rdv-1/replanification"));
    await page.getByRole("button", { name: "Replanifier" }).click();
    await req;

    await expect(page.getByRole("status")).toContainText("replanifié");
    await expect(page.getByText("Replanifié", { exact: true })).toBeVisible();
    expect(cap.reschedule).toHaveLength(1);
  });

  test("annule un RDV via la modale de confirmation", async ({ page }) => {
    const cap = mockRdvActions(page, makeRdv({ id: "rdv-1", statut: "CONFIRME" }));
    await page.goto("/admin/rendez-vous/rdv-1");

    await page.getByRole("button", { name: "Annuler le RDV" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("notifié par email");

    const req = page.waitForRequest((r) => r.url().includes("/rendez-vous/rdv-1/statut"));
    await dialog.getByRole("button", { name: "Annuler le RDV" }).click();
    await req;

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Annulé", { exact: true })).toBeVisible();
    expect(cap.statut).toEqual(["ANNULE"]);
  });

  test("ferme la modale d'annulation avec Échap sans annuler", async ({ page }) => {
    const cap = mockRdvActions(page, makeRdv({ id: "rdv-1", statut: "CONFIRME" }));
    await page.goto("/admin/rendez-vous/rdv-1");

    await page.getByRole("button", { name: "Annuler le RDV" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(cap.statut).toEqual([]);
  });

  test("place le focus sur la confirmation à l'ouverture de la modale", async ({ page }) => {
    mockRdvActions(page, makeRdv({ id: "rdv-1", statut: "CONFIRME" }));
    await page.goto("/admin/rendez-vous/rdv-1");

    await page.getByRole("button", { name: "Annuler le RDV" }).click();
    const confirm = page.getByRole("dialog").getByRole("button", { name: "Annuler le RDV" });
    await expect(confirm).toBeFocused();
  });

  test("masque les actions pour un statut terminal (réalisé)", async ({ page }) => {
    mockRdvActions(page, makeRdv({ id: "rdv-1", statut: "REALISE" }));
    await page.goto("/admin/rendez-vous/rdv-1");

    await expect(page.getByText("Ce rendez-vous est clôturé")).toBeVisible();
    await expect(page.getByText("ne peut pas être")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmer" })).toHaveCount(0);
    await expect(page.getByLabel("Replanifier le créneau")).toHaveCount(0);
  });

  test("affiche une erreur si la transition est refusée (409)", async ({ page }) => {
    await page.route(/\/api\/rendez-vous\/rdv-1\/statut$/, (route) =>
      route.fulfill({ status: 409, contentType: "application/json", body: "{}" }),
    );
    await page.route(/\/api\/rendez-vous\/rdv-1$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeRdv({ id: "rdv-1", statut: "NOUVEAU" })),
      }),
    );
    await page.goto("/admin/rendez-vous/rdv-1");

    await page.getByRole("button", { name: "Confirmer" }).click();
    await expect(page.getByRole("status")).toContainText("Action impossible");
  });

  test("le nom du client renvoie vers sa fiche", async ({ page }) => {
    mockRdvActions(page, makeRdv({ id: "rdv-1", client: makeClient({ id: "client-9" }) }));
    await page.goto("/admin/rendez-vous/rdv-1");

    await expect(page.getByRole("link", { name: /Cohen/ })).toHaveAttribute(
      "href",
      "/admin/clients/client-9",
    );
  });

  test("reste utilisable en viewport mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    mockRdvActions(page, makeRdv({ id: "rdv-1", statut: "NOUVEAU" }));
    await page.goto("/admin/rendez-vous/rdv-1");

    await expect(page.getByRole("heading", { name: "Actions" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmer" })).toBeVisible();
  });
});
