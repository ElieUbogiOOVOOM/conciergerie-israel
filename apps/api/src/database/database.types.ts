/**
 * Interface Kysely du schéma physique (snake_case).
 * Maintenue en phase avec les migrations (apps/api/migrations/).
 * Les types « publics » du domaine (camelCase) vivent dans @hymea/shared.
 */
import type { StatutRendezVous, TypeClient } from "@hymea/shared";
import type { ColumnType, Generated, JSONColumnType } from "kysely";

/** timestamptz : lu en Date, inséré/maj via Date|string (défauts SQL gérés en base). */
export type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

/** Contenu i18n stocké en JSONB ({ fr, en, he }). */
export type I18nColumn = JSONColumnType<Record<string, string>>;

export interface AdminsTable {
  id: Generated<string>;
  email: string;
  password_hash: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

/** Refresh tokens persistés (hash argon2) pour rotation + révocation. */
export interface RefreshTokensTable {
  id: Generated<string>;
  admin_id: string;
  /** Identifiant public indexé du token (`<selector>.<secret>`), pour un lookup O(1). */
  selector: string;
  token_hash: string;
  expires_at: Timestamp;
  revoked_at: Timestamp | null;
  created_at: Generated<Date>;
}

export interface ClientsTable {
  id: Generated<string>;
  nom: string;
  prenom: string;
  /** Dédup : 1 fiche par email (index unique). */
  email: string;
  telephone: string;
  locale: string;
  /** RGPD : horodatage d'anonymisation (null = fiche active). */
  anonymized_at: Timestamp | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface PrestationsTable {
  id: Generated<string>;
  libelle: I18nColumn;
  description: ColumnType<Record<string, string> | null, string | null, string | null>;
  cible: TypeClient;
  duree_minutes: number;
  actif: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface EquipesTable {
  id: Generated<string>;
  nom: string;
  created_at: Generated<Date>;
}

export interface IntervenantsTable {
  id: Generated<string>;
  nom: string;
  prenom: string | null;
  equipe_id: string | null;
  actif: Generated<boolean>;
  created_at: Generated<Date>;
}

/** Règle d'ouverture hebdomadaire (jour 0=dimanche … 6=samedi, heures "HH:mm"). */
export interface ReglesDisponibiliteTable {
  id: Generated<string>;
  jour: number;
  debut: string;
  fin: string;
  created_at: Generated<Date>;
}

/** Exception / blocage sur une plage de dates. */
export interface ExceptionsDisponibiliteTable {
  id: Generated<string>;
  debut: Timestamp;
  fin: Timestamp;
  bloque: Generated<boolean>;
  motif: string | null;
  created_at: Generated<Date>;
}

export interface RendezVousTable {
  id: Generated<string>;
  client_id: string;
  prestation_id: string;
  intervenant_id: string | null;
  type_client: TypeClient;
  statut: Generated<StatutRendezVous>;
  debut: Timestamp | null;
  fin: Timestamp | null;
  adresse: string | null;
  message: string | null;
  surface_m2: number | null;
  nombre_pieces: number | null;
  locale: string;
  consentement_accepte: boolean;
  consentement_date: Timestamp;
  consentement_version: string;
  reminder_sent_at: Timestamp | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

/** Jeton d'abonnement au flux iCal lecture seule (issue #20). */
export interface CalendarFeedTokensTable {
  id: Generated<string>;
  label: string;
  /** Hash SHA-256 du jeton porteur (le jeton brut n'est jamais stocké). */
  token_hash: string;
  /** Expiration optionnelle (null = sans expiration). */
  expires_at: Timestamp | null;
  revoked_at: Timestamp | null;
  created_at: Generated<Date>;
}

export interface Database {
  admins: AdminsTable;
  calendar_feed_tokens: CalendarFeedTokensTable;
  refresh_tokens: RefreshTokensTable;
  clients: ClientsTable;
  prestations: PrestationsTable;
  equipes: EquipesTable;
  intervenants: IntervenantsTable;
  regles_disponibilite: ReglesDisponibiliteTable;
  exceptions_disponibilite: ExceptionsDisponibiliteTable;
  rendez_vous: RendezVousTable;
}
