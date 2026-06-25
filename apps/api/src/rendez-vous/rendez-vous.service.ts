import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  EmailType,
  Locale,
  Paginated,
  RendezVous,
  RendezVousDetail,
  StatutRendezVous,
} from "@hymea/shared";
import { isTransitionValide } from "@hymea/shared";

import type { Env } from "../config/env.validation";
import { ClientsService } from "../clients/clients.service";
import { KYSELY, type KyselyDB } from "../database/database.module";
import { MailService } from "../mail/mail.service";
import type { CreateRendezVousDto } from "./dto/create-rendez-vous.dto";
import type { ListRendezVousQuery } from "./dto/list-rendez-vous.query";
import {
  type ClientRow,
  type PrestationRow,
  type RendezVousRow,
  toClient,
  toIntervenant,
  toPrestation,
  toRendezVous,
} from "./rdv.mapper";
import { TurnstileService } from "./turnstile.service";

/** Statut → email de cycle de vie déclenché vers le client (null = aucun). */
const STATUT_EMAIL: Partial<Record<StatutRendezVous, EmailType>> = {
  CONFIRME: "confirmation",
  REPLANIFIE: "replanification",
  ANNULE: "annulation",
};

@Injectable()
export class RendezVousService {
  constructor(
    @Inject(KYSELY) private readonly db: KyselyDB,
    private readonly config: ConfigService<Env, true>,
    private readonly clients: ClientsService,
    private readonly turnstile: TurnstileService,
    private readonly mail: MailService,
  ) {}

  // ─────────────────────────────── Public (issue #13) ───────────────────────

