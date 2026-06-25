/** Pagination simple : précédent / suivant + position. */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  busy = false,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  /** Désactive les boutons pendant un chargement (évite les doubles clics). */
  busy?: boolean;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 font-ui text-sm text-encre-doux">
      <span data-testid="pagination-range">
        {total === 0 ? "Aucun résultat" : `${from}–${to} sur ${total}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={busy || page <= 1}
          className="rounded-sm border border-encre/20 px-3 py-1.5 hover:border-or hover:text-or-profond disabled:opacity-40 disabled:hover:border-encre/20 disabled:hover:text-encre-doux"
        >
          Précédent
        </button>
        <span aria-current="page">
          {page} / {lastPage}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={busy || page >= lastPage}
          className="rounded-sm border border-encre/20 px-3 py-1.5 hover:border-or hover:text-or-profond disabled:opacity-40 disabled:hover:border-encre/20 disabled:hover:text-encre-doux"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
