import type { Locale } from "@hymea/shared";

/**
 * Fuseau métier HYMEA. Les créneaux renvoyés par l'API sont des instants UTC ;
 * ils doivent être présentés à l'heure d'Israël quelle que soit la locale du
 * visiteur (le service opère sur place).
 */
export const BUSINESS_TZ = "Asia/Jerusalem";

/** Mappe une locale applicative vers un BCP-47 pour Intl. */
const intlLocale: Record<Locale, string> = { fr: "fr-FR", en: "en-GB", he: "he-IL" };

/** Jour de calendrier décoré pour la grille mensuelle du sélecteur. */
export type CalendarDay = {
  /** Date au format YYYY-MM-DD (fuseau local du visiteur, sans heure). */
  iso: string;
  /** Numéro du jour dans le mois (1–31). */
  day: number;
  /** Appartient au mois affiché (false = jour de débordement grisé). */
  inCurrentMonth: boolean;
  /** Strictement antérieur à aujourd'hui (non sélectionnable). */
  isPast: boolean;
  /** Correspond à la date du jour. */
  isToday: boolean;
};

/** Formate un entier sur 2 chiffres. */
function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Construit la clé YYYY-MM-DD d'une date locale. */
export function toIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

/** Date du jour (locale du visiteur) au format YYYY-MM-DD. */
export function todayIso(): string {
  const now = new Date();
  return toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Grille mensuelle de 6 semaines × 7 jours, commençant le dimanche (le métier
 * israélien rythme la semaine du dimanche au jeudi ; le dimanche en tête évite
 * tout décalage avec les règles d'ouverture côté API).
 */
export function buildMonthGrid(year: number, monthIndex: number): CalendarDay[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = dimanche
  const gridStart = new Date(year, monthIndex, 1 - startOffset);
  const today = todayIso();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    );
    const iso = toIsoDate(date.getFullYear(), date.getMonth(), date.getDate());
    return {
      iso,
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === monthIndex,
      isPast: iso < today,
      isToday: iso === today,
    };
  });
}

/** Libellé « Juillet 2026 » (capitalisé) pour l'en-tête du calendrier. */
export function formatMonthLabel(year: number, monthIndex: number, locale: Locale): string {
  const label = new Intl.DateTimeFormat(intlLocale[locale], {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Initiales des 7 jours (dimanche → samedi) dans la locale courante. */
export function weekdayInitials(locale: Locale): string[] {
  const formatter = new Intl.DateTimeFormat(intlLocale[locale], { weekday: "short" });
  // 2024-09-01 est un dimanche : base stable pour dériver les 7 libellés.
  return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(2024, 8, 1 + index)));
}

/** Heure d'un créneau (« 09:00 ») à l'heure d'Israël. */
export function formatSlotTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BUSINESS_TZ,
  }).format(new Date(iso));
}

/**
 * Date longue lisible (« vendredi 3 juillet 2026 ») à l'heure d'Israël. Accepte
 * aussi bien une date seule (YYYY-MM-DD) qu'un instant ISO complet : pour une
 * date seule, on ancre à midi UTC afin d'éviter tout décalage de jour.
 */
export function formatLongDate(iso: string, locale: Locale): string {
  const date = iso.length <= 10 ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return new Intl.DateTimeFormat(intlLocale[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: BUSINESS_TZ,
  }).format(date);
}
