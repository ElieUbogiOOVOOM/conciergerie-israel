import Link from "next/link";
import type { RendezVousDetail } from "@hymea/shared";
import { statutMeta } from "@/lib/status";
import { formatTime } from "@/lib/datetime";

/** Libellé court d'un RDV : « Nom Prénom ». */
export function rdvTitle(rdv: RendezVousDetail): string {
  return `${rdv.client.nom} ${rdv.client.prenom}`.trim();
}

/**
 * Pastille compacte d'un RDV (vue mois) : heure + client, teintée par statut
 * (NOUVEAU pâle / CONFIRME plein, etc.). Cliquable → fiche.
 */
export function EventChip({ rdv }: { rdv: RendezVousDetail }) {
  const meta = statutMeta[rdv.statut];
  return (
    <Link
      href={`/rendez-vous/${rdv.id}`}
      data-testid="calendar-event"
      data-statut={rdv.statut}
      className={`block truncate rounded-sm px-1.5 py-0.5 font-ui text-xs transition-opacity hover:opacity-80 ${meta.event}`}
    >
      {rdv.debut && <span className="font-medium">{formatTime(rdv.debut)} </span>}
      {rdvTitle(rdv)}
    </Link>
  );
}
