"use client";

import { useState } from "react";
import type { Equipe, Intervenant } from "@hymea/shared";
import { ApiError, createIntervenant, updateIntervenant, type IntervenantPayload } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { fieldClass, labelClass } from "@/components/ui/form";

/**
 * Formulaire (modale) de création/édition d'un intervenant : nom, prénom,
 * équipe de rattachement (optionnelle), état actif/inactif.
 */
export function IntervenantForm({
  intervenant,
  equipes,
  onClose,
  onSaved,
}: {
  intervenant: Intervenant | null;
  equipes: Equipe[];
  onClose: () => void;
  onSaved: (i: Intervenant) => void;
}) {
  const editing = intervenant !== null;
  const [nom, setNom] = useState(intervenant?.nom ?? "");
  const [prenom, setPrenom] = useState(intervenant?.prenom ?? "");
  const [equipeId, setEquipeId] = useState(intervenant?.equipeId ?? "");
  const [actif, setActif] = useState(intervenant?.actif ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (nom.trim() === "") {
      setError("Le nom est requis.");
      return;
    }

    const payload: IntervenantPayload = {
      nom: nom.trim(),
      prenom: prenom.trim() === "" ? null : prenom.trim(),
      equipeId: equipeId === "" ? null : equipeId,
      actif,
    };

    setSubmitting(true);
    try {
      const saved = editing
        ? await updateIntervenant(intervenant.id, payload)
        : await createIntervenant(payload);
      onSaved(saved);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 0
          ? "Connexion impossible. Réessayez."
          : "Enregistrement impossible.",
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal title={editing ? "Modifier l'intervenant" : "Nouvel intervenant"} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Nom</span>
          <input
            type="text"
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className={`${fieldClass} w-full`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Prénom (optionnel)</span>
          <input
            type="text"
            value={prenom ?? ""}
            onChange={(e) => setPrenom(e.target.value)}
            className={`${fieldClass} w-full`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Équipe</span>
          <select
            value={equipeId ?? ""}
            onChange={(e) => setEquipeId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Sans équipe</option>
            {equipes.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.nom}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={actif}
            onChange={(e) => setActif(e.target.checked)}
            className="size-4 accent-or-profond"
          />
          <span className="font-ui text-sm text-encre">Actif (assignable aux RDV)</span>
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-sm border border-statut-annule/40 bg-statut-annule-pale px-3 py-2 font-ui text-sm text-statut-annule"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-sable pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Enregistrement…" : editing ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
