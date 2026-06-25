import type { MetadataRoute } from "next";
import { locales } from "@hymea/shared";
import { routing } from "@/i18n/routing";
import { ROUTES, siteUrl } from "@/lib/seo";

// Sitemap multilingue (#31). Une entrée par route publique × locale, avec les
// alternances hreflang (langues + x-default) afin que les moteurs associent les
// trois versions linguistiques. Les slugs ne sont pas localisés.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();

  return ROUTES.flatMap(({ path, priority, changeFrequency }) => {
    const languages: Record<string, string> = {};
    for (const locale of locales) {
      languages[locale] = `${base}/${locale}${path}`;
    }
    languages["x-default"] = `${base}/${routing.defaultLocale}${path}`;

    return locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  });
}
