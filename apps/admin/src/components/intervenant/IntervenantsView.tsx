"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Equipe, Intervenant } from "@hymea/shared";
import { disableIntervenant, listEquipes, listIntervenants } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { fieldClass, labelClass } from "@/components/ui/form";
import { EquipesManager } from "./EquipesManager";
import { IntervenantForm } from "./IntervenantForm";

type ActifFilter = "" | "actifs" | "inactifs";

function fullName(i: Intervenant): string {
  return i.prenom ? `${i.nom} ${i.prenom}` : i.nom;
}

/**
 * Gestion des intervenants et équipes (#40) : liste filtrable, création/édition
 * via modale, désactivation (soft-delete), et gestion des équipes. Les intervenants
 * actifs sont assignables à un RDV depuis sa fiche.
 */
export function IntervenantsView() {
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actif, setActif] = useState<ActifFilter>("");
  const [equipeId, setEquipeId] = useState("");
  const [editing, setEditing] = useState<Intervenant | null>(null);
  const [creating, setCreating] = useState(false);
  const [managingEquipes, setManagingEquipes] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [iv, eq] = await Promise.all([listIntervenants(), listEquipes()]);
      setIntervenants(iv);
      setEquipes(eq);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const equipeName = useMemo(() => {
    const map = new Map(equipes.map((eq) => [eq.id, eq.nom]));
    return (id: string | null) => (id ? (map.get(id) ?? "Sans équipe") : "Sans équipe");
  }, [equipes]);

  const filtered = useMemo(
    () =>
      intervenants.filter((i) => {
        if (actif === "actifs" && !i.actif) return false;
        if (actif === "inactifs" && i.actif) return false;
        if (equipeId && i.equipeId !== equipeId) return false;
        return true;
      }),
    [intervenants, actif, equipeId],
  );

  const upsert = useCallback((saved: Intervenant) => {
    setIntervenants((prev) => {
      const idx = prev.findIndex((i) => i.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
    setEditing(null);
    setCreating(false);
  }, []);

  const onDisable = useCallback(async (i: Intervenant) => {
    if (!window.confirm(`Désactiver « ${fullName(i)} » ? Il ne sera plus assignable.`)) {
      return;
    }
    setPendingId(i.id);
    try {
      const updated = await disableIntervenant(i.id);
      setIntervenants((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch {
      window.alert("Désactivation impossible.");
    } finally {
      setPendingId(null);
    }
  }, []);

  return (
    <section aria-label="Intervenants" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-title text-h2 text-encre">Intervenants</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setManagingEquipes(true)}>
            Gérer les équipes
          </Button>
          <Button onClick={() => setCreating(true)}>+ Nouvel intervenant</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-sable bg-creme/50 p-3">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>État</span>
          <select
            value={actif}
            onChange={(e) => setActif(e.target.value as ActifFilter)}
            className={fieldClass}
          >
            <option value="">Tous</option>
            <option value="actifs">Actifs</option>
            <option value="inactifs">Inactifs</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Équipe</span>
          <select
            value={equipeId}
            onChange={(e) => setEquipeId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Toutes</option>
            {equipes.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.nom}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-statut-annule/40 bg-statut-annule-pale px-4 py-8 text-center">
          <p className="font-ui text-sm text-statut-annule">
            Impossible de charger les intervenants.
          </p>
          <Button variant="ghost" onClick={() => void load()}>
            Réessayer
          </Button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Chargement des intervenants…" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-md border border-sable bg-ivoire px-4 py-8 text-center font-ui text-sm text-encre-doux">
          Aucun intervenant pour ces filtres.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-sable">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-sable bg-creme/60">
                <th
                  scope="col"
                  className="px-3 py-2 font-ui text-xs font-medium uppercase tracking-wider text-encre-doux"
                >
                  Nom
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 font-ui text-xs font-medium uppercase tracking-wider text-encre-doux"
                >
                  Équipe
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 font-ui text-xs font-medium uppercase tracking-wider text-encre-doux"
                >
                  État
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right font-ui text-xs font-medium uppercase tracking-wider text-encre-doux"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-b border-sable/60 last:border-b-0">
                  <td className="px-3 py-2.5 font-ui text-sm text-encre">{fullName(i)}</td>
                  <td className="px-3 py-2.5 font-ui text-sm text-encre-doux">
                    {equipeName(i.equipeId)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-sm px-2 py-0.5 font-ui text-xs font-medium ${
                        i.actif
                          ? "bg-statut-confirme-pale text-statut-confirme ring-1 ring-statut-confirme/40"
                          : "bg-statut-realise-pale text-statut-realise ring-1 ring-statut-realise/40"
                      }`}
                    >
                      {i.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(i)}
                        className="rounded-sm px-2 py-1 font-ui text-sm text-or-profond hover:underline focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2"
                      >
                        Modifier
                      </button>
                      {i.actif && (
                        <button
                          type="button"
                          onClick={() => void onDisable(i)}
                          disabled={pendingId === i.id}
                          className="rounded-sm px-2 py-1 font-ui text-sm text-statut-annule hover:underline disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-statut-annule focus-visible:outline-offset-2"
                        >
                          {pendingId === i.id ? "…" : "Désactiver"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <IntervenantForm
          intervenant={editing}
          equipes={equipes}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={upsert}
        />
      )}

      {managingEquipes && (
        <EquipesManager
          equipes={equipes}
          onChanged={() => void load()}
          onClose={() => setManagingEquipes(false)}
        />
      )}
    </section>
  );
}
