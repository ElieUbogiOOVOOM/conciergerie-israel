import { test, expect, type Page } from "@playwright/test";
import type { CalendarFeedToken } from "@hymea/shared";
import { makeFeedToken, mockAuth, seedSession } from "./fixtures";

const FEEDS: CalendarFeedToken[] = [
  makeFeedToken({ id: "feed-1", label: "Agenda Sarah", token: "tok-1", revokedAt: null }),
  makeFeedToken({
    id: "feed-2",
    label: "Ancien lien",
    token: "tok-2",
    revokedAt: "2026-02-01T00:00:00.000Z",
  }),
];

/** Mocks de l'export CSV et du CRUD des tokens iCal. */
async function mockExports(page: Page, feeds = FEEDS): Promise<void> {
  let store = [...feeds];
  await page.route(/\/api\/rendez-vous\/export\.csv/, (route) =>
    route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="rendez-vous.csv"',
      },
      body: "statut,type_client\nNOUVEAU,particulier\n",
    }),
  );
  await page.route(/\/api\/calendar-feeds(\?|$)/, async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { label: string };
      const created = makeFeedToken({ id: "feed-new", label: body.label, token: "tok-new" });
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
  await page.route(/\/api\/calendar-feeds\/[\w-]+$/, async (route) => {
    const id = route.request().url().split("/").pop() ?? "";
    store = store.map((f) => (f.id === id ? { ...f, revokedAt: "2026-03-01T00:00:00.000Z" } : f));
    await route.fulfill({ status: 204, body: "" });
  });
}

test.describe("Back-office — Exports & agenda (#41)", () => {
  test.beforeEach(async ({ page, context }) => {
    await seedSession(context);
    await mockAuth(page, { refresh: "ok" });
    // WebKit ne connaît pas ces permissions ; on ignore l'échec (test clipboard skippé là-bas).
    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  });

  test("affiche les sections export CSV et abonnements iCal", async ({ page }) => {
    await mockExports(page);
    await page.goto("/admin/exports");
    await expect(page.getByRole("heading", { name: "Exports & agenda" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Export CSV" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Abonnements iCal" })).toBeVisible();
    await expect(page.getByText("Agenda Sarah")).toBeVisible();
    await expect(page.getByText("Révoqué", { exact: true })).toBeVisible();
  });

  test("affiche l'état vide des abonnements", async ({ page }) => {
    await mockExports(page, []);
    await page.goto("/admin/exports");
    await expect(page.getByText("Aucun lien d'abonnement pour le moment.")).toBeVisible();
  });

  test("affiche l'état d'erreur des abonnements", async ({ page }) => {
    await page.route(/\/api\/calendar-feeds(\?|$)/, (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
    );
    await page.goto("/admin/exports");
    await expect(page.getByText("Impossible de charger les liens.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  });

  test("télécharge l'export CSV complet", async ({ page }) => {
    await mockExports(page);
    await page.goto("/admin/exports");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exporter tous les RDV (CSV)" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("rendez-vous.csv");
  });

  test("crée un lien d'abonnement (POST) et révèle l'URL une seule fois", async ({ page }) => {
    await mockExports(page);
    await page.goto("/admin/exports");
    await page.getByLabel("Libellé du lien").fill("Agenda Dan");
    const req = page.waitForRequest(
      (r) => r.url().endsWith("/api/calendar-feeds") && r.method() === "POST",
    );
    await page.getByRole("button", { name: "Créer un lien" }).click();
    await req;
    // L'URL complète n'apparaît qu'une fois, dans le bandeau de révélation.
    const reveal = page.getByRole("status");
    await expect(reveal).toContainText("ne sera plus affichée");
    await expect(reveal.getByText("/api/calendar-feeds/tok-new.ics")).toBeVisible();
  });

  test("copie l'URL révélée dans le presse-papier", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "API presse-papier non disponible sous WebKit en test.");
    await mockExports(page);
    await page.goto("/admin/exports");
    await page.getByLabel("Libellé du lien").fill("Agenda Dan");
    await page.getByRole("button", { name: "Créer un lien" }).click();
    const reveal = page.getByRole("status");
    await reveal.getByRole("button", { name: "Copier l'URL" }).click();
    await expect(reveal.getByRole("button", { name: "Copié" })).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain("/api/calendar-feeds/tok-new.ics");
  });

  test("révoque un lien après confirmation (DELETE)", async ({ page }) => {
    await mockExports(page);
    page.on("dialog", (d) => void d.accept());
    await page.goto("/admin/exports");
    const item = page.getByRole("listitem").filter({ hasText: "Agenda Sarah" });
    const req = page.waitForRequest(
      (r) => /\/api\/calendar-feeds\/feed-1$/.test(r.url()) && r.method() === "DELETE",
    );
    await item.getByRole("button", { name: "Révoquer" }).click();
    await req;
  });

  test("régénère un lien (POST puis DELETE)", async ({ page }) => {
    await mockExports(page);
    page.on("dialog", (d) => void d.accept());
    await page.goto("/admin/exports");
    const item = page.getByRole("listitem").filter({ hasText: "Agenda Sarah" });
    const post = page.waitForRequest(
      (r) => r.url().endsWith("/api/calendar-feeds") && r.method() === "POST",
    );
    const del = page.waitForRequest(
      (r) => /\/api\/calendar-feeds\/feed-1$/.test(r.url()) && r.method() === "DELETE",
    );
    await item.getByRole("button", { name: "Régénérer" }).click();
    await post;
    await del;
  });
});
