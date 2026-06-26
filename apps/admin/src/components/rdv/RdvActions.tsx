"use client";

import { useEffect, useState } from "react";
import type { Intervenant, RendezVousDetail, StatutRendezVous } from "@hymea/shared";
import { transitionsStatut } from "@hymea/shared";
import {
  ApiError,
  assignIntervenant,
  changeStatut,
  listIntervenants,
  rescheduleRendezVous,
} from "@/lib/api";
import { statutActionLabel } from "@/lib/status";
import { datetimeLocalToIso, toDatetimeLocalValue } from "@/lib/datetime";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/** Statuts terminaux : aucune transition ni replanification possible (API). */
const TERMINAL: readonly StatutRendezVous[] = ["REALISE", "ANNULE"];

/** Message d'erreur lisible selon le statut HTTP renvoyé par l'API. */
function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return "Action impossible dans l'état actuel du rendez-vous.";
    if (err.status === 404) return "Élément introuvable.";
    if (err.status === 0) return "Connexion impossible. Réessayez.";
  }
  return "Une erreur est survenue. Réessayez.";
}

interface Feedback {
  kind: "ok" | "error";
  text: string;
}

/** Petit indicateur de chargement inline, posé dans le bouton actif. */
function InlineSpinner() {
  return (
    <span
      className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
      aria-hidden
    />
  );
}

/**
 * Panneau d'actions de la fiche RDV (#36) : changement de statut (transitions
 * valides), attribution d'un intervenant et replanification du créneau. Chaque
 * action appelle l'API (qui notifie le client par email) puis remonte le RDV à jour.
 */
export function RdvActions({
  rdv,
  onUpdated,
}: {
  rdv: RendezVousDetail;
  onUpdated: (rdv: RendezVousDetail) => void;
}) {
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [newSlot, setNewSlot] = useState(() => toDatetimeLocalValue(rdv.debut));

  // Liste des intervenants pour le sélecteur d'attribution (chargée une fois).
  useEffect(() => {
    listIntervenants()
      .then(setIntervenants)
      .catch(() => setIntervenants([]));
  }, []);

  const terminal = TERMINAL.includes(rdv.statut);
  // Transitions proposées en boutons : on retire REPLANIFIE (géré par le créneau).
  const statusTargets = transitionsStatut[rdv.statut].filter((s) => s !== "REPLANIFIE");
  // Une seule action « nominale » mise en avant ; les autres en retrait (hiérarchie).
  const primaryTarget = statusTargets.find((s) => s !== "ANNULE");

  async function run(key: string, action: () => Promise<RendezVousDetail>, okText: string) {
    setBusy(key);
    setFeedback(null);
    try {
      const updated = await action();
      onUpdated(updated);
      setNewSlot(toDatetimeLocalValue(updated.debut));
      setFeedback({ kind: "ok", text: okText });
    } catch (err) {
      setFeedback({ kind: "error", text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  function onStatusClick(target: StatutRendezVous) {
    if (target === "ANNULE") {
      setConfirmCancel(true);
      return;
    }
    void run(
      `statut-${target}`,
      () => changeStatut(rdv.id, target),
      `Statut mis à jour : ${statutActionLabel[target]}.`,
    );
  }

  function onAssign(value: string) {
    void run(
      "intervenant",
      () => assignIntervenant(rdv.id, value || null),
      value ? "Intervenant attribué." : "Attribution retirée.",
    );
  }

  function onReschedule() {
    const iso = datetimeLocalToIso(newSlot);
    if (!iso) {
      setFeedback({ kind: "error", text: "Choisissez une date et une heure valides." });
      return;
    }
    void run("reschedule", () => rescheduleRendezVous(rdv.id, iso), "Rendez-vous replanifié.");
  }

  return (
    <section
      aria-label="Actions sur le rendez-vous"
      className="flex flex-col gap-5 rounded-md border border-sable bg-ivoire p-5"
    >
      <h2 className="font-title text-h3 text-encre">Actions</h2>

      {feedback && (
        <p
          role="status"
          aria-live="polite"
          className={`rounded-sm px-3 py-2 font-ui text-sm ${
            feedback.kind === "ok"
              ? "bg-statut-confirme-pale text-statut-confirme"
              : "bg-statut-annule-pale text-statut-annule"
          }`}
        >
          {feedback.text}
        </p>
      )}

      {/* Changement de statut */}
      <div className="flex flex-col gap-2">
        <h3 className="font-ui text-xs font-medium uppercase tracking-wider text-encre-doux">
          Statut
        </h3>
        {statusTargets.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {statusTargets.map((target) => (
              <Button
                key={target}
                variant={
                  target === "ANNULE" ? "danger" : target === primaryTarget ? "primary" : "ghost"
                }
                disabled={busy !== null}
                onClick={() => onStatusClick(target)}
              >
                {busy === `statut-${target}` && <InlineSpinner />}
                {statutActionLabel[target]}
              </Button>
            ))}
          </div>
        ) : (
          <p className="font-ui text-sm text-encre-doux">
            Ce rendez-vous est clôturé : aucune action de statut possible.
          </p>
        )}
      </div>

      {/* Attribution intervenant */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="rdv-intervenant"
          className="flex items-center gap-2 font-ui text-xs font-medium uppercase tracking-wider text-encre-doux"
        >
          Intervenant
          {busy === "intervenant" && <InlineSpinner />}
        </label>
        <select
          id="rdv-intervenant"
          value={rdv.intervenantId ?? ""}
          disabled={busy !== null}
          onChange={(e) => onAssign(e.target.value)}
          className="rounded-sm border border-encre/20 bg-creme px-3 py-2 font-ui text-sm text-encre focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2 disabled:opacity-50 sm:max-w-xs"
        >
          <option value="">Non attribué</option>
          {intervenants.map((it) => (
            <option key={it.id} value={it.id}>
              {it.nom}
              {it.prenom ? ` ${it.prenom}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Replanification */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="rdv-reschedule"
          className="font-ui text-xs font-medium uppercase tracking-wider text-encre-doux"
        >
          Replanifier le créneau
        </label>
        {terminal ? (
          <p className="font-ui text-sm text-encre-doux">
            Un rendez-vous {rdv.statut === "ANNULE" ? "annulé" : "réalisé"} ne peut pas être
            replanifié.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="rdv-reschedule"
              type="datetime-local"
              value={newSlot}
              disabled={busy !== null}
              onChange={(e) => setNewSlot(e.target.value)}
              className="rounded-sm border border-encre/20 bg-creme px-3 py-2 font-ui text-sm text-encre focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2 disabled:opacity-50"
            />
            <Button variant="ghost" disabled={busy !== null} onClick={onReschedule}>
              {busy === "reschedule" && <InlineSpinner />}
              Replanifier
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Annuler ce rendez-vous ?"
        description="Le client sera notifié par email de l'annulation. Cette action est définitive (statut terminal)."
        confirmLabel="Annuler le RDV"
        cancelLabel="Revenir"
        destructive
        busy={busy === "statut-ANNULE"}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          void run("statut-ANNULE", () => changeStatut(rdv.id, "ANNULE"), "Rendez-vous annulé.");
        }}
      />
    </section>
  );
}
