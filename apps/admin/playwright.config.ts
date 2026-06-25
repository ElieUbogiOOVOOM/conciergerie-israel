import { defineConfig, devices } from "@playwright/test";

// Suite E2E du back-office. L'app étant servie sous basePath /admin, les tests
// naviguent vers des chemins préfixés "/admin/...". Le webServer tourne en
// `next dev` : la sortie `output: standalone` (pour Docker) n'est pas servie par
// `next start`, et le health-check doit viser une route /admin (la racine "/"
// renvoie 404 sous basePath). Les appels API sont mockés dans chaque test.
const PORT = 3001;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "pnpm dev",
    url: `${baseURL}/admin/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
