import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

// Le plugin next-intl branche la configuration de requête (src/i18n/request.ts)
// et active le rendu localisé côté serveur.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProd = process.env.NODE_ENV === "production";
// Origine de l'API (pour connect-src). En prod same-origin → 'self' suffit.
const apiOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).origin : "";
  } catch {
    return "";
  }
})();
const turnstile = "https://challenges.cloudflare.com";

// CSP appliquée en production uniquement (le HMR de `next dev` exige unsafe-eval/ws).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${turnstile}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `frame-src ${turnstile}`,
  `connect-src 'self' ${apiOrigin} ${turnstile}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

/** En-têtes de sécurité communs (clickjacking, sniffing, HSTS, fuite de référent). */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  ...(isProd ? [{ key: "Content-Security-Policy", value: csp }] : []),
];

const nextConfig: NextConfig = {
  // Sortie auto-contenue pour l'image Docker de production (cf. Dockerfile).
  output: "standalone",
  // Le monorepo vit au-dessus d'apps/web : on trace la racine pour le bundling.
  outputFileTracingRoot: __dirname + "/../../",
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
