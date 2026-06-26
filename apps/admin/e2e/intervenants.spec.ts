import { test, expect, type Page } from "@playwright/test";
import type { Equipe, Intervenant } from "@hymea/shared";
import { makeEquipe, makeIntervenant, mockAuth, seedSession } from "./fixtures";

const EQUIPES: Equipe[] = [
  makeEquipe({ id: "eq-1", nom: "Tel-Aviv" }),
  makeEquipe({ id: "eq-2", nom: "Haïfa" }),
];
const TEAM: Intervenant[] = [
  makeIntervenant({ id: "iv-1", nom: "Levi", prenom: "Dan", equipeId: "eq-1", actif: true }),
  makeIntervenant({ id: "iv-2", nom: "Cohen", prenom: "Sarah", equipeId: null, actif: false }),
];

/** Mocks CRUD intervenants + équipes en mémoire. */
async function mockCrud(
  page: Page,
  opts: { intervenants?: Intervenant[]; equipes?: Equipe[] } = {},
): Promise<void> {
  let ivStore = [...(opts.intervenants ?? TEAM)];
  let eqStore = [...(opts.equipes ?? EQUIPES)];

  await page.route(/\/api\/intervenants(\?|$)/, async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as Partial<Intervenant>;
      const created = makeIntervenant({ id: "iv-new", actif: true, ...body });
      ivStore = [created, ...ivStore];
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(created),
      });
      return;
    }
    const actif = new URL(route.request().url()).searchParams.get("actif");
    const list = actif === null ? ivStore : ivStore.filter((i) => i.actif === (actif === "true"));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(list),
    });
  });

  await page.route(/\/api\/intervenants\/[\w-]+$/, async (route) => {
    const id = route.request().url().split("/").pop() ?? "";
    const current = ivStore.find((i) => i.id === id) ?? makeIntervenant({ id });
    if (route.request().method() === "DELETE") {
      const updated = { ...current, actif: false };
      ivStore = ivStore.map((i) => (i.id === id ? updated : i));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(updated),
      });
      return;
    }
    const body = route.request().postDataJSON() as Partial<Intervenant>;
    const updated = { ...current, ...body };
    ivStore = ivStore.map((i) => (i.id === id ? updated : i));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(updated),
    });
  });

  await page.route(/\/api\/equipes(\?|$)/, async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { nom: string };
      const created = makeEquipe({ id: "eq-new", nom: body.nom });
      eqStore = [...eqStore, created];
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
      body: JSON.stringify(eqStore),
    });
  });

  await page.route(/\/api\/equipes\/[\w-]+$/, async (route) => {
    const id = route.request().url().split("/").pop() ?? "";
    if (route.request().method() === "DELETE") {
      eqStore = eqStore.filter((e) => e.id !== id);
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    const body = route.request().postDataJSON() as { nom: string };
    eqStore = eqStore.map((e) => (e.id === id ? { ...e, nom: body.nom } : e));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id, nom: body.nom }),
    });
  });
}

