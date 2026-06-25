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
