import { test, expect } from "@playwright/test";
import { makeRdv, mockAuth, mockLogin, mockRdvList, paginate, seedSession } from "./fixtures";

test.describe("Back-office — Coquille, navigation & accessibilité", () => {
  test.describe("Navigation (authentifié)", () => {
    test.beforeEach(async ({ page, context }) => {
      await seedSession(context);
      await mockAuth(page, { refresh: "ok" });
      mockRdvList(page, () => paginate([makeRdv()]));
    });

    test("affiche la navigation et marque l'onglet actif", async ({ page }) => {
      await page.goto("/admin/planning");
      const planning = page.getByRole("link", { name: "Planning" });
      const liste = page.getByRole("link", { name: "Rendez-vous" });
      await expect(planning).toBeVisible();
      await expect(liste).toBeVisible();
      await expect(planning).toHaveAttribute("aria-current", "page");

      // Click + assert réessayés : évite la course d'hydratation du <Link> Next.
      await expect(async () => {
        await liste.click();
        await expect(page).toHaveURL(/\/admin\/rendez-vous/, { timeout: 2000 });
      }).toPass();
      await expect(page.getByRole("link", { name: "Rendez-vous" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    test("reste utilisable sur mobile (sidebar en colonne)", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/admin/planning");
      await expect(page.getByRole("link", { name: "Planning" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Se déconnecter" })).toBeVisible();
    });
  });

  test.describe("Accessibilité", () => {
    test("la page de login est navigable au clavier", async ({ page }) => {
      await mockAuth(page, { refresh: "401" });
      await mockLogin(page);
      await page.goto("/admin/login");

      await page.getByLabel("Email").focus();
      await expect(page.getByLabel("Email")).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByLabel("Mot de passe")).toBeFocused();
    });

    test("expose des en-têtes de colonnes accessibles", async ({ page, context }) => {
      await seedSession(context);
      await mockAuth(page, { refresh: "ok" });
      mockRdvList(page, () => paginate([makeRdv()]));
      await page.goto("/admin/rendez-vous");
      // Les <th scope="col"> sont exposés comme columnheader.
      await expect(page.getByRole("columnheader")).toHaveCount(5);
    });
  });
});
