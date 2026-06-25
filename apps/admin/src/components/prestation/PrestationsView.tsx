"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { typesClient, type Prestation, type TypeClient } from "@hymea/shared";
import { disablePrestation, listPrestations } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { fieldClass, labelClass } from "@/components/ui/form";
import { typeClientLabel } from "@/lib/status";
import { PrestationForm } from "./PrestationForm";

type CibleFilter = TypeClient | "";
type ActifFilter = "" | "actives" | "inactives";

/**
 * Gestion du catalogue de prestations (#39) : liste filtrable (cible, état),
 * création/édition via modale, désactivation (soft-delete).
 */
export function PrestationsView() {
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cible, setCible] = useState<CibleFilter>("");
  const [actif, setActif] = useState<ActifFilter>("");
  const [editing, setEditing] = useState<Prestation | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setPrestations(await listPrestations());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      prestations.filter((p) => {
        if (cible && p.cible !== cible) return false;
        if (actif === "actives" && !p.actif) return false;
        if (actif === "inactives" && p.actif) return false;
        return true;
      }),
    [prestations, cible, actif],
  );

  const upsert = useCallback((saved: Prestation) => {
    setPrestations((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
    setEditing(null);
    setCreating(false);
  }, []);

  const onDisable = useCallback(async (p: Prestation) => {
    if (!window.confirm(`Désactiver « ${p.libelle.fr} » ? Elle disparaîtra du funnel public.`)) {
      return;
    }
    setPendingId(p.id);
    try {
      const updated = await disablePrestation(p.id);
      setPrestations((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch {
      window.alert("Désactivation impossible.");
    } finally {
      setPendingId(null);
    }
  }, []);

  return (
    <section aria-label="Prestations" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-title text-h2 text-encre">Prestations</h1>
        <Button onClick={() => setCreating(true)}>+ Nouvelle prestation</Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-sable bg-creme/50 p-3">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Cible</span>
          <select
            value={cible}
            onChange={(e) => setCible(e.target.value as CibleFilter)}
            className={fieldClass}
          >
            <option value="">Toutes</option>
            {typesClient.map((t) => (
              <option key={t} value={t}>
                {typeClientLabel[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>État</span>
          <select
            value={actif}
            onChange={(e) => setActif(e.target.value as ActifFilter)}
            className={fieldClass}
          >
            <option value="">Toutes</option>
            <option value="actives">Actives</option>
            <option value="inactives">Inactives</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-statut-annule/40 bg-statut-annule-pale px-4 py-8 text-center">
          <p className="font-ui text-sm text-statut-annule">
            Impossible de charger les prestations.
          </p>
          <Button variant="ghost" onClick={() => void load()}>
            Réessayer
          </Button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Chargement des prestations…" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-md border border-sable bg-ivoire px-4 py-8 text-center font-ui text-sm text-encre-doux">
          Aucune prestation pour ces filtres.
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
                  Libellé
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 font-ui text-xs font-medium uppercase tracking-wider text-encre-doux"
                >
                  Cible
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 font-ui text-xs font-medium uppercase tracking-wider text-encre-doux"
                >
                  Durée
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
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-sable/60 last:border-b-0">
                  <td className="px-3 py-2.5 font-ui text-sm text-encre">{p.libelle.fr}</td>
                  <td className="px-3 py-2.5 font-ui text-sm text-encre-doux">
                    {typeClientLabel[p.cible]}
                  </td>
                  <td className="px-3 py-2.5 font-ui text-sm text-encre-doux">
                    {p.dureeMinutes} min
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-sm px-2 py-0.5 font-ui text-xs font-medium ${
                        p.actif
                          ? "bg-statut-confirme-pale text-statut-confirme ring-1 ring-statut-confirme/40"
                          : "bg-statut-realise-pale text-statut-realise ring-1 ring-statut-realise/40"
                      }`}
                    >
                      {p.actif ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(p)}
                        className="rounded-sm px-2 py-1 font-ui text-sm text-or-profond hover:underline focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2"
                      >
                        Modifier
                      </button>
                      {p.actif && (
                        <button
                          type="button"
                          onClick={() => void onDisable(p)}
                          disabled={pendingId === p.id}
                          className="rounded-sm px-2 py-1 font-ui text-sm text-statut-annule hover:underline disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-statut-annule focus-visible:outline-offset-2"
                        >
                          {pendingId === p.id ? "…" : "Désactiver"}
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
        <PrestationForm
          prestation={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={upsert}
        />
      )}
    </section>
  );
}
