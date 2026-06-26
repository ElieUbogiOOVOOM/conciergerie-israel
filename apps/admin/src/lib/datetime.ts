/**
 * Utilitaires date/heure du planning back-office. Les RDV renvoyés par l'API
 * portent un instant UTC (`debut`) ; ils sont présentés à l'heure d'Israël
 * (le service opère sur place) et placés sur le jour métier correspondant.
 * La semaine HYMEA court du dimanche au samedi (rythme israélien).
 */
export const BUSINESS_TZ = "Asia/Jerusalem";

/** Le back-office est mono-langue (opérateur HYMEA) : tout est formaté en FR. */
const INTL_LOCALE = "fr-FR";

/** Vues temporelles du planning. */
export type CalendarView = "day" | "week" | "month";

/** Jour décoré pour les grilles du calendrier. */
export interface CalendarDay {
  /** Clé YYYY-MM-DD (jour métier). */
  iso: string;
  /** Numéro du jour dans le mois (1–31). */
  day: number;
  /** Appartient au mois affiché (false = débordement grisé, vue mois). */
  inCurrentMonth: boolean;
  /** Correspond à aujourd'hui (heure d'Israël). */
  isToday: boolean;
  /** Index du jour dans la semaine (0 = dimanche … 6 = samedi). */
  weekday: number;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Clé YYYY-MM-DD à partir d'année / index de mois / jour. */
export function toIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

/** Décompose une clé YYYY-MM-DD en [année, mois (1-12), jour]. */
export function ymd(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-");
  return [Number(y), Number(m), Number(d)];
}

/** Décompose un instant en parts calendaires à l'heure d'Israël. */
function businessParts(date: Date): { year: number; month: number; day: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: weekdays.indexOf(get("weekday")),
  };
}

/** Clé YYYY-MM-DD (jour métier) d'un instant ISO UTC — pour grouper les RDV. */
export function businessDayKey(iso: string): string {
  const { year, month, day } = businessParts(new Date(iso));
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Date du jour (heure d'Israël) au format YYYY-MM-DD. */
export function todayIso(): string {
  return businessDayKey(new Date().toISOString());
}

/** Décore une clé YYYY-MM-DD en CalendarDay (par rapport au mois affiché). */
function decorate(iso: string, monthIndex: number, today: string): CalendarDay {
  const [y, m, d] = ymd(iso);
  // Ancre à midi UTC pour dériver le jour de semaine sans décalage de fuseau.
  const weekday = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return {
    iso,
    day: d,
    inCurrentMonth: m - 1 === monthIndex,
    isToday: iso === today,
    weekday,
  };
}

/**
 * Grille mensuelle de 6 semaines × 7 jours, commençant le dimanche. Les jours
 * de débordement (mois précédent/suivant) sont inclus et marqués.
 */
export function buildMonthGrid(year: number, monthIndex: number): CalendarDay[] {
  const today = todayIso();
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1, 12)).getUTCDay();
  const start = new Date(Date.UTC(year, monthIndex, 1 - firstWeekday, 12));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const iso = toIsoDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return decorate(iso, monthIndex, today);
  });
}

/** Semaine (dimanche → samedi) contenant la date de référence (YYYY-MM-DD). */
export function buildWeek(refIso: string): CalendarDay[] {
  const today = todayIso();
  const [y, m, d] = ymd(refIso);
  const ref = new Date(Date.UTC(y, m - 1, d, 12));
  const start = new Date(ref);
  start.setUTCDate(ref.getUTCDate() - ref.getUTCDay());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    const iso = toIsoDate(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
    return decorate(iso, m - 1, today);
  });
}

