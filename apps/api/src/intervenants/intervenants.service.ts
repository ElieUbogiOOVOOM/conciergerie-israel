import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Equipe, Intervenant } from "@hymea/shared";
import type { Selectable } from "kysely";

import { KYSELY, type KyselyDB } from "../database/database.module";
import type { EquipesTable, IntervenantsTable } from "../database/database.types";
import type { CreateEquipeDto } from "./dto/create-equipe.dto";
import type { CreateIntervenantDto } from "./dto/create-intervenant.dto";
import type { UpdateEquipeDto } from "./dto/update-equipe.dto";
import type { UpdateIntervenantDto } from "./dto/update-intervenant.dto";

type EquipeRow = Selectable<EquipesTable>;
type IntervenantRow = Selectable<IntervenantsTable>;

/** Mappe une ligne BDD (snake_case) vers l'entité publique. */
function toEquipe(row: EquipeRow): Equipe {
  return { id: row.id, nom: row.nom };
}

function toIntervenant(row: IntervenantRow): Intervenant {
  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom ?? null,
    equipeId: row.equipe_id ?? null,
    actif: row.actif,
  };
}

@Injectable()
export class IntervenantsService {
  constructor(@Inject(KYSELY) private readonly db: KyselyDB) {}

  // --- Équipes ---

  /** Liste des équipes, ordonnées par nom. */
  async findAllEquipes(): Promise<Equipe[]> {
    const rows = await this.db.selectFrom("equipes").selectAll().orderBy("nom", "asc").execute();
    return rows.map(toEquipe);
  }

  /** Crée une équipe. */
  async createEquipe(dto: CreateEquipeDto): Promise<Equipe> {
    const row = await this.db
      .insertInto("equipes")
      .values({ nom: dto.nom })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toEquipe(row);
  }

  /** Renomme une équipe (404 si absente). */
  async updateEquipe(id: string, dto: UpdateEquipeDto): Promise<Equipe> {
    if (dto.nom === undefined) {
      return this.findOneEquipe(id);
    }
    const row = await this.db
      .updateTable("equipes")
      .set({ nom: dto.nom })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException("Équipe introuvable.");
    }
    return toEquipe(row);
  }

  /** Détail d'une équipe (404 si absente). */
  async findOneEquipe(id: string): Promise<Equipe> {
    const row = await this.db
      .selectFrom("equipes")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException("Équipe introuvable.");
    }
    return toEquipe(row);
  }

  /**
   * Supprime une équipe. Les intervenants rattachés sont détachés
   * automatiquement (FK `ON DELETE SET NULL`).
   */
  async deleteEquipe(id: string): Promise<void> {
    const result = await this.db.deleteFrom("equipes").where("id", "=", id).executeTakeFirst();
    if (result.numDeletedRows === 0n) {
      throw new NotFoundException("Équipe introuvable.");
    }
  }

  // --- Intervenants ---

  /** Liste des intervenants (filtre `actif` optionnel), ordonnés par nom. */
  async findAllIntervenants(actif?: boolean): Promise<Intervenant[]> {
    let query = this.db.selectFrom("intervenants").selectAll();
    if (actif !== undefined) {
      query = query.where("actif", "=", actif);
    }
    const rows = await query.orderBy("nom", "asc").orderBy("prenom", "asc").execute();
    return rows.map(toIntervenant);
  }

  /** Détail d'un intervenant (404 si absent). */
  async findOneIntervenant(id: string): Promise<Intervenant> {
    const row = await this.db
      .selectFrom("intervenants")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException("Intervenant introuvable.");
    }
    return toIntervenant(row);
  }

  /** Crée un intervenant (admin). */
  async createIntervenant(dto: CreateIntervenantDto): Promise<Intervenant> {
    await this.assertEquipeExists(dto.equipeId);
    const row = await this.db
      .insertInto("intervenants")
      .values({
        nom: dto.nom,
        prenom: dto.prenom ?? null,
        equipe_id: dto.equipeId ?? null,
        actif: dto.actif ?? true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toIntervenant(row);
  }

  /** Met à jour les champs fournis (admin). */
  async updateIntervenant(id: string, dto: UpdateIntervenantDto): Promise<Intervenant> {
    if (dto.equipeId !== undefined) {
      await this.assertEquipeExists(dto.equipeId);
    }
    const update: Record<string, unknown> = {};
    if (dto.nom !== undefined) update.nom = dto.nom;
    if (dto.prenom !== undefined) update.prenom = dto.prenom ?? null;
    if (dto.equipeId !== undefined) update.equipe_id = dto.equipeId ?? null;
    if (dto.actif !== undefined) update.actif = dto.actif;

    if (Object.keys(update).length === 0) {
      return this.findOneIntervenant(id);
    }

    const row = await this.db
      .updateTable("intervenants")
      .set(update)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException("Intervenant introuvable.");
    }
    return toIntervenant(row);
  }

  /** Désactivation (soft-delete) : l'intervenant n'est plus assignable mais reste historisé. */
  async disableIntervenant(id: string): Promise<Intervenant> {
    const row = await this.db
      .updateTable("intervenants")
      .set({ actif: false })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException("Intervenant introuvable.");
    }
    return toIntervenant(row);
  }

  /** Vérifie qu'une équipe existe quand un rattachement est demandé. */
  private async assertEquipeExists(equipeId?: string | null): Promise<void> {
    if (!equipeId) return;
    const row = await this.db
      .selectFrom("equipes")
      .select("id")
      .where("id", "=", equipeId)
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException("Équipe introuvable.");
    }
  }
}
