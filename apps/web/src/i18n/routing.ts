import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "@hymea/shared";

// Routing localisé de la vitrine. La liste des locales et le repli FR sont la
// source de vérité partagée (@hymea/shared) — on ne les redéclare pas ici.
//
// - localePrefix "always" : URLs toujours préfixées (/fr /en /he) pour le SEO.
// - localeDetection : 1ʳᵉ visite détectée via Accept-Language, repli FR, puis
//   mémorisation par cookie (NEXT_LOCALE) — comportement par défaut next-intl.
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
});
