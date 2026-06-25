import { type INestApplication } from "@nestjs/common";

import type { KyselyDB } from "../src/database/database.module";
import { RgpdService } from "../src/rgpd/rgpd.service";
import { createTestApp, seedClient, seedPrestation, seedRendezVous, truncateAll } from "./helpers";

/** Rétention par défaut = RGPD_RETENTION_MONTHS = 12 mois. */
const NOW = new Date("2026-07-10T08:00:00.000Z");
const OLD = new Date("2024-01-01T08:00:00.000Z"); // > 12 mois
const RECENT = new Date("2026-06-01T08:00:00.000Z"); // < 12 mois

describe("RGPD purge cron (e2e, #18)", () => {
  let app: INestApplication;
  let db: KyselyDB;
  let rgpd: RgpdService;
  let prestationId: string;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
    rgpd = app.get(RgpdService);
  });

  beforeEach(async () => {
    await truncateAll(db);
    prestationId = await seedPrestation(db);
  });

  afterAll(async () => {
    await app.close();
  });

  async function getClient(id: string) {
    return db.selectFrom("clients").selectAll().where("id", "=", id).executeTakeFirstOrThrow();
  }

  describe("purgeExpiredClients — anonymisation", () => {
    it("anonymise un client dont le dernier RDV remonte à plus de 12 mois", async () => {
      const id = await seedClient(db, { email: "old@example.com", createdAt: OLD });
      await seedRendezVous(db, {
        clientId: id,
        prestationId,
        statut: "REALISE",
        debut: OLD,
        fin: OLD,
        createdAt: OLD,
      });

      expect(await rgpd.purgeExpiredClients(NOW)).toBe(1);
      const c = await getClient(id);
      expect(c.nom).toBe("Anonymisé");
      expect(c.email).not.toBe("old@example.com");
      expect(c.anonymized_at).not.toBeNull();
      // L'historique RDV est conservé.
      const rdvs = await db
        .selectFrom("rendez_vous")
        .selectAll()
        .where("client_id", "=", id)
        .execute();
      expect(rdvs).toHaveLength(1);
    });

    it("anonymise un client sans RDV mais créé il y a plus de 12 mois (basé sur created_at)", async () => {
      const id = await seedClient(db, { email: "norel@example.com", createdAt: OLD });
      expect(await rgpd.purgeExpiredClients(NOW)).toBe(1);
      expect((await getClient(id)).anonymized_at).not.toBeNull();
    });

    it("retient le RDV le plus récent : un RDV récent protège un ancien", async () => {
      const id = await seedClient(db, { email: "mixed@example.com", createdAt: OLD });
      await seedRendezVous(db, {
        clientId: id,
        prestationId,
        debut: OLD,
        fin: OLD,
        createdAt: OLD,
      });
      await seedRendezVous(db, {
        clientId: id,
        prestationId,
        debut: RECENT,
        fin: RECENT,
        createdAt: RECENT,
      });
      expect(await rgpd.purgeExpiredClients(NOW)).toBe(0);
      expect((await getClient(id)).anonymized_at).toBeNull();
    });
  });

  describe("purgeExpiredClients — hors périmètre", () => {
    it("épargne un client avec un RDV récent", async () => {
      const id = await seedClient(db, { email: "recent@example.com", createdAt: RECENT });
      await seedRendezVous(db, {
        clientId: id,
        prestationId,
        debut: RECENT,
        fin: RECENT,
        createdAt: RECENT,
      });
      expect(await rgpd.purgeExpiredClients(NOW)).toBe(0);
      expect((await getClient(id)).nom).toBe("Cohen");
    });

    it("épargne un client récent sans RDV", async () => {
      const id = await seedClient(db, { email: "young@example.com", createdAt: RECENT });
      expect(await rgpd.purgeExpiredClients(NOW)).toBe(0);
      expect((await getClient(id)).anonymized_at).toBeNull();
    });

    it("ignore un client déjà anonymisé (idempotence)", async () => {
      await seedClient(db, {
        email: "done@example.com",
        createdAt: OLD,
        anonymizedAt: OLD,
      });
      expect(await rgpd.purgeExpiredClients(NOW)).toBe(0);
    });

    it("ne touche pas un client exactement à la limite (juste sous 12 mois)", async () => {
      const justUnder = new Date(NOW);
      justUnder.setMonth(justUnder.getMonth() - 12);
      justUnder.setDate(justUnder.getDate() + 1); // 1 jour avant le seuil
      const id = await seedClient(db, { email: "limit@example.com", createdAt: justUnder });
      expect(await rgpd.purgeExpiredClients(NOW)).toBe(0);
      expect((await getClient(id)).anonymized_at).toBeNull();
    });
  });

  describe("purgeExpiredClients — lots", () => {
    it("anonymise plusieurs clients expirés et épargne les actifs", async () => {
      await seedClient(db, { email: "o1@example.com", createdAt: OLD });
      await seedClient(db, { email: "o2@example.com", createdAt: OLD });
      await seedClient(db, { email: "active@example.com", createdAt: RECENT });
      expect(await rgpd.purgeExpiredClients(NOW)).toBe(2);
    });

    it("ne fait rien sur une base vide", async () => {
      expect(await rgpd.purgeExpiredClients(NOW)).toBe(0);
    });
  });
});
