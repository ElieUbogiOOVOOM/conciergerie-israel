import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

// Le plugin next-intl branche la configuration de requête (src/i18n/request.ts)
// et active le rendu localisé côté serveur.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Sortie auto-contenue pour l'image Docker de production (cf. Dockerfile).
  output: "standalone",
  // Le monorepo vit au-dessus d'apps/web : on trace la racine pour le bundling.
  outputFileTracingRoot: __dirname + "/../../",
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
