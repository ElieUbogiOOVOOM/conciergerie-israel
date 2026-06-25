import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Client, ClientAvecHistorique, Locale, Paginated, RendezVous } from "@hymea/shared";
import { sql } from "kysely";

import { KYSELY, type KyselyDB } from "../database/database.module";
import { type ClientRow, toClient, toRendezVous } from "../rendez-vous/rdv.mapper";

/** Données d'identité d'un client lors d'une demande (issue #13). */
export interface UpsertClientInput {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  locale: Locale;
}

export interface ListClientsParams {
  page: number;
  pageSize: number;
  search?: string;
}

@Injectable()
export class ClientsService {
  constructor(@Inject(KYSELY) private readonly db: KyselyDB) {}

  /**
   * Déduplication par email (insensible à la casse) : réutilise la fiche existante
   * et rafraîchit ses coordonnées, sinon en crée une. Transaction anti-course.
   */
  async upsertByEmail(input: UpsertClientInput): Promise<ClientRow> {
    const email = input.email.trim();
    return this.db.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom("clients")
        .selectAll()
        .where(sql`lower(email)`, "=", email.toLowerCase())
        .executeTakeFirst();

      if (existing) {
        return trx
          .updateTable("clients")
          .set({
            nom: input.nom,
            prenom: input.prenom,
            telephone: input.telephone,
            locale: input.locale,
            updated_at: new Date(),
          })
          .where("id", "=", existing.id)
          .returningAll()
          .executeTakeFirstOrThrow();
      }

      return trx
        .insertInto("clients")
        .values({
          nom: input.nom,
          prenom: input.prenom,
          email,
          telephone: input.telephone,
          locale: input.locale,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    });
  }

  /** Liste paginée du back-office, recherche par nom/prénom/email. */
  async list(params: ListClientsParams): Promise<Paginated<Client>> {
    const offset = (params.page - 1) * params.pageSize;
    let base = this.db.selectFrom("clients");
    if (params.search) {
      const term = `%${params.search.trim()}%`;
      base = base.where((eb) =>
        eb.or([eb("nom", "ilike", term), eb("prenom", "ilike", term), eb("email", "ilike", term)]),
      );
    }

    const [rows, count] = await Promise.all([
      base
        .selectAll()
        .orderBy("created_at", "desc")
        .limit(params.pageSize)
        .offset(offset)
        .execute(),
      base.select((eb) => eb.fn.countAll<string>().as("total")).executeTakeFirst(),
    ]);

    return {
      items: rows.map(toClient),
      total: Number(count?.total ?? 0),
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  /** Fiche client par id (404 si absente). */
  async findOne(id: string): Promise<Client> {
    return toClient(await this.getRowOrThrow(id));
  }

  /** Fiche client + historique de ses RDV (les plus récents d'abord). */
  async findHistorique(id: string): Promise<ClientAvecHistorique> {
    const client = await this.getRowOrThrow(id);
    const rdvRows = await this.db
      .selectFrom("rendez_vous")
      .selectAll()
      .where("client_id", "=", id)
      .orderBy("created_at", "desc")
      .execute();
    const rendezVous: RendezVous[] = rdvRows.map(toRendezVous);
    return { client: toClient(client), rendezVous };
  }

  /**
   * RGPD — anonymisation : efface les PII tout en conservant l'historique RDV.
   * L'email est remplacé par un jeton unique pour préserver la contrainte d'unicité.
   */
  async anonymize(id: string): Promise<Client> {
    await this.getRowOrThrow(id);
    const row = await this.db
      .updateTable("clients")
      .set({
        nom: "Anonymisé",
        prenom: "Client",
        email: `anonymise+${id}@hymea.invalid`,
        telephone: "",
        anonymized_at: new Date(),
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
    return toClient(row);
  }

  /** RGPD — suppression définitive (cascade sur les RDV liés). */
  async remove(id: string): Promise<void> {
    const result = await this.db.deleteFrom("clients").where("id", "=", id).executeTakeFirst();
    if (Number(result.numDeletedRows) === 0) {
      throw new NotFoundException("Client introuvable.");
    }
  }

  private async getRowOrThrow(id: string): Promise<ClientRow> {
    const row = await this.db
      .selectFrom("clients")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException("Client introuvable.");
    }
    return row;
  }
}
