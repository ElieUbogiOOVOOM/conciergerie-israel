import { test, expect } from "@playwright/test";
import type { Prestation } from "@hymea/shared";
import { makePrestation, mockAuth, seedSession } from "./fixtures";

const CATALOG: Prestation[] = [
  makePrestation({
    id: "prest-1",
    libelle: { fr: "Nettoyage premium", en: "Premium", he: "ניקוי" },
    cible: "particulier",
    dureeMinutes: 90,
    actif: true,
  }),
  makePrestation({
    id: "prest-2",
    libelle: { fr: "Entretien bureaux", en: "Office", he: "משרד" },
    cible: "entreprise",
    dureeMinutes: 120,
    actif: false,
  }),
];

/** Mocks GET (liste) + POST (création) sur /api/prestations, et PATCH/DELETE sur /:id. */
async function mockCrud(page: import("@playwright/test").Page, catalog = CATALOG): Promise<void> {
  let store = [...catalog];
  await page.route(/\/api\/prestations(\?|$)/, async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as Partial<Prestation>;
      const created = makePrestation({ id: "prest-new", ...body });
      store = [created, ...store];
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(created),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(store),
    });
  });
  await page.route(/\/api\/prestations\/[\w-]+$/, async (route) => {
    const id = route.request().url().split("/").pop() ?? "";
    const method = route.request().method();
    const current = store.find((p) => p.id === id) ?? makePrestation({ id });
    if (method === "DELETE") {
      const updated = { ...current, actif: false };
      store = store.map((p) => (p.id === id ? updated : p));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(updated),
      });
      return;
    }
    const body = route.request().postDataJSON() as Partial<Prestation>;
    const updated = { ...current, ...body };
    store = store.map((p) => (p.id === id ? updated : p));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(updated),
    });
  });
}

test.describe("Back-office — Prestations (#39)", () => {
  test.beforeEach(async ({ page, context }) => {
    await seedSession(context);
    await mockAuth(page, { refresh: "ok" });
  });

  test("affiche la liste avec colonnes et lignes", async ({ page }) => {
    await mockCrud(page);
    await page.goto("/admin/prestations");

    await expect(page.getByRole("heading", { name: "Prestations" })).toBeVisible();
    for (const col of ["Libellé", "Cible", "Durée", "État", "Actions"]) {
      await expect(page.getByRole("columnheader", { name: col })).toBeVisible();
    }
    await expect(page.getByText("Nettoyage premium")).toBeVisible();
    await expect(page.getByText("Entretien bureaux")).toBeVisible();
  });

  test("affiche l'état vide", async ({ page }) => {
    await mockCrud(page, []);
    await page.goto("/admin/prestations");
    await expect(page.getByText("Aucune prestation pour ces filtres.")).toBeVisible();
  });

  test("affiche l'état d'erreur avec Réessayer", async ({ page }) => {
    await page.route(/\/api\/prestations(\?|$)/, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
    );
    await page.goto("/admin/prestations");
    await expect(page.getByText("Impossible de charger les prestations.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  });

  test("filtre par cible (client-side)", async ({ page }) => {
    await mockCrud(page);
    await page.goto("/admin/prestations");
    await expect(page.getByText("Entretien bureaux")).toBeVisible();
    await page.getByLabel("Cible").selectOption("particulier");
    await expect(page.getByText("Nettoyage premium")).toBeVisible();
    await expect(page.getByText("Entretien bureaux")).toHaveCount(0);
  });

  test("filtre par état inactif", async ({ page }) => {
    await mockCrud(page);
    await page.goto("/admin/prestations");
    await page.getByLabel("État").selectOption("inactives");
    await expect(page.getByText("Entretien bureaux")).toBeVisible();
    await expect(page.getByText("Nettoyage premium")).toHaveCount(0);
  });

  test("ouvre et ferme la modale de création (Échap)", async ({ page }) => {
    await mockCrud(page);
    await page.goto("/admin/prestations");
    await page.getByRole("button", { name: "+ Nouvelle prestation" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nouvelle prestation" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("ferme la modale via le bouton Annuler", async ({ page }) => {
    await mockCrud(page);
    await page.goto("/admin/prestations");
    await page.getByRole("button", { name: "+ Nouvelle prestation" }).click();
    await page.getByRole("button", { name: "Annuler" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("exige les libellés i18n (champs requis)", async ({ page }) => {
    await mockCrud(page);
    await page.goto("/admin/prestations");
    await page.getByRole("button", { name: "+ Nouvelle prestation" }).click();
    const dialog = page.getByRole("dialog");
    for (const lang of ["Français", "English", "עברית"]) {
      await expect(dialog.getByLabel(lang, { exact: true }).first()).toHaveAttribute(
        "required",
        "",
      );
    }
  });

  test("crée une prestation (POST) et l'ajoute à la liste", async ({ page }) => {
    await mockCrud(page);
    await page.goto("/admin/prestations");
    await page.getByRole("button", { name: "+ Nouvelle prestation" }).click();

    const dialog = page.getByRole("dialog");
    const libelle = dialog.getByRole("group", { name: "Libellé" });
    await libelle.getByLabel("Français", { exact: true }).fill("Lavage auto");
    await libelle.getByLabel("English", { exact: true }).fill("Car wash");
    await libelle.getByLabel("עברית", { exact: true }).fill("שטיפה");

    const req = page.waitForRequest(
      (r) => r.url().endsWith("/api/prestations") && r.method() === "POST",
    );
    await dialog.getByRole("button", { name: "Créer" }).click();
    await req;
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Lavage auto")).toBeVisible();
  });

  test("édite une prestation (PATCH)", async ({ page }) => {
    await mockCrud(page);
    await page.goto("/admin/prestations");
    await page
      .getByRole("row", { name: /Nettoyage premium/ })
      .getByRole("button", { name: "Modifier" })
      .click();
    await expect(page.getByRole("heading", { name: "Modifier la prestation" })).toBeVisible();

    await page.getByLabel("Durée (minutes)").fill("150");
    const req = page.waitForRequest(
      (r) => r.url().endsWith("/api/prestations/prest-1") && r.method() === "PATCH",
    );
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await req;
    await expect(page.getByText("150 min")).toBeVisible();
  });

  test("désactive une prestation (DELETE) après confirmation", async ({ page }) => {
    await mockCrud(page);
    page.on("dialog", (d) => void d.accept());
    await page.goto("/admin/prestations");

    const row = page.getByRole("row", { name: /Nettoyage premium/ });
    const req = page.waitForRequest(
      (r) => r.url().endsWith("/api/prestations/prest-1") && r.method() === "DELETE",
    );
    await row.getByRole("button", { name: "Désactiver" }).click();
    await req;
    await expect(row.getByText("Inactive")).toBeVisible();
  });
});
