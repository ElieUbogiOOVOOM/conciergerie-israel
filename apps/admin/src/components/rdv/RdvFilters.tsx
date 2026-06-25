import { statutsRendezVous, typesClient, type Prestation } from "@hymea/shared";
import { statutMeta, typeClientLabel } from "@/lib/status";

/** État des filtres de la liste (chaînes vides = « tous »). */
export interface RdvFiltersState {
  search: string;
  statut: string;
  typeClient: string;
  prestationId: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: RdvFiltersState = {
  search: "",
  statut: "",
  typeClient: "",
  prestationId: "",
  dateFrom: "",
  dateTo: "",
};

const fieldClass =
  "rounded-sm border border-sable bg-ivoire px-2.5 py-1.5 font-ui text-sm text-encre focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:outline-offset-2";

/** Barre de filtres + recherche de la liste RDV (combinables, #35). */
export function RdvFilters({
  value,
  prestations,
  onChange,
  onReset,
}: {
  value: RdvFiltersState;
  prestations: Prestation[];
  onChange: (patch: Partial<RdvFiltersState>) => void;
  onReset: () => void;
}) {
  const dirty = Object.values(value).some((v) => v !== "");

  return (
    <div className="flex flex-col gap-3 rounded-md border border-sable bg-creme/50 p-3">
      <label className="flex flex-col gap-1">
        <span className="sr-only">Rechercher un client</span>
        <input
          type="search"
          name="search"
          placeholder="Rechercher par nom, prénom ou email…"
          value={value.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className={`${fieldClass} w-full`}
        />
      </label>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-ui text-xs font-medium text-encre-doux">Statut</span>
          <select
            value={value.statut}
            onChange={(e) => onChange({ statut: e.target.value })}
            className={fieldClass}
          >
            <option value="">Tous</option>
            {statutsRendezVous.map((s) => (
              <option key={s} value={s}>
                {statutMeta[s].label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-ui text-xs font-medium text-encre-doux">Type de client</span>
          <select
            value={value.typeClient}
            onChange={(e) => onChange({ typeClient: e.target.value })}
            className={fieldClass}
          >
            <option value="">Tous</option>
            {typesClient.map((t) => (
              <option key={t} value={t}>
                {typeClientLabel[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-ui text-xs font-medium text-encre-doux">Prestation</span>
          <select
            value={value.prestationId}
            onChange={(e) => onChange({ prestationId: e.target.value })}
            className={fieldClass}
          >
            <option value="">Toutes</option>
            {prestations.map((p) => (
              <option key={p.id} value={p.id}>
                {p.libelle.fr}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-ui text-xs font-medium text-encre-doux">Du</span>
          <input
            type="date"
            value={value.dateFrom}
            onChange={(e) => onChange({ dateFrom: e.target.value })}
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-ui text-xs font-medium text-encre-doux">Au</span>
          <input
            type="date"
            value={value.dateTo}
            onChange={(e) => onChange({ dateTo: e.target.value })}
            className={fieldClass}
          />
        </label>

        {dirty && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-sm px-2.5 py-1.5 font-ui text-sm text-or-profond hover:underline"
          >
            Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
}
