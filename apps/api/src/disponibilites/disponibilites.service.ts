import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { ExceptionDisponibilite, RegleHebdomadaire } from "@hymea/shared";
import type { Selectable } from "kysely";

import { KYSELY, type KyselyDB } from "../database/database.module";
import type {
  ExceptionsDisponibiliteTable,
  ReglesDisponibiliteTable,
} from "../database/database.types";
import type { CreateExceptionDto } from "./dto/create-exception.dto";
import type { CreateRegleDto } from "./dto/create-regle.dto";

function toRegle(row: Selectable<ReglesDisponibiliteTable>): RegleHebdomadaire {
  return {
    id: row.id,
    jour: row.jour as RegleHebdomadaire["jour"],
    debut: row.debut,
    fin: row.fin,
  };
}

function toException(row: Selectable<ExceptionsDisponibiliteTable>): ExceptionDisponibilite {
  return {
    id: row.id,
    debut: row.debut.toISOString(),
    fin: row.fin.toISOString(),
    bloque: row.bloque,
    motif: row.motif,
  };
}

@Injectable()
export class DisponibilitesService {
  constructor(@Inject(KYSELY) private readonly db: KyselyDB) {}

  // --- Règles hebdomadaires ---

  async createRegle(dto: CreateRegleDto): Promise<RegleHebdomadaire> {
    if (dto.fin <= dto.debut) {
      throw new BadRequestException("L'heure de fin doit être postérieure à l'heure de début.");
    }
    const row = await this.db
      .insertInto("regles_disponibilite")
      .values({ jour: dto.jour, debut: dto.debut, fin: dto.fin })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toRegle(row);
  }

  async listRegles(): Promise<RegleHebdomadaire[]> {
    const rows = await this.db
      .selectFrom("regles_disponibilite")
      .selectAll()
      .orderBy("jour", "asc")
      .orderBy("debut", "asc")
      .execute();
    return rows.map(toRegle);
  }

  async deleteRegle(id: string): Promise<void> {
    const result = await this.db
      .deleteFrom("regles_disponibilite")
      .where("id", "=", id)
      .executeTakeFirst();
    if (result.numDeletedRows === 0n) {
      throw new NotFoundException("Règle introuvable.");
    }
  }

  // --- Exceptions / blocages ---

  async createException(dto: CreateExceptionDto): Promise<ExceptionDisponibilite> {
    const debut = new Date(dto.debut);
    const fin = new Date(dto.fin);
    if (fin <= debut) {
      throw new BadRequestException("La fin de l'exception doit être postérieure au début.");
    }
    const row = await this.db
      .insertInto("exceptions_disponibilite")
      .values({ debut, fin, bloque: dto.bloque ?? true, motif: dto.motif ?? null })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toException(row);
  }

  async listExceptions(): Promise<ExceptionDisponibilite[]> {
    const rows = await this.db
      .selectFrom("exceptions_disponibilite")
      .selectAll()
      .orderBy("debut", "asc")
      .execute();
    return rows.map(toException);
  }

  async deleteException(id: string): Promise<void> {
    const result = await this.db
      .deleteFrom("exceptions_disponibilite")
      .where("id", "=", id)
      .executeTakeFirst();
    if (result.numDeletedRows === 0n) {
      throw new NotFoundException("Exception introuvable.");
    }
  }
}
