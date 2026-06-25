import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { sql } from "kysely";

import { ClientsService } from "../clients/clients.service";
import type { Env } from "../config/env.validation";
import { KYSELY, type KyselyDB } from "../database/database.module";

/**
 * Rétention RGPD (issue #18) : purge/anonymisation automatique des données
 * dont le dernier rendez-vous (ou, à défaut, la création de la fiche) remonte à
 * plus de RGPD_RETENTION_MONTHS mois. L'anonymisation préserve l'historique
 * agrégé tout en effaçant les PII (réutilise ClientsService.anonymize).
 *
 * La suppression/anonymisation « à la demande » est exposée côté back-office
 * par ClientsController (issue #14) — ce service ne gère que l'automatisation.
 */
@Injectable()
export class RgpdService {
  private readonly logger = new Logger(RgpdService.name);

  constructor(
    @Inject(KYSELY) private readonly db: KyselyDB,
    private readonly config: ConfigService<Env, true>,
    private readonly clients: ClientsService,
  ) {}

  /** Cron quotidien (désactivable via RGPD_PURGE_ENABLED). */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron(): Promise<void> {
    if (!this.config.get("RGPD_PURGE_ENABLED", { infer: true })) {
      return;
    }
    const purged = await this.purgeExpiredClients();
    if (purged > 0) {
      this.logger.log(`${purged} fiche(s) client anonymisée(s) (rétention RGPD).`);
    }
  }

  /**
   * Anonymise les clients expirés à l'instant `now`.
   * Date de référence d'un client = activité la plus récente parmi ses RDV
   * (max de `debut` et `created_at`), ou `clients.created_at` s'il n'a aucun RDV.
   * @returns nombre de fiches anonymisées.
   */
  async purgeExpiredClients(now: Date = new Date()): Promise<number> {
    const months = this.config.get("RGPD_RETENTION_MONTHS", { infer: true });
    const threshold = new Date(now);
    threshold.setMonth(threshold.getMonth() - months);

    const expired = await this.db
      .selectFrom("clients")
      .leftJoin("rendez_vous", "rendez_vous.client_id", "clients.id")
      .where("clients.anonymized_at", "is", null)
      .groupBy("clients.id")
      .having(
        sql<Date>`greatest(
          max(coalesce(rendez_vous.debut, rendez_vous.created_at)),
          clients.created_at
        )`,
        "<",
        threshold,
      )
      .select("clients.id as id")
      .execute();

    for (const { id } of expired) {
      await this.clients.anonymize(id);
    }
    return expired.length;
  }
}
