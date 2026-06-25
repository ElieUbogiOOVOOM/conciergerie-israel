/**
 * Conversions fuseau métier (IANA, ex. Asia/Jerusalem) ↔ UTC, sans dépendance.
 * On s'appuie sur `Intl.DateTimeFormat` pour connaître le décalage à un instant donné,
 * ce qui gère automatiquement l'heure d'été (DST).
 */

/** Décalage (heure locale du fuseau − UTC), en millisecondes, à l'instant `utcMs`. */
function offsetMsAt(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const wallMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return wallMs - utcMs;
}

/**
 * Instant UTC correspondant à une heure murale (`HH:mm`) d'une date calendaire
 * (`YYYY-MM-DD`) dans le fuseau métier. Double passe pour rester correct aux
 * bascules DST.
 */
export function zonedWallTimeToUtc(dateIso: string, time: string, timeZone: string): Date {
  const [year, month, day] = dateIso.split("-").map(Number) as [number, number, number];
  const [hour, minute] = time.split(":").map(Number) as [number, number];
  const wallGuess = Date.UTC(year, month - 1, day, hour, minute);

  let utcMs = wallGuess - offsetMsAt(wallGuess, timeZone);
  // Une seconde passe affine l'offset si le 1er essai tombait du mauvais côté d'une bascule.
  utcMs = wallGuess - offsetMsAt(utcMs, timeZone);
  return new Date(utcMs);
}

/** Jour de la semaine (0 = dimanche … 6 = samedi) d'une date calendaire `YYYY-MM-DD`. */
export function weekdayOf(dateIso: string): number {
  const [year, month, day] = dateIso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
