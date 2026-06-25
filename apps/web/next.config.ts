import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sortie auto-contenue pour l'image Docker de production (cf. Dockerfile).
  output: "standalone",
  // Le monorepo vit au-dessus d'apps/web : on trace la racine pour le bundling.
  outputFileTracingRoot: __dirname + "/../../",
  reactStrictMode: true,
};

export default nextConfig;
