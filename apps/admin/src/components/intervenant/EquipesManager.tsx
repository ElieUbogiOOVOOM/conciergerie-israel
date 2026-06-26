"use client";

import { useState } from "react";
import type { Equipe } from "@hymea/shared";
import { createEquipe, deleteEquipe, updateEquipe } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { fieldClass } from "@/components/ui/form";

/**
 * Modale de gestion des équipes : création, renommage en ligne et suppression
 * (les intervenants rattachés sont détachés côté API). Notifie le parent après
 * chaque mutation pour resynchroniser les listes.
 */
export function EquipesManager({
  equipes,
  onChanged,
  onClose,
}: {
  equipes: Equipe[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function draftFor(eq: Equipe): string {
    return drafts[eq.id] ?? eq.nom;
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch {
      setError("Opération impossible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    if (newName.trim() === "") return;
    await run(async () => {
      await createEquipe(newName.trim());
      setNewName("");
    });
  }

  async function onRename(eq: Equipe) {
    const next = draftFor(eq).trim();
    if (next === "" || next === eq.nom) return;
    await run(() => updateEquipe(eq.id, next));
  }

  async function onDelete(eq: Equipe) {
    if (!window.confirm(`Supprimer l'équipe « ${eq.nom} » ? Ses intervenants seront détachés.`)) {
      return;
    }
    await run(() => deleteEquipe(eq.id));
  }

  return (
    <Modal title="Gérer les équipes" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <form onSubmit={onAdd} className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="font-ui text-xs font-medium text-encre-doux">Nouvelle équipe</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom de l'équipe"
              className={`${fieldClass} w-full`}
            />
          </label>
          <Button type="submit" disabled={busy || newName.trim() === ""}>
            Ajouter
          </Button>
        </form>

        {equipes.length === 0 ? (
          <p className="rounded-sm border border-sable bg-creme/50 px-3 py-4 text-center font-ui text-sm text-encre-doux">
            Aucune équipe pour le moment.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {equipes.map((eq) => (
              <li key={eq.id} className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label={`Nom de l'équipe ${eq.nom}`}
                  value={draftFor(eq)}
                  onChange={(e) => setDrafts((d) => ({ ...d, [eq.id]: e.target.value }))}
                  className={`${fieldClass} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => void onRename(eq)}
                  disabled={busy || draftFor(eq).trim() === "" || draftFor(eq).trim() === eq.nom}
                  className="rounded-sm px-2 py-1 font-ui text-sm text-or-profond hover:underline disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2"
                >
                  Renommer
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(eq)}
                  disabled={busy}
                  className="rounded-sm px-2 py-1 font-ui text-sm text-statut-annule hover:underline disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-statut-annule focus-visible:outline-offset-2"
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-sm border border-statut-annule/40 bg-statut-annule-pale px-3 py-2 font-ui text-sm text-statut-annule"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end border-t border-sable pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
