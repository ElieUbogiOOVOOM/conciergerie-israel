import { test, expect } from "@playwright/test";
import { forgeJwt, mockAuth, mockLogin, mockRdvList, paginate, seedSession } from "./fixtures";

test.describe("Back-office — Authentification (#33)", () => {
  test.describe("Garde middleware", () => {
    test("redirige une route protégée vers /login sans session", async ({ page }) => {
      await mockAuth(page, { refresh: "401" });
      await page.goto("/admin/planning");
      await expect(page).toHaveURL(/\/admin\/login/);
    });

    test("redirige /login vers /planning si une session est présente", async ({
      page,
      context,
    }) => {
      await seedSession(context);
      await mockAuth(page, { refresh: "ok" });
      mockRdvList(page, () => paginate([]));
      await page.goto("/admin/login");
      await expect(page).toHaveURL(/\/admin\/planning/);
    });
  });

  test.describe("Page de login", () => {
    test.beforeEach(async ({ page }) => {
      await mockAuth(page, { refresh: "401" });
      await mockLogin(page);
    });

    test("affiche les champs et le branding HYMEA", async ({ page }) => {
      await page.goto("/admin/login");
      await expect(page.getByRole("heading", { name: "HYMEA" })).toBeVisible();
      await expect(page.getByText("Back-office")).toBeVisible();
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Mot de passe")).toBeVisible();
      await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
    });

    test("affiche une erreur accessible sur identifiants invalides", async ({ page }) => {
      await page.goto("/admin/login");
      await page.getByLabel("Email").fill("admin@hymea.com");
      await page.getByLabel("Mot de passe").fill("wrong-password");
      await page.getByRole("button", { name: "Se connecter" }).click();
      // Le message d'erreur est un <p role="alert"> (distinct de l'annonceur de route Next).
      await expect(page.locator('p[role="alert"]')).toHaveText("Identifiants invalides.");
      await expect(page).toHaveURL(/\/admin\/login/);
    });

    test("connecte et redirige vers le planning + pose le cookie de présence", async ({
      page,
      context,
    }) => {
      // Refresh stateful : 401 avant login (reste sur /login), 200 après (le rebond
      // éventuel d'une redirection middleware ré-hydrate la session, comme en prod).
      let loggedIn = false;
      await page.route(/\/api\/auth\/login$/, async (route) => {
        loggedIn = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ accessToken: forgeJwt("admin@hymea.com") }),
        });
      });
      await page.route(/\/api\/auth\/refresh$/, async (route) => {
        await route.fulfill({
          status: loggedIn ? 200 : 401,
          contentType: "application/json",
          body: loggedIn ? JSON.stringify({ accessToken: forgeJwt("admin@hymea.com") }) : "{}",
        });
      });
      mockRdvList(page, () => paginate([]));
      await page.goto("/admin/login");
      await page.getByLabel("Email").fill("admin@hymea.com");
      await page.getByLabel("Mot de passe").fill("secret123");
      await page.getByRole("button", { name: "Se connecter" }).click();
      await expect(page).toHaveURL(/\/admin\/planning/);

      const cookie = (await context.cookies()).find((c) => c.name === "hymea_admin_session");
      expect(cookie?.value).toBe("1");
    });
  });

  test.describe("Déconnexion", () => {
    test("révoque la session et revient au login", async ({ page, context }) => {
      await seedSession(context);
      await mockAuth(page, { refresh: "ok" });
      mockRdvList(page, () => paginate([]));
      await page.goto("/admin/planning");

      await page.getByRole("button", { name: "Se déconnecter" }).click();
      await expect(page).toHaveURL(/\/admin\/login/);

      const cookie = (await context.cookies()).find((c) => c.name === "hymea_admin_session");
      expect(cookie?.value ?? "").toBe("");
    });
  });
});
