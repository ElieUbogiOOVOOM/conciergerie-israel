"use client";

import { useEffect, useMemo, useState } from "react";
import type { ExceptionDisponibilite, RegleHebdomadaire } from "@hymea/shared";
import {
  createException,
  createRegle,
  deleteException,
  deleteRegle,
  listExceptions,
  listRegles,
} from "@/lib/api";
import { formatDate, weekdayNames } from "@/lib/datetime";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";

const labelCls = "font-ui text-xs font-medium uppercase tracking-wider text-encre-doux";
const inputCls =
  "rounded-sm border border-encre/20 bg-creme px-3 py-2 font-ui text-sm text-encre focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2 disabled:opacity-50";

/** Convertit une date YYYY-MM-DD en bornes ISO journalières (00:00 → 23:59:59.999). */
function dayBounds(date: string, end = false): string {
  return `${date}T${end ? "23:59:59.999" : "00:00:00.000"}Z`;
}

/**
 * Paramétrage des disponibilités (#38) : règles d'ouverture hebdomadaires
 * (horaires par jour) et exceptions/blocages sur des plages de dates. Les
 * réglages alimentent directement les créneaux proposés côté vitrine.
 */
export function DisponibilitesView() {
  const days = useMemo(() => weekdayNames(), []);
  const [regles, setRegles] = useState<RegleHebdomadaire[] | null>(null);
  const [exceptions, setExceptions] = useState<ExceptionDisponibilite[] | null>(null);
  const [error, setError] = useState(false);

  // Formulaire règle.
  const [jour, setJour] = useState(0);
  const [debut, setDebut] = useState("09:00");
  const [fin, setFin] = useState("18:00");
  const [regleBusy, setRegleBusy] = useState(false);
  const [regleError, setRegleError] = useState<string | null>(null);

  // Formulaire exception.
  const [exDebut, setExDebut] = useState("");
  const [exFin, setExFin] = useState("");
  const [exBloque, setExBloque] = useState(true);
  const [exMotif, setExMotif] = useState("");
  const [exBusy, setExBusy] = useState(false);
  const [exError, setExError] = useState<string | null>(null);

  async function reload() {
    setError(false);
    try {
      const [r, e] = await Promise.all([listRegles(), listExceptions()]);
      setRegles(r);
      setExceptions(e);
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function onAddRegle(e: React.FormEvent) {
    e.preventDefault();
    setRegleError(null);
    if (fin <= debut) {
      setRegleError("L'heure de fin doit être postérieure à l'heure de début.");
      return;
    }
    setRegleBusy(true);
    try {
      const created = await createRegle({ jour, debut, fin });
      setRegles((prev) => [...(prev ?? []), created]);
    } catch {
      setRegleError("Ajout impossible. Vérifiez les horaires.");
    } finally {
      setRegleBusy(false);
    }
  }

  async function onDeleteRegle(id: string) {
    setRegles((prev) => (prev ?? []).filter((r) => r.id !== id));
    try {
      await deleteRegle(id);
    } catch {
      void reload();
    }
  }

  async function onAddException(e: React.FormEvent) {
    e.preventDefault();
    setExError(null);
    if (!exDebut || !exFin) {
      setExError("Renseignez les dates de début et de fin.");
      return;
    }
    if (exFin < exDebut) {
      setExError("La date de fin doit être postérieure ou égale au début.");
      return;
    }
    setExBusy(true);
    try {
      const created = await createException({
        debut: dayBounds(exDebut),
        fin: dayBounds(exFin, true),
        bloque: exBloque,
        motif: exMotif.trim() || undefined,
      });
      setExceptions((prev) => [...(prev ?? []), created]);
      setExMotif("");
    } catch {
      setExError("Ajout impossible. Vérifiez les dates.");
    } finally {
      setExBusy(false);
    }
  }

  async function onDeleteException(id: string) {
    setExceptions((prev) => (prev ?? []).filter((x) => x.id !== id));
    try {
      await deleteException(id);
    } catch {
      void reload();
    }
  }

  if (error) {
    return (
      <section aria-label="Disponibilités" className="flex flex-col gap-4">
        <h1 className="font-title text-h2 text-encre">Disponibilités</h1>
        <div className="flex flex-col items-center gap-3 rounded-md border border-statut-annule/40 bg-statut-annule-pale px-4 py-8 text-center">
          <p className="font-ui text-sm text-statut-annule">
            Impossible de charger les disponibilités.
          </p>
          <Button variant="ghost" onClick={() => void reload()}>
            Réessayer
          </Button>
        </div>
      </section>
    );
  }

  if (!regles || !exceptions) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Chargement des disponibilités…" />
      </div>
    );
  }

  return (
    <section aria-label="Disponibilités" className="flex max-w-4xl flex-col gap-8">
      <h1 className="font-title text-h2 text-encre">Disponibilités</h1>

      {/* Règles hebdomadaires */}
      <article className="flex flex-col gap-4 rounded-md border border-sable bg-ivoire p-5">
        <header>
          <h2 className="font-title text-h3 text-encre">Horaires d’ouverture</h2>
          <p className="mt-1 font-ui text-sm text-encre-doux">
            Créneaux d’ouverture par jour. Plusieurs plages possibles pour un même jour.
          </p>
        </header>

        {regles.length === 0 ? (
          <p className="font-ui text-sm text-encre-doux">Aucun horaire défini.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-sable/60">
            {regles.map((regle) => (
              <li
                key={regle.id}
                data-testid="regle-row"
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="font-ui text-sm text-encre">
                  <span className="inline-block w-24 font-medium">{days[regle.jour]}</span>
                  {regle.debut} – {regle.fin}
                </span>
                <button
                  type="button"
                  aria-label={`Supprimer l'horaire du ${days[regle.jour]} ${regle.debut}–${regle.fin}`}
                  onClick={() => void onDeleteRegle(regle.id)}
                  className="inline-flex min-h-11 items-center rounded-sm px-3 py-1 font-ui text-sm text-encre-doux transition-colors hover:text-statut-annule focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2"
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={onAddRegle}
          className="flex flex-wrap items-end gap-3 border-t border-sable pt-4"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="regle-jour" className={labelCls}>
              Jour
            </label>
            <select
              id="regle-jour"
              value={jour}
              onChange={(e) => setJour(Number(e.target.value))}
              disabled={regleBusy}
              className={inputCls}
            >
              {days.map((name, index) => (
                <option key={index} value={index}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="regle-debut" className={labelCls}>
              Ouverture
            </label>
            <input
              id="regle-debut"
              type="time"
              value={debut}
              onChange={(e) => setDebut(e.target.value)}
              disabled={regleBusy}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="regle-fin" className={labelCls}>
              Fermeture
            </label>
            <input
              id="regle-fin"
              type="time"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
              disabled={regleBusy}
              className={inputCls}
            />
          </div>
          <Button type="submit" disabled={regleBusy}>
            Ajouter l’horaire
          </Button>
          {regleError && (
            <p role="alert" className="w-full font-ui text-sm text-statut-annule">
              {regleError}
            </p>
          )}
        </form>
      </article>

      {/* Exceptions / blocages */}
      <article className="flex flex-col gap-4 rounded-md border border-sable bg-ivoire p-5">
        <header>
          <h2 className="font-title text-h3 text-encre">Exceptions & blocages</h2>
          <p className="mt-1 font-ui text-sm text-encre-doux">
            Fermetures exceptionnelles (jours fériés, congés) ou ouvertures hors horaires habituels.
          </p>
        </header>

        {exceptions.length === 0 ? (
          <p className="font-ui text-sm text-encre-doux">Aucune exception définie.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-sable/60">
            {exceptions.map((ex) => (
              <li
                key={ex.id}
                data-testid="exception-row"
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="font-ui text-sm text-encre">
                  <span
                    className={`mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      ex.bloque
                        ? "bg-statut-annule-pale text-statut-annule"
                        : "bg-statut-confirme-pale text-statut-confirme"
                    }`}
                  >
                    {ex.bloque ? "Fermé" : "Ouvert"}
                  </span>
                  {formatDate(ex.debut)} → {formatDate(ex.fin)}
                  {ex.motif && <span className="ml-2 text-encre-doux">· {ex.motif}</span>}
                </span>
                <button
                  type="button"
                  aria-label={`Supprimer l'exception du ${formatDate(ex.debut)}`}
                  onClick={() => void onDeleteException(ex.id)}
                  className="inline-flex min-h-11 items-center rounded-sm px-3 py-1 font-ui text-sm text-encre-doux transition-colors hover:text-statut-annule focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2"
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={onAddException}
          className="flex flex-wrap items-end gap-3 border-t border-sable pt-4"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="ex-debut" className={labelCls}>
              Du
            </label>
            <input
              id="ex-debut"
              type="date"
              value={exDebut}
              onChange={(e) => setExDebut(e.target.value)}
              disabled={exBusy}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="ex-fin" className={labelCls}>
              Au
            </label>
            <input
              id="ex-fin"
              type="date"
              value={exFin}
              onChange={(e) => setExFin(e.target.value)}
              disabled={exBusy}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="ex-motif" className={labelCls}>
              Motif (optionnel)
            </label>
            <input
              id="ex-motif"
              type="text"
              value={exMotif}
              onChange={(e) => setExMotif(e.target.value)}
              disabled={exBusy}
              maxLength={255}
              placeholder="Jour férié…"
              className={inputCls}
            />
          </div>
          <label className="flex items-center gap-2 py-2 font-ui text-sm text-encre">
            <input
              type="checkbox"
              checked={exBloque}
              onChange={(e) => setExBloque(e.target.checked)}
              disabled={exBusy}
              className="size-4 accent-or-profond"
            />
            Bloqué (fermé)
          </label>
          <Button type="submit" disabled={exBusy}>
            Ajouter l’exception
          </Button>
          {exError && (
            <p role="alert" className="w-full font-ui text-sm text-statut-annule">
              {exError}
            </p>
          )}
        </form>
      </article>
    </section>
  );
}
