import Link from "next/link";
import type { RendezVousDetail } from "@hymea/shared";
import { buildMonthGrid, weekdayInitials, ymd } from "@/lib/datetime";
import { EventChip } from "./EventChip";

/** Nombre de RDV affichés par cellule avant le repli « +N ». */
const MAX_PER_CELL = 3;

/** Vue mensuelle : grille 6×7 (dimanche → samedi) avec pastilles de RDV. */
export function MonthView({
  focusIso,
  eventsByDay,
}: {
  focusIso: string;
  eventsByDay: Map<string, RendezVousDetail[]>;
}) {
  const [y, m] = ymd(focusIso);
  const grid = buildMonthGrid(y, m - 1);
  const initials = weekdayInitials();

  return (
    <div className="overflow-hidden rounded-md border border-sable bg-ivoire">
      <div className="grid grid-cols-7 border-b border-sable">
        {initials.map((label, i) => (
          <div
            key={i}
            className="px-2 py-2 text-center font-ui text-xs font-medium uppercase tracking-wider text-encre-doux"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((cell) => {
          const events = eventsByDay.get(cell.iso) ?? [];
          const extra = events.length - MAX_PER_CELL;
          return (
            <div
              key={cell.iso}
              data-testid="month-cell"
              className={`flex min-h-24 flex-col gap-0.5 border-b border-r border-sable/70 p-1.5 last:border-r-0 ${
                cell.inCurrentMonth ? "bg-ivoire" : "bg-creme/60"
              }`}
            >
              <span
                className={`mb-0.5 inline-flex size-6 items-center justify-center self-end rounded-full font-ui text-xs ${
                  cell.isToday
                    ? "bg-encre font-semibold text-creme"
                    : cell.inCurrentMonth
                      ? "text-encre"
                      : "text-gris"
                }`}
              >
                {cell.day}
              </span>
              {events.slice(0, MAX_PER_CELL).map((rdv) => (
                <EventChip key={rdv.id} rdv={rdv} />
              ))}
              {extra > 0 && (
                <Link
                  href={`/rendez-vous?dateFrom=${cell.iso}T00:00:00.000Z`}
                  className="px-1.5 font-ui text-xs text-or-profond hover:underline"
                >
                  +{extra} autre{extra > 1 ? "s" : ""}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