test.describe("Back-office — Intervenants (#40)", () => {
  test.beforeEach(async ({ page, context }) => {
    await seedSession(context);
    await mockAuth(page, { refresh: "ok" });
  });

  test("affiche la liste avec colonnes et lignes", async ({ page }) => {
    await mockCrud(page);
    await page.goto("/admin/intervenants");
    await expect(page.getByRole("heading", { name: "Intervenants" })).toBeVisible();
    for (const col of ["Nom", "Équipe", "État", "Actions"]) {
      await expect(page.getByRole("columnheader", { name: col })).toBeVisible();
    }
    await expect(page.getByText("Levi Dan")).toBeVisible();
    await expect(page.getByText("Cohen Sarah")).toBeVisible();
  });

  test("affiche l'état vide", async ({ page }) => {
    await mockCrud(page, { intervenants: [] });
    await page.goto("/admin/intervenants");
    await expect(page.getByText("Aucun intervenant pour ces filtres.")).toBeVisible();
  });

  test("affiche l'état d'erreur avec Réessayer", async ({ page }) => {
    await page.route(/\/api\/intervenants(\?|$)/, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
    );
    await page.route(/\/api\/equipes(\?|$)/, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await page.goto("/admin/intervenants");
    await expect(page.getByText("Impossible de charger les intervenants.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  });

  test("filtre par état actif", async ({ page }) => {
    await mockCrud(page);
    await page.goto("/admin/intervenants");
    await page.getByLabel("État").selectOption("actifs");
    await expect(page.getByText("Levi Dan")).toBeVisible();
    await expect(page.getByText("Cohen Sarah")).toHaveCount(0);
  });

  test("filtre par équipe", async ({ page }) => {
    await mockCrud(page);
    await page.goto("/admin/intervenants");
    await page.getByLabel("Équipe").selectOption("eq-1");
    await expect(page.getByText("Levi Dan")).toBeVisible();
    await expect(page.getByText("Cohen Sarah")).toHaveCount(0);
  });

  test("crée un intervenant (POST)", async ({ page }) => {
    await mockCrud(page);
    await page.goto("/admin/intervenants");
    await page.getByRole("button", { name: "+ Nouvel intervenant" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Nouvel intervenant" })).toBeVisible();
    await dialog.getByLabel("Nom", { exact: true }).fill("Mizrahi");
    await dialog.getByLabel("Prénom (optionnel)").fill("Yael");

    const req = page.waitForRequest(
      (r) => r.url().endsWith("/api/intervenants") && r.method() === "POST",
    );
    await dialog.getByRole("button", { name: "Créer" }).click();
    await req;
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Mizrahi Yael")).toBeVisible();
  });

  test("édite un intervenant (PATCH)", async ({ page }) => {
    await mockCrud(page);
    await page.goto("/admin/intervenants");
    await page
      .getByRole("row", { name: /Levi Dan/ })
      .getByRole("button", { name: "Modifier" })
      .click();
    await expect(page.getByRole("heading", { name: "Modifier l'intervenant" })).toBeVisible();
    await page.getByLabel("Nom", { exact: true }).fill("Levy");
    const req = page.waitForRequest(
      (r) => r.url().endsWith("/api/intervenants/iv-1") && r.method() === "PATCH",
    );
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await req;
    await expect(page.getByText("Levy Dan")).toBeVisible();
  });

  test("désactive un intervenant (DELETE) après confirmation", async ({ page }) => {
    await mockCrud(page);
    page.on("dialog", (d) => void d.accept());
    await page.goto("/admin/intervenants");
    const row = page.getByRole("row", { name: /Levi Dan/ });
    const req = page.waitForRequest(
      (r) => r.url().endsWith("/api/intervenants/iv-1") && r.method() === "DELETE",
    );
    await row.getByRole("button", { name: "Désactiver" }).click();
    await req;
    await expect(row.getByText("Inactif")).toBeVisible();
  });

  test("gère les équipes : création via la modale", async ({ page }) => {
    await mockCrud(page);
    await page.goto("/admin/intervenants");
    await page.getByRole("button", { name: "Gérer les équipes" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Gérer les équipes" })).toBeVisible();
    await dialog.getByLabel("Nouvelle équipe").fill("Jérusalem");
    const req = page.waitForRequest(
      (r) => r.url().endsWith("/api/equipes") && r.method() === "POST",
    );
    await dialog.getByRole("button", { name: "Ajouter" }).click();
    await req;
    await expect(dialog.getByLabel("Nom de l'équipe Jérusalem")).toBeVisible();
  });

  test("gère les équipes : suppression après confirmation", async ({ page }) => {
    await mockCrud(page);
    page.on("dialog", (d) => void d.accept());
    await page.goto("/admin/intervenants");
    await page.getByRole("button", { name: "Gérer les équipes" }).click();
    const dialog = page.getByRole("dialog");
    const req = page.waitForRequest(
      (r) => /\/api\/equipes\/eq-1$/.test(r.url()) && r.method() === "DELETE",
    );
    await dialog
      .getByRole("listitem")
      .filter({ has: page.getByLabel("Nom de l'équipe Tel-Aviv") })
      .getByRole("button", { name: "Supprimer" })
      .click();
    await req;
  });
});
