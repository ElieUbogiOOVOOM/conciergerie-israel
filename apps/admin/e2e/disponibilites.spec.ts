import { test, expect } from "@playwright/test";
import { makeException, makeRegle, mockAuth, mockDisponibilites, seedSession } from "./fixtures";

/**
 * E2E de la gestion des disponibilités (#38) : règles hebdomadaires et
 * exceptions/blocages. CRUD mocké sur un état en mémoire.
 */
test.describe("Back-office — Disponibilités (#38)", () => {
  test.beforeEach(async ({ page, context }) => {
    await seedSession(context);
    await mockAuth(page, { refresh: "ok" });
  });

  test("affiche les deux sections et leurs états vides", async ({ page }) => {
    mockDisponibilites(page, { regles: [], exceptions: [] });
    await page.goto("/admin/disponibilites");

    await expect(page.getByRole("heading", { name: "Disponibilités" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Horaires d.ouverture/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Exceptions & blocages/ })).toBeVisible();
    await expect(page.getByText("Aucun horaire défini.")).toBeVisible();
    await expect(page.getByText("Aucune exception définie.")).toBeVisible();
  });

  test("liste les règles et exceptions existantes", async ({ page }) => {
    mockDisponibilites(page, {
      regles: [makeRegle({ id: "r1", jour: 1, debut: "09:00", fin: "18:00" })],
      exceptions: [makeException({ id: "x1", motif: "Jour férié" })],
    });
    await page.goto("/admin/disponibilites");

    await expect(page.getByTestId("regle-row")).toHaveCount(1);
    await expect(page.getByTestId("regle-row")).toContainText("Lundi");
    await expect(page.getByTestId("regle-row")).toContainText("09:00 – 18:00");
    await expect(page.getByTestId("exception-row")).toContainText("Jour férié");
    await expect(page.getByTestId("exception-row")).toContainText("Fermé");
  });

  test("ajoute une règle hebdomadaire", async ({ page }) => {
    mockDisponibilites(page, { regles: [], exceptions: [] });
    await page.goto("/admin/disponibilites");

    await page.getByLabel("Jour").selectOption("2"); // Mardi
    await page.getByLabel("Ouverture").fill("08:30");
    await page.getByLabel("Fermeture").fill("17:00");

    const req = page.waitForRequest(
      (r) => r.url().includes("/disponibilites/regles") && r.method() === "POST",
    );
    await page.getByRole("button", { name: /Ajouter l.horaire/ }).click();
    await req;

    await expect(page.getByTestId("regle-row")).toHaveCount(1);
    await expect(page.getByTestId("regle-row")).toContainText("Mardi");
    await expect(page.getByTestId("regle-row")).toContainText("08:30 – 17:00");
  });

  test("refuse une règle dont la fin précède le début", async ({ page }) => {
    mockDisponibilites(page, { regles: [], exceptions: [] });
    await page.goto("/admin/disponibilites");

    await page.getByLabel("Ouverture").fill("18:00");
    await page.getByLabel("Fermeture").fill("09:00");
    await page.getByRole("button", { name: /Ajouter l.horaire/ }).click();

    await expect(page.getByText("L'heure de fin doit être postérieure")).toBeVisible();
    await expect(page.getByTestId("regle-row")).toHaveCount(0);
  });

  test("supprime une règle", async ({ page }) => {
    mockDisponibilites(page, {
      regles: [makeRegle({ id: "r1", jour: 1 })],
      exceptions: [],
    });
    await page.goto("/admin/disponibilites");

    await expect(page.getByTestId("regle-row")).toHaveCount(1);
    const req = page.waitForRequest(
      (r) => r.url().includes("/disponibilites/regles/r1") && r.method() === "DELETE",
    );
    await page.getByTestId("regle-row").getByRole("button", { name: "Supprimer" }).click();
    await req;
    await expect(page.getByTestId("regle-row")).toHaveCount(0);
  });

  test("ajoute une exception de blocage", async ({ page }) => {
    mockDisponibilites(page, { regles: [], exceptions: [] });
    await page.goto("/admin/disponibilites");

    await page.getByLabel("Du").fill("2026-08-10");
    await page.getByLabel("Au").fill("2026-08-12");
    await page.getByLabel("Motif (optionnel)").fill("Congés");

    const req = page.waitForRequest(
      (r) => r.url().includes("/disponibilites/exceptions") && r.method() === "POST",
    );
    await page.getByRole("button", { name: /Ajouter l.exception/ }).click();
    await req;

    await expect(page.getByTestId("exception-row")).toHaveCount(1);
    await expect(page.getByTestId("exception-row")).toContainText("Congés");
    await expect(page.getByTestId("exception-row")).toContainText("Fermé");
  });

  test("crée une ouverture exceptionnelle quand « Bloqué » est décoché", async ({ page }) => {
    mockDisponibilites(page, { regles: [], exceptions: [] });
    await page.goto("/admin/disponibilites");

    await page.getByLabel("Du").fill("2026-08-10");
    await page.getByLabel("Au").fill("2026-08-10");
    await page.getByLabel("Bloqué (fermé)").uncheck();

    const req = page.waitForRequest(
      (r) => r.url().includes("/disponibilites/exceptions") && r.method() === "POST",
    );
    await page.getByRole("button", { name: /Ajouter l.exception/ }).click();
    await req;

    await expect(page.getByTestId("exception-row")).toContainText("Ouvert");
  });

  test("refuse une exception sans dates", async ({ page }) => {
    mockDisponibilites(page, { regles: [], exceptions: [] });
    await page.goto("/admin/disponibilites");

    await page.getByRole("button", { name: /Ajouter l.exception/ }).click();
    await expect(page.getByText("Renseignez les dates de début et de fin.")).toBeVisible();
    await expect(page.getByTestId("exception-row")).toHaveCount(0);
  });

  test("supprime une exception", async ({ page }) => {
    mockDisponibilites(page, {
      regles: [],
      exceptions: [makeException({ id: "x1" })],
    });
    await page.goto("/admin/disponibilites");

    const req = page.waitForRequest(
      (r) => r.url().includes("/disponibilites/exceptions/x1") && r.method() === "DELETE",
    );
    await page.getByTestId("exception-row").getByRole("button", { name: "Supprimer" }).click();
    await req;
    await expect(page.getByTestId("exception-row")).toHaveCount(0);
  });

  test("affiche l'état d'erreur avec Réessayer", async ({ page }) => {
    await page.route(/\/api\/disponibilites\/regles$/, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
    );
    await page.route(/\/api\/disponibilites\/exceptions$/, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
    );
    await page.goto("/admin/disponibilites");

    await expect(page.getByText("Impossible de charger les disponibilités.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  });

  test("reste utilisable en viewport mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    mockDisponibilites(page, { regles: [], exceptions: [] });
    await page.goto("/admin/disponibilites");
    await expect(page.getByRole("heading", { name: "Disponibilités" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ajouter l.horaire/ })).toBeVisible();
  });
});
