/** Énumérations du domaine HYMEA (valeurs partagées front ↔ back). */

/** Les 3 marchés / types de client (cf. SPEC §4). */
export const typesClient = ["mall", "entreprise", "particulier"] as const;
export type TypeClient = (typeof typesClient)[number];

/**
 * Cycle de vie d'un rendez-vous (cf. SPEC §4 / CDC 5.4).
 * NOUVEAU → CONFIRME → REPLANIFIE → REALISE → ANNULE
 */
export const statutsRendezVous = [
  "NOUVEAU",
  "CONFIRME",
  "REPLANIFIE",
  "REALISE",
  "ANNULE",
] as const;
export type StatutRendezVous = (typeof statutsRendezVous)[number];

export function isStatutRendezVous(value: string): value is StatutRendezVous {
  return (statutsRendezVous as readonly string[]).includes(value);
}

export function isTypeClient(value: string): value is TypeClient {
  return (typesClient as readonly string[]).includes(value);
}

/**
 * Transitions de statut autorisées (cf. SPEC §4 / CDC 5.4).
 * Une transition absente de cette table est refusée (409).
 * `REALISE` et `ANNULE` sont terminaux.
 */
export const transitionsStatut: Record<StatutRendezVous, readonly StatutRendezVous[]> = {
  NOUVEAU: ["CONFIRME", "ANNULE"],
  CONFIRME: ["REPLANIFIE", "REALISE", "ANNULE"],
  REPLANIFIE: ["CONFIRME", "REALISE", "ANNULE"],
  REALISE: [],
  ANNULE: [],
};

/** true si le passage `from → to` est une transition de statut valide. */
export function isTransitionValide(from: StatutRendezVous, to: StatutRendezVous): boolean {
  return transitionsStatut[from].includes(to);
}

/** Types d'emails transactionnels liés au cycle de vie d'un RDV (cf. SPEC §8). */
export const emailTypes = [
  "demande_recue",
  "confirmation",
  "replanification",
  "annulation",
  "rappel",
] as const;
export type EmailType = (typeof emailTypes)[number];
