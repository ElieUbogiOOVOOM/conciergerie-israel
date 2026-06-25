/**
 * Configuration i18n partagée (vitrine, admin, emails).
 * FR/EN/HE avec RTL complet pour l'hébreu. Repli FR.
 */

export const locales = ["fr", "en", "he"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

/** Locales dont le sens d'écriture est de droite à gauche. */
export const rtlLocales = ["he"] as const satisfies readonly Locale[];

export type TextDirection = "ltr" | "rtl";

/** Sens d'écriture pour une locale donnée. */
export function dir(locale: Locale): TextDirection {
  return (rtlLocales as readonly Locale[]).includes(locale) ? "rtl" : "ltr";
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Contenu éditorial décliné dans les 3 langues. */
export type I18nText = Record<Locale, string>;
