import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

// robots.txt (#31). Autorise l'indexation de la vitrine et référence le sitemap.
// /admin et /api sont des services séparés (résolus en amont par le reverse-proxy,
// l'admin étant en noindex) ; on bloque les préfixes par défense en profondeur.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
