import type { RendezVousDetail } from "@hymea/shared";
import { buildWeek, weekdayInitials } from "@/lib/datetime";
import { DayColumn, HourGutter } from "./DayColumn";

/** Vue semaine : gouttière horaire + 7 colonnes (dimanche → samedi). */
export function WeekView({
  focusIso,
  eventsByDay,
}: {
  focusIso: string;
  eventsByDay: Map<string, RendezVousDetail[]>;
}) {
  const days = buildWeek(focusIso);
  const initials = weekdayInitials();

  return (
    <div className="overflow-x-auto rounded-md border border-sable bg-ivoire">
      <div className="flex min-w-[44rem]">
        <HourGutter />
        {days.map((day) => (
          <DayColumn
            key={day.iso}
            events={eventsByDay.get(day.iso) ?? []}
            showHeader={
              <div
                className={`flex h-6 items-center justify-center gap-1 border-b border-sable font-ui text-xs ${
                  day.isToday ? "font-semibold text-or-profond" : "text-encre-doux"
                }`}
              >
                <span className="uppercase tracking-wide">{initials[day.weekday]}</span>
                <span>{day.day}</span>
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}