  /** Crée une demande de RDV (statut NOUVEAU) depuis le formulaire public. */
  async createPublic(dto: CreateRendezVousDto, ip?: string): Promise<RendezVous> {
    // 1. Honeypot : un champ leurre rempli = bot.
    if (dto.website && dto.website.trim() !== "") {
      throw new BadRequestException("Requête rejetée.");
    }

    // 2. Anti-spam Turnstile (désactivé si non configuré).
    if (!(await this.turnstile.verify(dto.turnstileToken, ip))) {
      throw new BadRequestException("Vérification anti-spam échouée.");
    }

    // 3. Consentement RGPD explicite obligatoire.
    if (dto.consentement !== true) {
      throw new BadRequestException("Le consentement RGPD est requis.");
    }

    // 4. Prestation valide, active et cohérente avec le type de client.
    const prestation = await this.db
      .selectFrom("prestations")
      .selectAll()
      .where("id", "=", dto.prestationId)
      .executeTakeFirst();
    if (!prestation) {
      throw new NotFoundException("Prestation introuvable.");
    }
    if (!prestation.actif) {
      throw new BadRequestException("Cette prestation est désactivée.");
    }
    if (prestation.cible !== dto.typeClient) {
      throw new BadRequestException("La prestation ne correspond pas au type de client.");
    }

    // 5. Créneau & adresse obligatoires pour un particulier (réservation ferme).
    if (dto.typeClient === "particulier") {
      if (!dto.debut) {
        throw new BadRequestException("Le créneau est obligatoire pour un particulier.");
      }
      if (!dto.adresse) {
        throw new BadRequestException("L'adresse est obligatoire pour un particulier.");
      }
    }

    const locale: Locale = dto.locale ?? "fr";
    const { debut, fin } = this.computeInterval(dto.debut, prestation.duree_minutes);

    // 6. Upsert client (dédup email) puis création du RDV.
    const client = await this.clients.upsertByEmail({
      nom: dto.nom,
      prenom: dto.prenom,
      email: dto.email,
      telephone: dto.telephone,
      locale,
    });

    const row = await this.db
      .insertInto("rendez_vous")
      .values({
        client_id: client.id,
        prestation_id: prestation.id,
        type_client: dto.typeClient,
        statut: "NOUVEAU",
        debut,
        fin,
        adresse: dto.adresse ?? null,
        message: dto.message ?? null,
        surface_m2: dto.surfaceM2 ?? null,
        nombre_pieces: dto.nombrePieces ?? null,
        locale,
        consentement_accepte: true,
        consentement_date: new Date(),
        consentement_version: this.config.get("CONSENT_VERSION", { infer: true }),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // 7. Emails « demande reçue » (client) + notification HYMEA.
    await this.dispatchLifecycle("demande_recue", row, client, prestation);

    return toRendezVous(row);
  }

  // ─────────────────────────────── Admin (issue #15) ────────────────────────

  /** Liste paginée + filtres + recherche (back-office). */
  async list(query: ListRendezVousQuery): Promise<Paginated<RendezVousDetail>> {
    const offset = (query.page - 1) * query.pageSize;

    let base = this.db
      .selectFrom("rendez_vous")
      .innerJoin("clients", "clients.id", "rendez_vous.client_id");

    if (query.statut) base = base.where("rendez_vous.statut", "=", query.statut);
    if (query.typeClient) base = base.where("rendez_vous.type_client", "=", query.typeClient);
    if (query.prestationId) base = base.where("rendez_vous.prestation_id", "=", query.prestationId);
    if (query.dateFrom) base = base.where("rendez_vous.debut", ">=", new Date(query.dateFrom));
    if (query.dateTo) base = base.where("rendez_vous.debut", "<=", new Date(query.dateTo));
    if (query.search) {
      const term = `%${query.search.trim()}%`;
      base = base.where((eb) =>
        eb.or([
          eb("clients.nom", "ilike", term),
          eb("clients.prenom", "ilike", term),
          eb("clients.email", "ilike", term),
        ]),
      );
    }

    const [rows, count] = await Promise.all([
      base
        .selectAll("rendez_vous")
        .orderBy("rendez_vous.created_at", "desc")
        .limit(query.pageSize)
        .offset(offset)
        .execute(),
      base.select((eb) => eb.fn.countAll<string>().as("total")).executeTakeFirst(),
    ]);

    const items = await this.assembleDetails(rows);
    return {
      items,
      total: Number(count?.total ?? 0),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Détail d'un RDV (client + prestation + intervenant). */
  async findOne(id: string): Promise<RendezVousDetail> {
    const row = await this.getRowOrThrow(id);
    const [detail] = await this.assembleDetails([row]);
    if (!detail) {
      throw new NotFoundException("Rendez-vous introuvable.");
    }
    return detail;
  }

  /** Change le statut en respectant les transitions autorisées (sinon 409). */
  async changeStatut(id: string, statut: StatutRendezVous): Promise<RendezVousDetail> {
    const row = await this.getRowOrThrow(id);
    if (row.statut === statut) {
      throw new ConflictException("Le RDV est déjà dans ce statut.");
    }
    if (!isTransitionValide(row.statut, statut)) {
      throw new ConflictException(`Transition ${row.statut} → ${statut} interdite.`);
    }

    const updated = await this.db
      .updateTable("rendez_vous")
      .set({ statut, updated_at: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    await this.dispatchStatutEmail(updated);
    return this.findOne(updated.id);
  }

  /** Attribue (ou retire) un intervenant. */
  async assignIntervenant(id: string, intervenantId: string | null): Promise<RendezVousDetail> {
    await this.getRowOrThrow(id);
    if (intervenantId) {
      const intervenant = await this.db
        .selectFrom("intervenants")
        .select("id")
        .where("id", "=", intervenantId)
        .executeTakeFirst();
      if (!intervenant) {
        throw new NotFoundException("Intervenant introuvable.");
      }
    }
    await this.db
      .updateTable("rendez_vous")
      .set({ intervenant_id: intervenantId, updated_at: new Date() })
      .where("id", "=", id)
      .execute();
    return this.findOne(id);
  }

  /** Replanifie le RDV (nouveau créneau) → statut REPLANIFIE + email. */
  async reschedule(id: string, debutIso: string): Promise<RendezVousDetail> {
    const row = await this.getRowOrThrow(id);
    if (row.statut === "ANNULE" || row.statut === "REALISE") {
      throw new ConflictException(`Un RDV ${row.statut} ne peut pas être replanifié.`);
    }
    const prestation = await this.db
      .selectFrom("prestations")
      .selectAll()
      .where("id", "=", row.prestation_id)
      .executeTakeFirstOrThrow();
    const { debut, fin } = this.computeInterval(debutIso, prestation.duree_minutes);

    const updated = await this.db
      .updateTable("rendez_vous")
      .set({ debut, fin, statut: "REPLANIFIE", updated_at: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    const client = await this.db
      .selectFrom("clients")
      .selectAll()
      .where("id", "=", updated.client_id)
      .executeTakeFirstOrThrow();
    await this.dispatchLifecycle("replanification", updated, client, prestation);
    return this.findOne(updated.id);
  }

  // ─────────────────────────────── Helpers ──────────────────────────────────

  /** Calcule [debut, fin) à partir d'un ISO et d'une durée (null si pas de créneau). */
  private computeInterval(
    debutIso: string | undefined,
    dureeMinutes: number,
  ): { debut: Date | null; fin: Date | null } {
    if (!debutIso) {
      return { debut: null, fin: null };
    }
    const debut = new Date(debutIso);
    const fin = new Date(debut.getTime() + dureeMinutes * 60 * 1000);
    return { debut, fin };
  }

  private async getRowOrThrow(id: string): Promise<RendezVousRow> {
    const row = await this.db
      .selectFrom("rendez_vous")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException("Rendez-vous introuvable.");
    }
    return row;
  }

  /** Charge en lot clients/prestations/intervenants et assemble les détails. */
  private async assembleDetails(rows: RendezVousRow[]): Promise<RendezVousDetail[]> {
    if (rows.length === 0) {
      return [];
    }
    const clientIds = [...new Set(rows.map((r) => r.client_id))];
    const prestationIds = [...new Set(rows.map((r) => r.prestation_id))];
    const intervenantIds = [
      ...new Set(rows.map((r) => r.intervenant_id).filter(Boolean)),
    ] as string[];

    const [clients, prestations, intervenants] = await Promise.all([
      this.db.selectFrom("clients").selectAll().where("id", "in", clientIds).execute(),
      this.db.selectFrom("prestations").selectAll().where("id", "in", prestationIds).execute(),
      intervenantIds.length
        ? this.db.selectFrom("intervenants").selectAll().where("id", "in", intervenantIds).execute()
        : Promise.resolve([]),
    ]);

    const clientMap = new Map(clients.map((c) => [c.id, c]));
    const prestationMap = new Map(prestations.map((p) => [p.id, p]));
    const intervenantMap = new Map(intervenants.map((i) => [i.id, i]));

    return rows.map((row) => {
      const client = clientMap.get(row.client_id);
      const prestation = prestationMap.get(row.prestation_id);
      const intervenant = row.intervenant_id ? intervenantMap.get(row.intervenant_id) : undefined;
      return {
        ...toRendezVous(row),
        client: toClient(client!),
        prestation: toPrestation(prestation!),
        intervenant: intervenant ? toIntervenant(intervenant) : null,
      };
    });
  }

  /** Déclenche l'email correspondant à un changement de statut (si applicable). */
  private async dispatchStatutEmail(row: RendezVousRow): Promise<void> {
    const type = STATUT_EMAIL[row.statut];
    if (!type) {
      return;
    }
    const [client, prestation] = await Promise.all([
      this.db.selectFrom("clients").selectAll().where("id", "=", row.client_id).executeTakeFirst(),
      this.db
        .selectFrom("prestations")
        .selectAll()
        .where("id", "=", row.prestation_id)
        .executeTakeFirst(),
    ]);
    if (client && prestation) {
      await this.dispatchLifecycle(type, row, client, prestation);
    }
  }

  /** Construit le payload localisé et déclenche les emails (client + HYMEA). */
  private async dispatchLifecycle(
    type: EmailType,
    row: RendezVousRow,
    client: ClientRow,
    prestation: PrestationRow,
  ): Promise<void> {
    const locale = (client.locale as Locale) ?? "fr";
    const libelle = prestation.libelle as Record<string, string>;
    await this.mail.sendRdvLifecycle({
      type,
      clientNom: client.nom,
      clientPrenom: client.prenom,
      clientEmail: client.email,
      clientTelephone: client.telephone,
      typeClient: row.type_client,
      locale,
      prestationLibelle: libelle[locale] ?? libelle.fr ?? Object.values(libelle)[0] ?? "",
      debutIso: row.debut ? row.debut.toISOString() : null,
      adresse: row.adresse,
    });
  }
}
