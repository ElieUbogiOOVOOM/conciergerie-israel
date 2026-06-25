import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AvailableSlots, Slot } from "@hymea/shared";

import type { Env } from "../config/env.validation";
import { KYSELY, type KyselyDB } from "../database/database.module";
import { weekdayOf, zonedWallTimeToUtc } from "./tz";

/** Statuts qui occupent un créneau (le rendant indisponible côté visiteur). */
const OCCUPYING_STATUSES = ["NOUVEAU", "CONFIRME"] as const;

interface SlotInterval {
  debut: Date;
  fin: Date;
}

/** Deux intervalles [a.debut,a.fin) et [b.debut,b.fin) se chevauchent. */
function overlaps(a: SlotInterval, b: SlotInterval): boolean {
  return a.debut < b.fin && a.fin > b.debut;
}

function minutesToHHmm(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

@Injectable()
export class SlotsService {
  constructor(
    @Inject(KYSELY) private readonly db: KyselyDB,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Génère les créneaux réellement libres pour une date (et une prestation
   * optionnelle) : règles hebdo − exceptions bloquantes − RDV pris − créneaux passés.
   */
  async getAvailableSlots(dateIso: string, prestationId?: string): Promise<AvailableSlots> {
    const tz = this.config.get("BUSINESS_TZ", { infer: true });
    const dureeMinutes = await this.resolveDuration(prestationId);

    // Bornes UTC de la journée métier (pour filtrer exceptions/RDV).
    const dayStart = zonedWallTimeToUtc(dateIso, "00:00", tz);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const regles = await this.db
      .selectFrom("regles_disponibilite")
      .select(["debut", "fin"])
      .where("jour", "=", weekdayOf(dateIso))
      .execute();

    // Génère les créneaux candidats par découpage des plages d'ouverture.
    const candidates: SlotInterval[] = [];
    for (const regle of regles) {
      const start = hhmmToMinutes(regle.debut);
      const end = hhmmToMinutes(regle.fin);
      for (let m = start; m + dureeMinutes <= end; m += dureeMinutes) {
        candidates.push({
          debut: zonedWallTimeToUtc(dateIso, minutesToHHmm(m), tz),
          fin: zonedWallTimeToUtc(dateIso, minutesToHHmm(m + dureeMinutes), tz),
        });
      }
    }

    const [blocages, occupes] = await Promise.all([
      this.loadBlockingExceptions(dayStart, dayEnd),
      this.loadOccupiedSlots(dayStart, dayEnd),
    ]);
    const now = new Date();

    const slots: Slot[] = candidates
      .filter((slot) => slot.debut > now)
      .filter((slot) => !blocages.some((b) => overlaps(slot, b)))
      .filter((slot) => !occupes.some((o) => overlaps(slot, o)))
      .sort((a, b) => a.debut.getTime() - b.debut.getTime())
      .map((slot) => ({ debut: slot.debut.toISOString(), fin: slot.fin.toISOString() }));

    return { date: dateIso, dureeMinutes, slots };
  }

  /** Durée du créneau : celle de la prestation si fournie, sinon la valeur par défaut. */
  private async resolveDuration(prestationId?: string): Promise<number> {
    if (!prestationId) {
      return this.config.get("DEFAULT_SLOT_MINUTES", { infer: true });
    }
    const prestation = await this.db
      .selectFrom("prestations")
      .select(["duree_minutes", "actif"])
      .where("id", "=", prestationId)
      .executeTakeFirst();
    if (!prestation) {
      throw new NotFoundException("Prestation introuvable.");
    }
    if (!prestation.actif) {
      throw new BadRequestException("Cette prestation est désactivée.");
    }
    return prestation.duree_minutes;
  }

  private async loadBlockingExceptions(dayStart: Date, dayEnd: Date): Promise<SlotInterval[]> {
    const rows = await this.db
      .selectFrom("exceptions_disponibilite")
      .select(["debut", "fin"])
      .where("bloque", "=", true)
      .where("debut", "<", dayEnd)
      .where("fin", ">", dayStart)
      .execute();
    return rows.map((r) => ({ debut: r.debut, fin: r.fin }));
  }

  private async loadOccupiedSlots(dayStart: Date, dayEnd: Date): Promise<SlotInterval[]> {
    const rows = await this.db
      .selectFrom("rendez_vous")
      .select(["debut", "fin"])
      .where("statut", "in", OCCUPYING_STATUSES)
      .where("debut", "is not", null)
      .where("fin", "is not", null)
      .where("debut", "<", dayEnd)
      .where("fin", ">", dayStart)
      .execute();
    return rows
      .filter((r): r is { debut: Date; fin: Date } => r.debut !== null && r.fin !== null)
      .map((r) => ({ debut: r.debut, fin: r.fin }));
  }
}
