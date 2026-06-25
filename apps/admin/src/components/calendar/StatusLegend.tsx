import { statutsRendezVous } from "@hymea/shared";
import { statutMeta } from "@/lib/status";

/** Légende des couleurs de statut (rappel de la sémantique charte). */
export function StatusLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {statutsRendezVous.map((statut) => {
        const meta = statutMeta[statut];
        return (
          <li
            key={statut}
            className="inline-flex items-center gap-1.5 font-ui text-xs text-encre-doux"
          >
            <span className={`size-2.5 rounded-full ${meta.dot}`} aria-hidden />
            {meta.label}
          </li>
        );
      })}
    </ul>
  );
}
