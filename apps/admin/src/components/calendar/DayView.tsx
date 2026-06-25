import type { RendezVousDetail } from "@hymea/shared";
import { formatLongDay } from "@/lib/datetime";
import { DayColumn, HourGutter } from "./DayColumn";

/** Vue jour : gouttière horaire + une colonne. */
export function DayView({
  focusIso,
  eventsByDay,
}: {
  focusIso: string;
  eventsByDay: Map<string, RendezVousDetail[]>;
}) {
  const events = eventsByDay.get(focusIso) ?? [];
  return (
    <div className="rounded-md border border-sable bg-ivoire">
      <div className="flex">
        <HourGutter />
        <DayColumn
          events={events}
          showHeader={
            <div className="flex h-6 items-center justify-center border-b border-sable font-ui text-xs text-encre-doux">
              {formatLongDay(focusIso)}
            </div>
          }
        />
      </div>
      {events.length === 0 && (
        <p className="border-t border-sable px-4 py-3 font-ui text-sm text-encre-doux">
          Aucun rendez-vous planifié ce jour.
        </p>
      )}
    </div>
  );
}
