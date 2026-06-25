import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import type { Locale } from "@hymea/shared";

import type { Env } from "../config/env.validation";
import { KYSELY, type KyselyDB } from "../database/database.module";
import { MailService } from "../mail/mail.service";

/**
 * Rappels automatiques avant un RDV (issue #17).
 *
 * Un cron horaire envoie un rappel unique aux RDV confirmés/replanifiés dont le
 * créneau tombe dans la fenêtre [maintenant ; maintenant + REMINDER_LEAD_HOURS].
 * La colonne `reminder_sent_at` garantit l'unicité (anti-doublon).
 */
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @Inject(KYSELY) private readonly db: KyselyDB,
    private readonly config: ConfigService<Env, true>,
    private readonly mail: MailService,
  ) {}

  /** Cron horaire (désactivable via REMINDERS_ENABLED). */
  @Cron(CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    if (!this.config.get("REMINDERS_ENABLED", { infer: true })) {
      return;
    }
    const sent = await this.sendDueReminders();
    if (sent > 0) {
      this.logger.log(`${sent} rappel(s) envoyé(s).`);
    }
  }

  /**
   * Envoie les rappels dus à l'instant `now` et marque les RDV traités.
   * Méthode pure (paramétrable) pour des tests déterministes.
   * @returns nombre de rappels envoyés.
   */
  async sendDueReminders(now: Date = new Date()): Promise<number> {
    const leadHours = this.config.get("REMINDER_LEAD_HOURS", { infer: true });
    const horizon = new Date(now.getTime() + leadHours * 60 * 60 * 1000);

    const rows = await this.db
      .selectFrom("rendez_vous")
      .innerJoin("clients", "clients.id", "rendez_vous.client_id")
      .innerJoin("prestations", "prestations.id", "rendez_vous.prestation_id")
      .where("rendez_vous.statut", "in", ["CONFIRME", "REPLANIFIE"])
      .where("rendez_vous.reminder_sent_at", "is", null)
      .where("rendez_vous.debut", "is not", null)
      .where("rendez_vous.debut", ">=", now)
      .where("rendez_vous.debut", "<=", horizon)
      .select([
        "rendez_vous.id as id",
        "rendez_vous.type_client as type_client",
        "rendez_vous.debut as debut",
        "rendez_vous.adresse as adresse",
        "clients.nom as client_nom",
        "clients.prenom as client_prenom",
        "clients.email as client_email",
        "clients.telephone as client_telephone",
        "clients.locale as client_locale",
        "prestations.libelle as prestation_libelle",
      ])
      .execute();

    let count = 0;
    for (const row of rows) {
      const locale = (row.client_locale as Locale) ?? "fr";
      const libelle = row.prestation_libelle as Record<string, string>;
      await this.mail.sendReminder({
        type: "rappel",
        clientNom: row.client_nom,
        clientPrenom: row.client_prenom,
        clientEmail: row.client_email,
        clientTelephone: row.client_telephone,
        typeClient: row.type_client,
        locale,
        prestationLibelle: libelle[locale] ?? libelle.fr ?? Object.values(libelle)[0] ?? "",
        debutIso: row.debut ? row.debut.toISOString() : null,
        adresse: row.adresse,
      });
      await this.db
        .updateTable("rendez_vous")
        .set({ reminder_sent_at: now })
        .where("id", "=", row.id)
        .execute();
      count += 1;
    }
    return count;
  }
}
