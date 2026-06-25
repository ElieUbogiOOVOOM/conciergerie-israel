"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RendezVousDetail } from "@hymea/shared";
import { listRendezVous } from "@/lib/api";
import {
  buildMonthGrid,
  buildWeek,
  businessDayKey,
  formatLongDay,
  formatMonthLabel,
  shiftDays,
  shiftMonths,
  todayIso,
  ymd,
  type CalendarView,
} from "@/lib/datetime";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { StatusLegend } from "./StatusLegend";

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: "day", label: "Jour" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
];

/** Premier/dernier ISO d'une liste de jours (fallback sûr pour TS). */
function bounds(days: { iso: string }[], fallback: string): [string, string] {
  return [days[0]?.iso ?? fallback, days[days.length - 1]?.iso ?? fallback];
}

/** Bornes [premier, dernier] jour (YYYY-MM-DD) couverts par la vue courante. */
function rangeFor(view: CalendarView, focusIso: string): [string, string] {
  if (view === "day") return [focusIso, focusIso];
  if (view === "week") return bounds(buildWeek(focusIso), focusIso);
  const [y, m] = ymd(focusIso);
  return bounds(buildMonthGrid(y, m - 1), focusIso);
}

/** Libellé de la période affichée selon la vue. */
function periodLabel(view: CalendarView, focusIso: string): string {
  if (view === "day") return formatLongDay(focusIso);
  if (view === "month") return formatMonthLabel(focusIso);
  const [first, last] = bounds(buildWeek(focusIso), focusIso);
  return `${formatLongDay(first)} → ${formatLongDay(last)}`;
}

/**
 * Planning principal du back-office (#34) : vues jour / semaine / mois façon
 * Google Calendar, RDV teintés par statut (NOUVEAU pâle, CONFIRME plein…),
 * navigation temporelle. Charge les RDV de la plage visible et les groupe par
 * jour métier (heure d'Israël).
 */
export function PlanningCalendar() {
  const [view, setView] = useState<CalendarView>("week");
  const [focusIso, setFocusIso] = useState(() => todayIso());
  const [events, setEvents] = useState<RendezVousDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [rangeStart, rangeEnd] = useMemo(() => rangeFor(view, focusIso), [view, focusIso]);

  // Garde anti-réponses hors-ordre : une navigation rapide ne doit pas laisser
  // une réponse lente écraser la période courante.
  const reqId = useRef(0);
  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(false);
    // Marge d'un jour de chaque côté : un RDV en bord de plage (décalage UTC↔Israël)
    // est récupéré puis filtré précisément par sa clé de jour métier.
    const dateFrom = `${shiftDays(rangeStart, -1)}T00:00:00.000Z`;
    const dateTo = `${shiftDays(rangeEnd, 1)}T23:59:59.999Z`;
    try {
      const collected: RendezVousDetail[] = [];
      let page = 1;
      // Pagine jusqu'à tout récupérer (un mois chargé peut dépasser une page).
      for (;;) {
        const res = await listRendezVous({ dateFrom, dateTo, page, pageSize: 100 });
        collected.push(...res.items);
        if (collected.length >= res.total || res.items.length === 0) break;
        page += 1;
      }
      if (id === reqId.current) setEvents(collected);
    } catch {
      if (id === reqId.current) {
        setError(true);
        setEvents([]);
      }
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    void load();
  }, [load]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, RendezVousDetail[]>();
    for (const rdv of events) {
      if (!rdv.debut) continue; // demandes sans créneau → liste, pas calendrier
      const key = businessDayKey(rdv.debut);
      const bucket = map.get(key);
      if (bucket) bucket.push(rdv);
      else map.set(key, [rdv]);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => (a.debut ?? "").localeCompare(b.debut ?? ""));
    }
    return map;
  }, [events]);

  const navigate = useCallback(
    (dir: -1 | 1) => {
      setFocusIso((cur) =>
        view === "month" ? shiftMonths(cur, dir) : shiftDays(cur, dir * (view === "week" ? 7 : 1)),
      );
    },
    [view],
  );

  // Raccourcis clavier (outil consulté en continu) : ←/→ navigue la période,
  // « t » revient à aujourd'hui. Inactifs quand un champ a le focus.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") navigate(-1);
      else if (e.key === "ArrowRight") navigate(1);
      else if (e.key === "t" || e.key === "T") setFocusIso(todayIso());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <section aria-label="Planning des rendez-vous" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Période précédente"
            className="rounded-sm border border-encre/20 px-2.5 py-1.5 font-ui text-sm hover:border-or hover:text-or-profond"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            aria-label="Période suivante"
            className="rounded-sm border border-encre/20 px-2.5 py-1.5 font-ui text-sm hover:border-or hover:text-or-profond"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setFocusIso(todayIso())}
            className="rounded-sm border border-encre/20 px-3 py-1.5 font-ui text-sm hover:border-or hover:text-or-profond"
          >
            Aujourd&apos;hui
          </button>
          <h1 className="ml-1 font-title text-h3 text-encre" aria-live="polite">
            {periodLabel(view, focusIso)}
          </h1>
        </div>

        <div
          role="group"
          aria-label="Changer de vue"
          className="inline-flex overflow-hidden rounded-sm border border-encre/20"
        >
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              aria-pressed={view === v.key}
              className={`px-3 py-1.5 font-ui text-sm transition-colors ${
                view === v.key ? "bg-encre text-creme" : "text-encre hover:bg-sable/40"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </header>

      <StatusLegend />

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-statut-annule/40 bg-statut-annule-pale px-4 py-8 text-center">
          <p className="font-ui text-sm text-statut-annule">Impossible de charger le planning.</p>
          <Button variant="ghost" onClick={() => void load()}>
            Réessayer
          </Button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Chargement du planning…" />
        </div>
      ) : (
        <div className="relative">
          {view === "month" ? (
            <MonthView focusIso={focusIso} eventsByDay={eventsByDay} />
          ) : view === "week" ? (
            <WeekView focusIso={focusIso} eventsByDay={eventsByDay} />
          ) : (
            <DayView focusIso={focusIso} eventsByDay={eventsByDay} />
          )}
          {/* État vide unifié (la vue jour porte déjà son propre message). */}
          {view !== "day" && eventsByDay.size === 0 && (
            <p
              role="status"
              className="mt-3 rounded-md border border-sable bg-ivoire px-4 py-3 text-center font-ui text-sm text-encre-doux"
            >
              Aucun rendez-vous sur cette période.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
