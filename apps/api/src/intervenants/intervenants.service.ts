import { Inject, Injectable } from "@nestjs/common";
import type { Equipe, Intervenant } from "@hymea/shared";

import { KYSELY, type KyselyDB } from "../database/database.module";
import { toIntervenant } from "../rendez-vous/rdv.mapper";

/**
 * Lecture seule des intervenants/équipes — alimente le sélecteur d'attribution
 * de la fiche RDV (issue #36). Le CRUD complet relève de l'issue #40.
 */
@Injectable()
export class IntervenantsService {
  constructor(@Inject(KYSELY) private readonly db: KyselyDB) {}

  /** Intervenants actifs, triés par nom puis prénom (ordre stable du sélecteur). */
  async listActifs(): Promise<Intervenant[]> {
    const rows = await this.db
      .selectFrom("intervenants")
      .selectAll()
      .where("actif", "=", true)
      .orderBy("nom", "asc")
      .orderBy("prenom", "asc")
      .execute();
    return rows.map(toIntervenant);
  }

  /** Équipes (pour regrouper les intervenants dans l'attribution). */
  async listEquipes(): Promise<Equipe[]> {
    const rows = await this.db
      .selectFrom("equipes")
      .select(["id", "nom"])
      .orderBy("nom", "asc")
      .execute();
    return rows.map((row) => ({ id: row.id, nom: row.nom }));
  }
}
