"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@hymea/shared";
import { buildMonthGrid, formatMonthLabel, weekdayInitials } from "@/lib/datetime";

type CalendarProps = {
  /** Jour sélectionné (YYYY-MM-DD) ou null. */
  selected: string | null;
  onSelect: (iso: string) => void;
};

/**
 * Sélecteur de date mensuel, fidèle à la charte HYMEA (inspiration shadcn,
 * réinterprétée crème/or/encre). Sans dépendance : grille 6×7 dérivée de
 * `buildMonthGrid`, semaine commençant le dimanche (rythme métier israélien).
 * Les jours passés sont désactivés ; la navigation ne remonte pas avant le mois
 * courant. S'inverse naturellement en RTL via le `dir` du document.
 */
export function Calendar({ selected, onSelect }: CalendarProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Rdv.slot");
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const grid = buildMonthGrid(cursor.year, cursor.month);
  const weekdays = weekdayInitials(locale);
  const atCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();

  function shiftMonth(delta: number) {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  }

  return (
    <div className="max-w-sm border border-encre/15 bg-ivoire p-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={atCurrentMonth}
          aria-label={t("previousMonth")}
          className="flex h-9 w-9 items-center justify-center border border-encre/15 text-encre transition-colors hover:border-or hover:text-or-profond disabled:opacity-30 disabled:pointer-events-none"
        >
          <span aria-hidden className="rtl:rotate-180">
            ‹
          </span>
        </button>
        <p aria-live="polite" className="font-label text-sm uppercase tracking-[0.2em] text-encre">
          {formatMonthLabel(cursor.year, cursor.month, locale)}
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label={t("nextMonth")}
          className="flex h-9 w-9 items-center justify-center border border-encre/15 text-encre transition-colors hover:border-or hover:text-or-profond"
        >
          <span aria-hidden className="rtl:rotate-180">
            ›
          </span>
        </button>
      </div>

      <div
        role="group"
        aria-label={formatMonthLabel(cursor.year, cursor.month, locale)}
        className="mt-5 grid grid-cols-7 gap-1"
      >
        {weekdays.map((label, index) => (
          <div
            key={index}
            className="pb-2 text-center font-label text-[0.65rem] uppercase tracking-wider text-encre/45"
          >
            {label}
          </div>
        ))}

        {grid.map((cell, index) => {
          // Cellules de débordement : placeholders neutres, hors interaction.
          if (!cell.inCurrentMonth) {
            return <div key={`empty-${index}`} aria-hidden className="aspect-square" />;
          }
          const isSelected = cell.iso === selected;
          return (
            <button
              key={cell.iso}
              type="button"
              disabled={cell.isPast}
              aria-pressed={isSelected}
              aria-current={cell.isToday ? "date" : undefined}
              onClick={() => onSelect(cell.iso)}
              className={[
                "aspect-square font-label text-sm transition-colors",
                cell.isPast ? "cursor-default text-encre/20" : "text-encre hover:bg-sable",
                isSelected ? "bg-or text-ivoire hover:bg-or" : "",
                cell.isToday && !isSelected ? "ring-1 ring-inset ring-or" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
