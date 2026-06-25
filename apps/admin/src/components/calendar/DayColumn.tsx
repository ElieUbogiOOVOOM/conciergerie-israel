import Link from "next/link";
import type { RendezVousDetail } from "@hymea/shared";
import { statutMeta } from "@/lib/status";
import { formatTime, minutesOfDay } from "@/lib/datetime";
import { rdvTitle } from "./EventChip";

/** Plage horaire affichée dans les vues jour/semaine (07:00 → 21:00). */
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 21;
const HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, i) => DAY_START_HOUR + i,
);
/** Hauteur d'une heure en pixels (densité confortable pour un usage quotidien). */
const HOUR_PX = 48;

/** Heures de la gouttière latérale (vue jour/semaine), alignées sur la grille. */
export function HourGutter() {
  return (
    <div className="w-12 shrink-0 select-none">
      <div className="h-6" aria-hidden />
      {HOURS.map((h) => (
        <div
          key={h}
          style={{ height: HOUR_PX }}
          className="relative font-ui text-[0.65rem] text-gris"
        >
          <span className="absolute -top-1.5 right-1.5">{`${String(h).padStart(2, "0")}:00`}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Colonne d'un jour : grille horaire avec les RDV positionnés par leur heure de
 * début (heure d'Israël), teintés par statut. Réutilisée par les vues jour et
 * semaine. Les RDV sans créneau (debut nul) ne sont pas plaçables → ignorés ici.
 */
export function DayColumn({
  events,
  showHeader,
}: {
  events: RendezVousDetail[];
  showHeader?: React.ReactNode;
}) {
  const gridHeight = (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_PX;
  return (
    <div className="min-w-0 flex-1 border-l border-sable first:border-l-0">
      {showHeader}
      <div className="relative" style={{ height: gridHeight }}>
        {/* Lignes d'heures de fond. */}
        {HOURS.map((h, i) => (
          <div
            key={h}
            style={{ top: i * HOUR_PX, height: HOUR_PX }}
            className="absolute inset-x-0 border-t border-sable/60"
            aria-hidden
          />
        ))}
        {events.map((rdv) => {
          if (!rdv.debut) return null;
          const startMin = minutesOfDay(rdv.debut);
          const endMin = rdv.fin ? minutesOfDay(rdv.fin) : startMin + 60;
          const top = ((startMin - DAY_START_HOUR * 60) / 60) * HOUR_PX;
          const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 20);
          const meta = statutMeta[rdv.statut];
          return (
            <Link
              key={rdv.id}
              href={`/rendez-vous/${rdv.id}`}
              data-testid="calendar-event"
              data-statut={rdv.statut}
              style={{ top, height }}
              className={`absolute inset-x-0.5 overflow-hidden rounded-sm px-1.5 py-0.5 font-ui text-xs leading-tight transition-opacity hover:opacity-80 ${meta.event}`}
            >
              <span className="block font-medium">{formatTime(rdv.debut)}</span>
              <span className="block truncate">{rdvTitle(rdv)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
