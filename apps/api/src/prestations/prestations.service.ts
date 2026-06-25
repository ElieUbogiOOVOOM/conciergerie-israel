import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { I18nText, Prestation, TypeClient } from "@hymea/shared";
import type { Selectable } from "kysely";

import { KYSELY, type KyselyDB } from "../database/database.module";
import type { PrestationsTable } from "../database/database.types";
import type { CreatePrestationDto } from "./dto/create-prestation.dto";
import type { UpdatePrestationDto } from "./dto/update-prestation.dto";

type PrestationRow = Selectable<PrestationsTable>;

/** Mappe une ligne BDD (snake_case, JSONB) vers l'entité publique camelCase. */
function toPrestation(row: PrestationRow): Prestation {
  return {
    id: row.id,
    libelle: row.libelle as I18nText,
    description: (row.description as I18nText | null) ?? null,
    cible: row.cible,
    dureeMinutes: row.duree_minutes,
    actif: row.actif,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

@Injectable()
export class PrestationsService {
  constructor(@Inject(KYSELY) private readonly db: KyselyDB) {}

  /** Crée une prestation (admin). */
  async create(dto: CreatePrestationDto): Promise<Prestation> {
    const row = await this.db
      .insertInto("prestations")
      .values({
        libelle: JSON.stringify(dto.libelle),
        description: dto.description ? JSON.stringify(dto.description) : null,
        cible: dto.cible,
        duree_minutes: dto.dureeMinutes,
        actif: dto.actif ?? true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toPrestation(row);
  }

  /** Liste complète (actives + inactives) pour le back-office. */
  async findAllAdmin(): Promise<Prestation[]> {
    const rows = await this.db
      .selectFrom("prestations")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();
    return rows.map(toPrestation);
  }

  /** Détail d'une prestation par id (404 si absente). */
  async findOne(id: string): Promise<Prestation> {
    const row = await this.db
      .selectFrom("prestations")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException("Prestation introuvable.");
    }
    return toPrestation(row);
  }

  /** Met à jour les champs fournis (admin). */
  async update(id: string, dto: UpdatePrestationDto): Promise<Prestation> {
    const update: Record<string, unknown> = { updated_at: new Date() };
    if (dto.libelle !== undefined) update.libelle = JSON.stringify(dto.libelle);
    if (dto.description !== undefined) {
      update.description = dto.description ? JSON.stringify(dto.description) : null;
    }
    if (dto.cible !== undefined) update.cible = dto.cible;
    if (dto.dureeMinutes !== undefined) update.duree_minutes = dto.dureeMinutes;
    if (dto.actif !== undefined) update.actif = dto.actif;

    const row = await this.db
      .updateTable("prestations")
      .set(update)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException("Prestation introuvable.");
    }
    return toPrestation(row);
  }

  /** Désactivation (soft-delete) : la prestation disparaît du public mais reste historisée. */
  async disable(id: string): Promise<Prestation> {
    const row = await this.db
      .updateTable("prestations")
      .set({ actif: false, updated_at: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException("Prestation introuvable.");
    }
    return toPrestation(row);
  }

  /** Prestations actives d'une cible donnée (endpoint public alimentant le funnel). */
  async findPublic(cible: TypeClient): Promise<Prestation[]> {
    const rows = await this.db
      .selectFrom("prestations")
      .selectAll()
      .where("actif", "=", true)
      .where("cible", "=", cible)
      .orderBy("created_at", "asc")
      .execute();
    return rows.map(toPrestation);
  }
}