/** Décale une date YYYY-MM-DD d'un nombre de jours (peut être négatif). */
export function shiftDays(refIso: string, days: number): string {
  const [y, m, d] = ymd(refIso);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Décale une date YYYY-MM-DD d'un nombre de mois (garde le 1er du mois). */
export function shiftMonths(refIso: string, months: number): string {
  const [y, m] = ymd(refIso);
  const date = new Date(Date.UTC(y, m - 1 + months, 1, 12));
  return toIsoDate(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

/** Heure d'un instant ISO (« 09:00 ») à l'heure d'Israël. */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BUSINESS_TZ,
  }).format(new Date(iso));
}

/** Minutes écoulées depuis minuit (heure d'Israël) pour un instant ISO UTC. */
export function minutesOfDay(iso: string): number {
  const [h, m] = formatTime(iso).split(":");
  return Number(h) * 60 + Number(m);
}

/** Plage horaire « 09:00 – 10:30 » (fin optionnelle). */
export function formatTimeRange(debut: string, fin: string | null): string {
  return fin ? `${formatTime(debut)} – ${formatTime(fin)}` : formatTime(debut);
}

/** Libellé « Juillet 2026 » (capitalisé) pour l'en-tête mois. */
export function formatMonthLabel(refIso: string): string {
  const [y, m] = ymd(refIso);
  const label = new Intl.DateTimeFormat(INTL_LOCALE, { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, 1, 12)),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Libellé long « vendredi 3 juillet 2026 » d'un jour YYYY-MM-DD. */
export function formatLongDay(iso: string): string {
  const [y, m, d] = ymd(iso);
  const label = new Intl.DateTimeFormat(INTL_LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Date seule « 03/07/2026 » d'un instant UTC (heure d'Israël). */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(INTL_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: BUSINESS_TZ,
  }).format(new Date(iso));
}

/** Libellé compact d'une date+heure « 03/07/2026 à 09:00 » (instant UTC). */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Intl.DateTimeFormat(INTL_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: BUSINESS_TZ,
  }).format(new Date(iso));
  return `${date} à ${formatTime(iso)}`;
}

/** Initiales des 7 jours (dimanche → samedi). */
export function weekdayInitials(): string[] {
  const fmt = new Intl.DateTimeFormat(INTL_LOCALE, { weekday: "short" });
  // 2024-09-01 (UTC midi) est un dimanche : base stable pour les 7 libellés.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 8, 1 + i, 12))));
}

/** Noms longs capitalisés des 7 jours (dimanche → samedi), index = jour métier. */
export function weekdayNames(): string[] {
  const fmt = new Intl.DateTimeFormat(INTL_LOCALE, { weekday: "long" });
  return Array.from({ length: 7 }, (_, i) => {
    const label = fmt.format(new Date(Date.UTC(2024, 8, 1 + i, 12)));
    return label.charAt(0).toUpperCase() + label.slice(1);
  });
}

/**
 * Valeur d'un `<input type="datetime-local">` (YYYY-MM-DDTHH:mm) pour un instant
 * ISO UTC, exprimée à l'heure d'Israël (le créneau saisi par l'opérateur).
 */
export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Décalage (minutes) du fuseau métier vs UTC à un instant donné (gère le DST). */
function businessOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return Math.round((asUtc - at.getTime()) / 60000);
}

/**
 * Convertit une valeur de `<input type="datetime-local">` (interprétée à l'heure
 * d'Israël) en instant ISO UTC pour l'API. Retourne null si la valeur est vide.
 */
export function datetimeLocalToIso(value: string): string | null {
  if (!value) return null;
  const [date, time] = value.split("T");
  if (!date || !time) return null;
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  if ([y, mo, d, h, mi].some((n) => n === undefined || Number.isNaN(n))) return null;
  // On suppose d'abord la valeur en UTC, on mesure l'offset métier à cet instant,
  // puis on corrige (suffisant hors minute exacte de bascule DST).
  const naiveUtc = Date.UTC(
    y as number,
    (mo as number) - 1,
    d as number,
    h as number,
    mi as number,
  );
  const offset = businessOffsetMinutes(new Date(naiveUtc));
  return new Date(naiveUtc - offset * 60000).toISOString();
}
