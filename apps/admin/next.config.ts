import type { NextConfig } from "next";

// Back-office HYMEA : servi sous /admin par le reverse-proxy (Dokploy), résolu
// AVANT la vitrine pour ne pas être capté par le routing de langue (#32).
const nextConfig: NextConfig = {
  // Toutes les routes vivent sous /admin (assets compris).
  basePath: "/admin",
  // Sortie auto-contenue pour l'image Docker de production (cf. Dockerfile).
  output: "standalone",
  // Le monorepo vit au-dessus d'apps/admin : on trace la racine pour le bundling.
  outputFileTracingRoot: __dirname + "/../../",
  reactStrictMode: true,
  // Le back-office ne doit jamais être indexé (défense en profondeur : aussi posé
  // en métadonnées de layout et en en-tête middleware).
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
