import { useRouter } from "next/navigation";
import type { RendezVousDetail } from "@hymea/shared";
import { formatDateTime } from "@/lib/datetime";
import { typeClientLabel } from "@/lib/status";
import { StatusBadge } from "@/components/ui/StatusBadge";

const COLUMNS = ["Client", "Créneau", "Prestation", "Type", "Statut"];

/**
 * Tableau des RDV. Chaque ligne est cliquable (→ fiche) et accessible au clavier.
 * Les libellés de prestation sont en français (back-office mono-langue).
 */
export function RdvTable({ items }: { items: RendezVousDetail[] }) {
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-sable bg-ivoire px-4 py-10 text-center">
        <p className="font-ui text-sm text-encre-doux">
          Aucun rendez-vous ne correspond à ces critères.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-sable bg-ivoire">
      <table className="w-full min-w-[40rem] border-collapse text-left">
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
          {items.map((rdv) => (
            <tr
              key={rdv.id}
              data-testid="rdv-row"
              tabIndex={0}
              role="link"
              onClick={() => router.push(`/rendez-vous/${rdv.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") router.push(`/rendez-vous/${rdv.id}`);
              }}
              className="cursor-pointer border-b border-sable/60 transition-colors last:border-b-0 hover:bg-sable/30 focus-visible:bg-sable/30 focus-visible:outline-2 focus-visible:outline-or-profond focus-visible:-outline-offset-2"
            >
              <td className="px-4 py-3 font-ui text-sm">
                <span className="font-medium text-encre">
                  {rdv.client.nom} {rdv.client.prenom}
                </span>
                <span className="block text-xs text-encre-doux">{rdv.client.email}</span>
              </td>
              <td className="px-4 py-3 font-ui text-sm text-encre">{formatDateTime(rdv.debut)}</td>
              <td className="px-4 py-3 font-ui text-sm text-encre">{rdv.prestation.libelle.fr}</td>
              <td className="px-4 py-3 font-ui text-sm text-encre-doux">
                {typeClientLabel[rdv.typeClient]}
              </td>
              <td className="px-4 py-3">
                <StatusBadge statut={rdv.statut} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
