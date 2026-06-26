"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Client, Paginated } from "@hymea/shared";
import { listClients } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/rdv/Pagination";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

const COLUMNS = ["Client", "Téléphone", "État", "Fiche créée le"];

/** Liste filtrable des clients (#37) : recherche débattue + table paginée. */
export function ClientsListView() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Client> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Recherche débattue : retarde l'appel et revient en page 1 (ignore le montage).
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  const query = useMemo(
    () => ({ page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined }),
    [page, debouncedSearch],
  );

  // Garde anti-réponses hors-ordre (cf. liste RDV).
  const reqId = useRef(0);
  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(false);
    try {
      const res = await listClients(query);
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

  function open(id: string) {
    router.push(`/clients/${id}`);
  }

  return (
    <section aria-label="Liste des clients" className="flex flex-col gap-4">
      <h1 className="font-title text-h2 text-encre">Clients</h1>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher par nom, prénom ou email…"
        aria-label="Rechercher un client"
        className="w-full max-w-md rounded-sm border border-encre/20 bg-creme px-3 py-2 font-ui text-sm text-encre focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2"
      />

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-statut-annule/40 bg-statut-annule-pale px-4 py-8 text-center">
          <p className="font-ui text-sm text-statut-annule">Impossible de charger les clients.</p>
          <Button variant="ghost" onClick={() => void load()}>
            Réessayer
          </Button>
        </div>
      ) : loading && !data ? (
        <div className="flex justify-center py-16">
          <Spinner label="Chargement des clients…" />
        </div>
      ) : (
        data && (
          <>
            <div
              aria-busy={loading}
              className={loading ? "opacity-60 transition-opacity" : undefined}
            >
              {data.items.length === 0 ? (
                <div className="rounded-md border border-sable bg-ivoire px-4 py-10 text-center">
                  <p className="font-ui text-sm text-encre-doux">
                    Aucun client ne correspond à cette recherche.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border border-sable bg-ivoire">
                  <table className="w-full min-w-[36rem] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-sable">
                        {COLUMNS.map((col) => (
                          <th
                            key={col}
                            scope="col"
                            className="px-4 py-3 font-ui text-xs font-medium uppercase tracking-wider text-encre-doux"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((client) => (
                        <tr
                          key={client.id}
                          data-testid="client-row"
                          tabIndex={0}
                          role="link"
                          onClick={() => open(client.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") open(client.id);
                          }}
                          className="cursor-pointer border-b border-sable/60 transition-colors last:border-b-0 hover:bg-sable/30 focus-visible:bg-sable/30 focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:-outline-offset-2"
                        >
                          <td className="px-4 py-3 font-ui text-sm">
                            <span className="font-medium text-encre">
                              {client.nom} {client.prenom}
                            </span>
                            <span className="block text-xs text-encre-doux">{client.email}</span>
                          </td>
                          <td className="px-4 py-3 font-ui text-sm text-encre">
                            {client.telephone}
                          </td>
                          <td className="px-4 py-3 font-ui text-sm">
                            {client.anonymizedAt ? (
                              <span className="text-encre-doux">Anonymisé</span>
                            ) : (
                              <span className="text-statut-confirme">Actif</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-ui text-sm text-encre-doux">
                            {formatDateTime(client.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
