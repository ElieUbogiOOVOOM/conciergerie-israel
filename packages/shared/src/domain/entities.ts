/**
 * Entités de domaine telles qu'échangées via l'API (camelCase, dates ISO 8601).
 * Le schéma physique (snake_case) vit côté apps/api (interface Kysely).
 */
import type { I18nText, Locale } from "../i18n.js";
import type { StatutRendezVous, TypeClient } from "./enums.js";

/** Identifiant opaque (UUID en base). */
export type Id = string;
/** Date/heure ISO 8601 (ex. "2026-06-25T09:00:00.000Z"). */
export type IsoDateTime = string;

/** Compte back-office (le hash argon2 ne quitte jamais le serveur). */
export interface Admin {
  id: Id;
  email: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Client dédupliqué par email (1 fiche / personne). */
export interface Client {
  id: Id;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  locale: Locale;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Prestation du catalogue (administrable, i18n). */
export interface Prestation {
  id: Id;
  libelle: I18nText;
  description: I18nText | null;
  cible: TypeClient;
  dureeMinutes: number;
  actif: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Intervenant terrain (assignable, sans login en v1). */
export interface Intervenant {
  id: Id;
  nom: string;
  prenom: string | null;
  equipeId: Id | null;
  actif: boolean;
}

/** Équipe d'intervenants. */
export interface Equipe {
  id: Id;
  nom: string;
}

/** Consentement RGPD horodaté (valeur + date + version du texte). */
export interface Consentement {
  accepte: boolean;
  date: IsoDateTime;
  version: string;
}

/** Rendez-vous : demande de service rattachée à un client. */
export interface RendezVous {
  id: Id;
  clientId: Id;
  prestationId: Id;
  intervenantId: Id | null;
  statut: StatutRendezVous;
  /** Créneau souhaité/planifié (peut être null pour entreprise/mall). */
  debut: IsoDateTime | null;
  fin: IsoDateTime | null;
  adresse: string | null;
  message: string | null;
  /** Langue du client mémorisée pour les emails. */
  locale: Locale;
  consentement: Consentement;
  reminderSentAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Règle d'ouverture hebdomadaire (0 = dimanche … 6 = samedi). */
export interface RegleHebdomadaire {
  id: Id;
  jour: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Heure d'ouverture "HH:mm". */
  debut: string;
  /** Heure de fermeture "HH:mm". */
  fin: string;
}

/** Exception / blocage de disponibilité sur une plage de dates. */
export interface ExceptionDisponibilite {
  id: Id;
  debut: IsoDateTime;
  fin: IsoDateTime;
  /** true = fermé/bloqué ; false = ouverture exceptionnelle. */
  bloque: boolean;
  motif: string | null;
}
