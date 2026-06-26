import { test, expect } from "@playwright/test";
import type { Client, ClientAvecHistorique, Paginated } from "@hymea/shared";
import {
  makeClient,
  makeRendezVous,
  mockAuth,
  mockClientHistorique,
  mockClientRgpd,
  mockClientsList,
  seedSession,
} from "./fixtures";

/** N clients distincts pour la liste. */
function clientRows(n: number, offset = 0): Client[] {
  return Array.from({ length: n }, (_, i) =>
    makeClient({
      id: `client-${offset + i}`,
      nom: `Nom${offset + i}`,
      prenom: "Test",
      email: `test${offset + i}@example.com`,
    }),
  );
}

function paginateClients(items: Client[], page = 1, pageSize = 100): Paginated<Client> {
  return { items, total: items.length, page, pageSize };
}

test.describe("Back-office — Liste clients (#37)", () => {
  test.beforeEach(async ({ page, context }) => {
    await seedSession(context);
    await mockAuth(page, { refresh: "ok" });
  });

  test("affiche la table avec colonnes et lignes", async ({ page }) => {
    mockClientsList(page, () => paginateClients(clientRows(3)));
    await page.goto("/admin/clients");

    await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();
    for (const col of ["Client", "Téléphone", "État", "Fiche créée le"]) {
      await expect(page.getByRole("columnheader", { name: col })).toBeVisible();
    }
    await expect(page.getByTestId("client-row")).toHaveCount(3);
  });

  test("affiche l'état vide", async ({ page }) => {
    mockClientsList(page, () => paginateClients([]));
    await page.goto("/admin/clients");
    await expect(page.getByText("Aucun client ne correspond à cette recherche.")).toBeVisible();
  });

  test("marque un client anonymisé dans la colonne État", async ({ page }) => {
    mockClientsList(page, () =>
      paginateClients([makeClient({ id: "client-a", anonymizedAt: "2026-06-01T00:00:00.000Z" })]),
    );
    await page.goto("/admin/clients");
    await expect(page.getByText("Anonymisé")).toBeVisible();
  });

  test("envoie la recherche débattue dans la requête", async ({ page }) => {
    mockClientsList(page, () => paginateClients(clientRows(1)));
    await page.goto("/admin/clients");

    const req = page.waitForRequest((r) => r.url().includes("search=cohen"));
    await page.getByLabel("Rechercher un client").fill("cohen");
    await req;
  });

  test("affiche l'état d'erreur avec Réessayer", async ({ page }) => {
    await page.route(/\/api\/clients(\?|$)/, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
    );
    await page.goto("/admin/clients");
    await expect(page.getByText("Impossible de charger les clients.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  });

  test("ouvre la fiche au clic sur une ligne", async ({ page }) => {
    mockClientsList(page, () => paginateClients(clientRows(2)));
    await mockClientHistorique(page, {
      "client-0": { client: makeClient({ id: "client-0" }), rendezVous: [] },
    });
    await page.goto("/admin/clients");

    await page.getByTestId("client-row").first().click();
    await expect(page).toHaveURL(/\/admin\/clients\/client-0/);
  });
});

test.describe("Back-office — Fiche client (#37)", () => {
  test.beforeEach(async ({ page, context }) => {
    await seedSession(context);
    await mockAuth(page, { refresh: "ok" });
  });

  test("affiche les coordonnées et l'historique", async ({ page }) => {
    const client = makeClient({ id: "client-1" });
    const data: ClientAvecHistorique = {
      client,
      rendezVous: [
        makeRendezVous({ id: "rdv-h1", statut: "REALISE" }),
        makeRendezVous({ id: "rdv-h2", statut: "ANNULE", debut: null }),
      ],
    };
    await mockClientHistorique(page, { "client-1": data });
    await page.goto("/admin/clients/client-1");

    await expect(page.getByRole("heading", { name: /Cohen\s+Sarah/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /sarah\.cohen@example\.com/ })).toBeVisible();
    await expect(page.getByTestId("history-row")).toHaveCount(2);
    await expect(page.getByText("Sans créneau")).toBeVisible();
  });

  test("affiche un historique vide", async ({ page }) => {
    await mockClientHistorique(page, {
      "client-1": { client: makeClient({ id: "client-1" }), rendezVous: [] },
    });
    await page.goto("/admin/clients/client-1");
    await expect(page.getByText("Aucun rendez-vous enregistré.")).toBeVisible();
  });

  test("affiche un message si le client est introuvable (404)", async ({ page }) => {
    await mockClientHistorique(page, {});
    await page.goto("/admin/clients/inconnu");
    await expect(page.getByText("Ce client est introuvable.")).toBeVisible();
  });

  test("anonymise le client via la modale", async ({ page }) => {
    const client = makeClient({ id: "client-1" });
    await mockClientHistorique(page, { "client-1": { client, rendezVous: [] } });
    const cap = mockClientRgpd(page, client);
    await page.goto("/admin/clients/client-1");

    await page.getByRole("button", { name: "Anonymiser" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const req = page.waitForRequest((r) => r.url().includes("/clients/client-1/anonymisation"));
    await dialog.getByRole("button", { name: "Anonymiser" }).click();
    await req;

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Anonymisé").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Déjà anonymisé" })).toBeDisabled();
    expect(cap.anonymized).toHaveLength(1);
  });

  test("supprime le client et redirige vers la liste", async ({ page }) => {
    const client = makeClient({ id: "client-1" });
    await mockClientHistorique(page, { "client-1": { client, rendezVous: [] } });
    const cap = mockClientRgpd(page, client);
    mockClientsList(page, () => paginateClients(clientRows(1)));
    await page.goto("/admin/clients/client-1");

    await page.getByRole("button", { name: "Supprimer définitivement" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const req = page.waitForRequest(
      (r) => r.url().includes("/clients/client-1") && r.method() === "DELETE",
    );
    await dialog.getByRole("button", { name: "Supprimer définitivement" }).click();
    await req;

    await expect(page).toHaveURL(/\/admin\/clients$/);
    expect(cap.deleted).toHaveLength(1);
  });

  test("ferme la modale de suppression avec le bouton Annuler", async ({ page }) => {
    const client = makeClient({ id: "client-1" });
    await mockClientHistorique(page, { "client-1": { client, rendezVous: [] } });
    mockClientRgpd(page, client);
    await page.goto("/admin/clients/client-1");

    await page.getByRole("button", { name: "Supprimer définitivement" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("masque les coordonnées d'un client déjà anonymisé", async ({ page }) => {
    const client = makeClient({
      id: "client-1",
      nom: "—",
      prenom: "—",
      anonymizedAt: "2026-06-01T00:00:00.000Z",
    });
    await mockClientHistorique(page, { "client-1": { client, rendezVous: [] } });
    await page.goto("/admin/clients/client-1");

    await expect(page.getByRole("button", { name: "Déjà anonymisé" })).toBeDisabled();
  });

  test("reste lisible en viewport mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await mockClientHistorique(page, {
      "client-1": { client: makeClient({ id: "client-1" }), rendezVous: [] },
    });
    await page.goto("/admin/clients/client-1");
    await expect(page.getByRole("heading", { name: "Données personnelles (RGPD)" })).toBeVisible();
  });
});
