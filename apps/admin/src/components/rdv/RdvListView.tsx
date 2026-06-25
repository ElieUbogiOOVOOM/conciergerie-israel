"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Paginated, Prestation, RendezVousDetail, StatutRendezVous } from "@hymea/shared";
import { isStatutRendezVous, isTypeClient } from "@hymea/shared";
import {
  downloadRendezVousCsv,
  listPrestations,
  listRendezVous,
  type RendezVousQuery,
} from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Pagination } from "./Pagination";
import { RdvTable } from "./RdvTable";
import { EMPTY_FILTERS, RdvFilters, type RdvFiltersState } from "./RdvFilters";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

/** Construit la requête API à partir des filtres (dates → bornes ISO). */
function toQuery(filters: RdvFiltersState, search: string, page: number): RendezVousQuery {
  return {
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    statut:
      filters.statut && isStatutRendezVous(filters.statut)
        ? (filters.statut as StatutRendezVous)
        : undefined,
    typeClient:
      filters.typeClient && isTypeClient(filters.typeClient) ? filters.typeClient : undefined,
    prestationId: filters.prestationId || undefined,
    dateFrom: filters.dateFrom ? `${filters.dateFrom}T00:00:00.000Z` : undefined,
    dateTo: filters.dateTo ? `${filters.dateTo}T23:59:59.999Z` : undefined,
  };
}

/**
 * Liste filtrable des RDV (#35) : table paginée + recherche (débattue) + filtres
 * combinables (date, statut, type de client, prestation), cohérents avec l'API.
 */
export function RdvListView({ initialDateFrom = "" }: { initialDateFrom?: string }) {
  const [filters, setFilters] = useState<RdvFiltersState>({
    ...EMPTY_FILTERS,
    dateFrom: initialDateFrom,
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<RendezVousDetail> | null>(null);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvError, setCsvError] = useState(false);

  // Catalogue des prestations (filtre) — chargé une fois.
  useEffect(() => {
    listPrestations()
      .then(setPrestations)
      .catch(() => setPrestations([]));
  }, []);

  // Recherche débattue : retarde l'appel et revient en page 1. Ignore le montage
  // initial (la recherche est déjà vide) pour ne pas réinitialiser la pagination.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const id = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [filters.search]);

  const query = useMemo(
    () => toQuery(filters, debouncedSearch, page),
    [filters, debouncedSearch, page],
  );

  // Garde anti-réponses hors-ordre : seule la requête la plus récente s'applique
  // (sinon une réponse lente d'une page précédente écrase la page courante).
  const reqId = useRef(0);
  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(false);
    try {
      const res = await listRendezVous(query);
      if (id === reqId.current) setData(res);
    } catch {
      if (id === reqId.current) setError(true);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  // Met à jour les filtres (hors recherche) et revient en page 1.
  const patchFilters = useCallback((patch: Partial<RdvFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    if (!("search" in patch)) setPage(1);
  }, []);

  const reset = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setDebouncedSearch("");
    setPage(1);
  }, []);

  // Export CSV respectant les filtres courants (pagination ignorée côté API).
  const exportCsv = useCallback(async () => {
    setCsvBusy(true);
    setCsvError(false);
    try {
      await downloadRendezVousCsv(query);
    } catch {
      setCsvError(true);
    } finally {
      setCsvBusy(false);
    }
  }, [query]);

  return (
    <section aria-label="Liste des rendez-vous" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-title text-h2 text-encre">Rendez-vous</h1>
        <div className="flex items-center gap-3">
          {csvError && (
            <span role="alert" className="font-ui text-sm text-statut-annule">
              Export impossible.
            </span>
          )}
          <Button variant="ghost" onClick={() => void exportCsv()} disabled={csvBusy}>
            {csvBusy ? "Export…" : "Exporter CSV"}
          </Button>
        </div>
      </div>

      <RdvFilters
        value={filters}
        prestations={prestations}
        onChange={patchFilters}
        onReset={reset}
      />

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-statut-annule/40 bg-statut-annule-pale px-4 py-8 text-center">
          <p className="font-ui text-sm text-statut-annule">
            Impossible de charger les rendez-vous.
          </p>
          <Button variant="ghost" onClick={() => void load()}>
            Réessayer
          </Button>
        </div>
      ) : loading && !data ? (
        <div className="flex justify-center py-16">
          <Spinner label="Chargement des rendez-vous…" />
        </div>
      ) : (
        data && (
          <>
            <div
              aria-busy={loading}
              className={loading ? "opacity-60 transition-opacity" : undefined}
            >
              <RdvTable items={data.items} />
            </div>
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onPage={setPage}
              busy={loading}
            />
          </>
        )
      )}
    </section>
  );
}
