import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
// Origine de l'API (pour connect-src). En prod same-origin → 'self' suffit.
const apiOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).origin : "";
  } catch {
    return "";
  }
})();

// CSP appliquée en production uniquement (le HMR de `next dev` exige unsafe-eval/ws).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

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
  poweredByHeader: false,
  // Le back-office ne doit jamais être indexé + en-têtes de sécurité (clickjacking,
  // sniffing, HSTS, CSP). Le noindex est aussi posé en métadonnées de layout et middleware.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          ...(isProd ? [{ key: "Content-Security-Policy", value: csp }] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
