import { test, expect } from "@playwright/test";
import type { Paginated, RendezVousDetail } from "@hymea/shared";
import {
  makePrestation,
  makeRdv,
  mockAuth,
  mockPrestations,
  mockRdvDetail,
  mockRdvList,
  paginate,
  seedSession,
} from "./fixtures";

/** Construit N lignes de RDV avec des ids/noms distincts. */
function rows(n: number, offset = 0): RendezVousDetail[] {
  return Array.from({ length: n }, (_, i) =>
    makeRdv({
      id: `rdv-${offset + i}`,
      client: {
        id: `client-${offset + i}`,
        nom: `Nom${offset + i}`,
        prenom: "Test",
        email: `test${offset + i}@example.com`,
        telephone: "+972500000000",
        locale: "fr",
        anonymizedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    }),
  );
}

test.describe("Back-office — Liste des RDV (#35)", () => {
  test.beforeEach(async ({ page, context }) => {
    await seedSession(context);
    await mockAuth(page, { refresh: "ok" });
    await mockPrestations(page, [
      makePrestation({ id: "prest-1", libelle: { fr: "Nettoyage premium", en: "x", he: "x" } }),
    ]);
  });

  test("affiche la table avec colonnes et lignes", async ({ page }) => {
    mockRdvList(page, () => paginate(rows(3)));
    await page.goto("/admin/rendez-vous");

    await expect(page.getByRole("heading", { name: "Rendez-vous" })).toBeVisible();
    for (const col of ["Client", "Créneau", "Prestation", "Type", "Statut"]) {
      await expect(page.getByRole("columnheader", { name: col })).toBeVisible();
    }
    await expect(page.getByTestId("rdv-row")).toHaveCount(3);
  });

  test("affiche l'état vide", async ({ page }) => {
    mockRdvList(page, () => paginate([]));
    await page.goto("/admin/rendez-vous");
    await expect(page.getByText("Aucun rendez-vous ne correspond à ces critères.")).toBeVisible();
  });

  test("envoie la recherche débattue dans la requête", async ({ page }) => {
    mockRdvList(page, () => paginate(rows(1)));
    await page.goto("/admin/rendez-vous");

    const req = page.waitForRequest((r) => r.url().includes("search=cohen"));
    await page.getByPlaceholder("Rechercher par nom, prénom ou email…").fill("cohen");
    await req;
  });

  test("applique le filtre statut et revient en page 1", async ({ page }) => {
    mockRdvList(page, () => paginate(rows(2)));
    await page.goto("/admin/rendez-vous");

    const req = page.waitForRequest(
      (r) => r.url().includes("statut=CONFIRME") && r.url().includes("page=1"),
    );
    await page.getByLabel("Statut").selectOption("CONFIRME");
    await req;
  });

  test("applique les filtres type de client et prestation", async ({ page }) => {
    mockRdvList(page, () => paginate(rows(2)));
    await page.goto("/admin/rendez-vous");

    const reqType = page.waitForRequest((r) => r.url().includes("typeClient=entreprise"));
    await page.getByLabel("Type de client").selectOption("entreprise");
    await reqType;

    const reqPrest = page.waitForRequest((r) => r.url().includes("prestationId=prest-1"));
    await page.getByLabel("Prestation").selectOption("prest-1");
    await reqPrest;
  });

  test("réinitialise les filtres", async ({ page }) => {
    mockRdvList(page, () => paginate(rows(2)));
    await page.goto("/admin/rendez-vous");

    await page.getByLabel("Statut").selectOption("CONFIRME");
    await expect(page.getByRole("button", { name: "Réinitialiser" })).toBeVisible();
    await page.getByRole("button", { name: "Réinitialiser" }).click();
    await expect(page.getByLabel("Statut")).toHaveValue("");
  });

  test("pagine et met à jour la position", async ({ page }) => {
    const total = 45;
    const pageSize = 20;
    mockRdvList(page, (params): Paginated<RendezVousDetail> => {
      const p = Number(params.get("page") ?? "1");
      const count = p < 3 ? pageSize : 5;
      return { items: rows(count, p * 100), total, page: p, pageSize };
    });

    // Clique « Suivant » et confirme qu'une requête de la page cible est partie ;
    // réessaie le clic tant qu'aucune ne part (hydratation lente de `next dev` en CI).
    async function next(targetPage: number): Promise<void> {
      const re = new RegExp(`[?&]page=${targetPage}(?:&|$)`);
      for (let attempt = 0; attempt < 6; attempt++) {
        const req = page
          .waitForRequest((r) => re.test(r.url()), { timeout: 2000 })
          .catch(() => null);
        await page.getByRole("button", { name: "Suivant" }).click();
        if (await req) return;
      }
      throw new Error(`Aucune requête page=${targetPage} après plusieurs clics`);
    }

    await page.goto("/admin/rendez-vous");
    await expect(page.getByTestId("pagination-range")).toHaveText("1–20 sur 45");
    await expect(page.getByRole("button", { name: "Précédent" })).toBeDisabled();

    await next(2);
    await expect(page.getByTestId("pagination-range")).toHaveText("21–40 sur 45");
    await expect(page.getByRole("button", { name: "Précédent" })).toBeEnabled();

    await next(3);
    await expect(page.getByTestId("pagination-range")).toHaveText("41–45 sur 45");
    await expect(page.getByRole("button", { name: "Suivant" })).toBeDisabled();
  });

  test("ouvre la fiche au clic et au clavier (Enter)", async ({ page }) => {
    const data = rows(2);
    mockRdvList(page, () => paginate(data));
    await mockRdvDetail(page, { "rdv-0": data[0]!, "rdv-1": data[1]! });
    await page.goto("/admin/rendez-vous");

    await page.getByTestId("rdv-row").first().click();
    await expect(page).toHaveURL(/\/admin\/rendez-vous\/rdv-0/);

    await page.goBack();
    await page.getByTestId("rdv-row").nth(1).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/admin\/rendez-vous\/rdv-1/);
  });

  test("affiche l'état d'erreur avec Réessayer", async ({ page }) => {
    await page.route(/\/api\/rendez-vous(\?|$)/, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
    );
    await page.goto("/admin/rendez-vous");
    await expect(page.getByText("Impossible de charger les rendez-vous.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  });
});

test.describe("Back-office — Fiche RDV (#34)", () => {
  test.beforeEach(async ({ page, context }) => {
    await seedSession(context);
    await mockAuth(page, { refresh: "ok" });
  });

  test("affiche les informations du RDV", async ({ page }) => {
    const rdv = makeRdv({ id: "rdv-7", statut: "CONFIRME" });
    await mockRdvDetail(page, { "rdv-7": rdv });
    await page.goto("/admin/rendez-vous/rdv-7");

    await expect(page.getByRole("heading", { name: /Cohen\s+Sarah/ })).toBeVisible();
    await expect(page.getByText("Nettoyage premium")).toBeVisible();
    await expect(page.getByText("Confirmé", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Retour à la liste/ })).toBeVisible();
  });

  test("affiche un message si le RDV est introuvable (404)", async ({ page }) => {
    await mockRdvDetail(page, {});
    await page.goto("/admin/rendez-vous/inconnu");
    await expect(page.getByText("Ce rendez-vous est introuvable.")).toBeVisible();
  });
});
