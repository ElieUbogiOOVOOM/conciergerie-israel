import type { StatutRendezVous, TypeClient } from "@hymea/shared";

/**
 * Métadonnées d'affichage des statuts de RDV (source unique pour badges,
 * légende et pastilles du calendrier). Couleurs sémantiques : README §Statuts.
 * `badge` = puce de liste/fiche ; `event` = pastille du planning où, par la
 * charte, NOUVEAU reste PÂLE et CONFIRME passe en couleur PLEINE.
 */
export interface StatutMeta {
  label: string;
  /** Classes du badge (fond pâle + texte plein) pour liste/fiche. */
  badge: string;
  /** Classes de la pastille calendrier (pâle pour NOUVEAU, plein pour CONFIRME…). */
  event: string;
  /** Pastille de légende (carré de couleur). */
  dot: string;
}

export const statutMeta: Record<StatutRendezVous, StatutMeta> = {
  NOUVEAU: {
    label: "Nouveau",
    badge: "bg-statut-nouveau-pale text-or-profond ring-1 ring-statut-nouveau/40",
    // Teinte PÂLE : demande non encore traitée (README).
    event: "bg-statut-nouveau-pale text-or-profond border border-statut-nouveau/50",
    dot: "bg-statut-nouveau-pale ring-1 ring-statut-nouveau/50",
  },
  CONFIRME: {
    label: "Confirmé",
    badge: "bg-statut-confirme-pale text-statut-confirme ring-1 ring-statut-confirme/40",
    // Couleur PLEINE : RDV confirmé (README).
    event: "bg-statut-confirme text-ivoire border border-statut-confirme",
    dot: "bg-statut-confirme",
  },
  REPLANIFIE: {
    label: "Replanifié",
    badge: "bg-statut-replanifie-pale text-statut-replanifie ring-1 ring-statut-replanifie/40",
    event: "bg-statut-replanifie text-ivoire border border-statut-replanifie",
    dot: "bg-statut-replanifie",
  },
  REALISE: {
    label: "Réalisé",
    badge: "bg-statut-realise-pale text-statut-realise ring-1 ring-statut-realise/40",
    event: "bg-statut-realise text-ivoire border border-statut-realise",
    dot: "bg-statut-realise",
  },
  ANNULE: {
    label: "Annulé",
    badge: "bg-statut-annule-pale text-statut-annule ring-1 ring-statut-annule/40",
    event: "bg-statut-annule-pale text-statut-annule border border-statut-annule/50 line-through",
    dot: "bg-statut-annule",
  },
};

/** Libellés FR des types de client (filtre liste, fiche). */
export const typeClientLabel: Record<TypeClient, string> = {
  mall: "Centre commercial",
  entreprise: "Entreprise",
  particulier: "Particulier",
};

/**
 * Verbe d'action associé à une transition de statut (boutons de la fiche RDV).
 * REPLANIFIE n'apparaît pas en bouton : la replanification passe par le créneau.
 */
export const statutActionLabel: Record<StatutRendezVous, string> = {
  NOUVEAU: "Repasser en nouveau",
  CONFIRME: "Confirmer",
  REPLANIFIE: "Replanifier",
  REALISE: "Marquer réalisé",
  ANNULE: "Annuler le RDV",
};
