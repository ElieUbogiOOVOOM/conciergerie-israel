import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locales, type Locale } from "@hymea/shared";
import { routing } from "@/i18n/routing";

// Helpers SEO mutualisés (#31). Centralise la construction des métadonnées par
// page et par locale : URL canonique, balises hreflang, Open Graph et Twitter.
// L'image OG est résolue automatiquement par Next via la convention de fichier
// app/[locale]/opengraph-image.tsx — on ne la déclare donc pas ici.

/**
 * URL absolue du site (sans slash final). Source : PUBLIC_SITE_URL (défini côté
 * serveur, cf. .env). Repli sur le domaine de production. Les métadonnées étant
 * rendues côté serveur (SSG/SSR), la variable n'a pas besoin d'être exposée au
 * client via NEXT_PUBLIC_.
 */
export function siteUrl(): string {
  return (process.env.PUBLIC_SITE_URL ?? "https://hymea.com").replace(/\/+$/, "");
}

/** Codes Open Graph (langue_PAYS) associés à chaque locale de la vitrine. */
export const OG_LOCALE: Record<Locale, string> = {
  fr: "fr_FR",
  en: "en_US",
  he: "he_IL",
};

/** Métadonnées d'une route (chemin sans préfixe de locale) pour le sitemap. */
export type RouteEntry = {
  /** Chemin sans préfixe de locale ("" pour l'accueil). */
  path: string;
  /** Priorité relative de la page dans le sitemap (0–1). */
  priority: number;
  changeFrequency: "weekly" | "monthly" | "yearly";
};

/**
 * Inventaire des routes publiques de la vitrine, source unique partagée par le
 * sitemap. Les slugs ne sont pas localisés (mêmes chemins pour fr/en/he).
 */
export const ROUTES: readonly RouteEntry[] = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/centres-commerciaux", priority: 0.8, changeFrequency: "monthly" },
  { path: "/entreprises", priority: 0.8, changeFrequency: "monthly" },
  { path: "/particuliers", priority: 0.8, changeFrequency: "monthly" },
  { path: "/rdv", priority: 0.7, changeFrequency: "monthly" },
  { path: "/mentions-legales", priority: 0.3, changeFrequency: "yearly" },
  { path: "/politique-confidentialite", priority: 0.3, changeFrequency: "yearly" },
];

/** Construit la carte hreflang (locales + x-default → repli FR) pour un chemin. */
function languageAlternates(path: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const locale of locales) {
    map[locale] = `/${locale}${path}`;
  }
  // x-default pointe la version par défaut (repli FR, cf. routing).
  map["x-default"] = `/${routing.defaultLocale}${path}`;
  return map;
}

/**
 * Construit les métadonnées complètes d'une page localisée : titre/description
 * issus des messages (`<namespace>.title` / `.description`), URL canonique,
 * hreflang, Open Graph et Twitter card. À utiliser dans chaque `generateMetadata`.
 */
export async function buildPageMetadata({
  locale,
  namespace,
  path,
}: {
  locale: Locale;
  namespace: string;
  path: string;
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace });
  const title = t("title");
  const description = t("description");
  const url = `/${locale}${path}`;
  // Image OG de marque générée par locale (app/[locale]/opengraph-image.tsx).
  // On la référence explicitement car la convention de fichier n'est pas héritée
  // par les segments de route enfants (seule la racine [locale] la recevrait).
  const ogImage = {
    url: `/${locale}/opengraph-image`,
    width: 1200,
    height: 630,
    alt: "HYMEA — The office conciergerie",
  };

  return {
    metadataBase: new URL(siteUrl()),
    title,
    description,
    alternates: {
      canonical: url,
      languages: languageAlternates(path),
    },
    openGraph: {
      type: "website",
      siteName: "HYMEA",
      title,
      description,
      url,
      locale: OG_LOCALE[locale],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage.url],
    },
  };
}
