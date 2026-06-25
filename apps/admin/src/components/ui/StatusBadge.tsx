import type { StatutRendezVous } from "@hymea/shared";
import { statutMeta } from "@/lib/status";

/** Badge de statut de RDV (puce colorée + libellé FR), fidèle à la sémantique charte. */
export function StatusBadge({ statut }: { statut: StatutRendezVous }) {
  const meta = statutMeta[statut];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-ui text-xs font-medium ${meta.badge}`}
    >
      <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
    </span>
  );
}
