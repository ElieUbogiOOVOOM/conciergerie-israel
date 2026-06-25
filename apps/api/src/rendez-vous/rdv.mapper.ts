/**
 * Mappers BDD (snake_case) → entités publiques camelCase pour les RDV et clients.
 * Fonctions pures, partagées par ClientsService et RendezVousService.
 */
import type { Client, Intervenant, Locale, Prestation, RendezVous } from "@hymea/shared";
import type { Selectable } from "kysely";

import type {
  ClientsTable,
  IntervenantsTable,
  PrestationsTable,
  RendezVousTable,
} from "../database/database.types";

export type ClientRow = Selectable<ClientsTable>;
export type RendezVousRow = Selectable<RendezVousTable>;
export type PrestationRow = Selectable<PrestationsTable>;
export type IntervenantRow = Selectable<IntervenantsTable>;

export function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom,
    email: row.email,
    telephone: row.telephone,
    locale: row.locale as Locale,
    anonymizedAt: row.anonymized_at ? row.anonymized_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toRendezVous(row: RendezVousRow): RendezVous {
  return {
    id: row.id,
    clientId: row.client_id,
    prestationId: row.prestation_id,
    intervenantId: row.intervenant_id,
    typeClient: row.type_client,
    statut: row.statut,
    debut: row.debut ? row.debut.toISOString() : null,
    fin: row.fin ? row.fin.toISOString() : null,
    adresse: row.adresse,
    message: row.message,
    surfaceM2: row.surface_m2,
    nombrePieces: row.nombre_pieces,
    locale: row.locale as Locale,
    consentement: {
      accepte: row.consentement_accepte,
      date: row.consentement_date.toISOString(),
      version: row.consentement_version,
    },
    reminderSentAt: row.reminder_sent_at ? row.reminder_sent_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toPrestation(row: PrestationRow): Prestation {
  return {
    id: row.id,
    libelle: row.libelle as Prestation["libelle"],
    description: (row.description as Prestation["description"]) ?? null,
    cible: row.cible,
    dureeMinutes: row.duree_minutes,
    actif: row.actif,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toIntervenant(row: IntervenantRow): Intervenant {
  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom,
    equipeId: row.equipe_id,
    actif: row.actif,
  };
}
