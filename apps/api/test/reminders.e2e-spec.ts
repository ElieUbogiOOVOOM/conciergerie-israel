import { type INestApplication } from "@nestjs/common";

import type { KyselyDB } from "../src/database/database.module";
import { RemindersService } from "../src/reminders/reminders.service";
import {
  clearOutbox,
  createTestApp,
  outbox,
  seedClient,
  seedPrestation,
  seedRendezVous,
  truncateAll,
} from "./helpers";

/** Fenêtre par défaut = REMINDER_LEAD_HOURS = 24h. */
const NOW = new Date("2026-07-10T08:00:00.000Z");
const IN_12H = new Date("2026-07-10T20:00:00.000Z");
const IN_36H = new Date("2026-07-11T20:00:00.000Z");
const PAST = new Date("2026-07-09T20:00:00.000Z");

describe("Reminders cron (e2e, #17)", () => {
  let app: INestApplication;
  let db: KyselyDB;
  let reminders: RemindersService;
  let prestationId: string;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
    reminders = app.get(RemindersService);
  });

  beforeEach(async () => {
    await truncateAll(db);
    clearOutbox(app);
    prestationId = await seedPrestation(db, { dureeMinutes: 90 });
  });

  afterAll(async () => {
    await app.close();
  });

  type RdvOverrides = Partial<
    Omit<Parameters<typeof seedRendezVous>[1], "clientId" | "prestationId">
  >;
  async function rdv(overrides: RdvOverrides = {}): Promise<string> {
    const clientId = await seedClient(db, { email: `c${Math.random()}@example.com` });
    return seedRendezVous(db, {
      clientId,
      prestationId,
      statut: "CONFIRME",
      debut: IN_12H,
      fin: new Date(IN_12H.getTime() + 90 * 60 * 1000),
      ...overrides,
    });
  }

  describe("sendDueReminders — happy path", () => {
    it("envoie 1 rappel pour un RDV CONFIRME dans la fenêtre + marque reminder_sent_at", async () => {
      const id = await rdv({ statut: "CONFIRME" });
      const sent = await reminders.sendDueReminders(NOW);
      expect(sent).toBe(1);

      const client = outbox(app).find((m) => m.audience === "client");
      expect(client?.type).toBe("rappel");
      expect(outbox(app).some((m) => m.audience === "hymea")).toBe(false); // pas de notif interne

      const row = await db
        .selectFrom("rendez_vous")
        .select("reminder_sent_at")
        .where("id", "=", id)
        .executeTakeFirstOrThrow();
      expect(row.reminder_sent_at).toEqual(NOW);
    });

    it("envoie aussi un rappel pour un RDV REPLANIFIE dans la fenêtre", async () => {
      await rdv({ statut: "REPLANIFIE" });
      expect(await reminders.sendDueReminders(NOW)).toBe(1);
      expect(outbox(app).find((m) => m.audience === "client")?.type).toBe("rappel");
    });

    it("envoie le rappel dans la langue du client (he → RTL)", async () => {
      const clientId = await seedClient(db, { email: "he@example.com", locale: "he" });
      await seedRendezVous(db, {
        clientId,
        prestationId,
        statut: "CONFIRME",
        debut: IN_12H,
        fin: IN_12H,
        locale: "he",
      });
      await reminders.sendDueReminders(NOW);
      const client = outbox(app).find((m) => m.audience === "client");
      expect(client?.locale).toBe("he");
      expect(client?.html).toContain('dir="rtl"');
    });

    it("traite plusieurs RDV dus en un seul passage", async () => {
      await rdv();
      await rdv();
      await rdv();
      expect(await reminders.sendDueReminders(NOW)).toBe(3);
    });
  });

  describe("sendDueReminders — hors périmètre", () => {
    it("ignore un RDV hors fenêtre (au-delà de 24h)", async () => {
      await rdv({ debut: IN_36H, fin: IN_36H });
      expect(await reminders.sendDueReminders(NOW)).toBe(0);
      expect(outbox(app)).toHaveLength(0);
    });

    it("ignore un RDV déjà passé", async () => {
      await rdv({ debut: PAST, fin: PAST });
      expect(await reminders.sendDueReminders(NOW)).toBe(0);
    });

    it("ignore un RDV sans créneau (debut null)", async () => {
      await rdv({ debut: null, fin: null });
      expect(await reminders.sendDueReminders(NOW)).toBe(0);
    });

    it.each(["NOUVEAU", "REALISE", "ANNULE"] as const)(
      "ignore un RDV au statut %s",
      async (statut) => {
        await rdv({ statut });
        expect(await reminders.sendDueReminders(NOW)).toBe(0);
      },
    );

    it("ignore un RDV déjà rappelé (reminder_sent_at non null)", async () => {
      await rdv({ reminderSentAt: PAST });
      expect(await reminders.sendDueReminders(NOW)).toBe(0);
    });
  });

  describe("sendDueReminders — idempotence", () => {
    it("un second passage immédiat n'envoie aucun doublon", async () => {
      await rdv();
      expect(await reminders.sendDueReminders(NOW)).toBe(1);
      clearOutbox(app);
      expect(await reminders.sendDueReminders(NOW)).toBe(0);
      expect(outbox(app)).toHaveLength(0);
    });
  });

  describe("base vide", () => {
    it("ne fait rien sans RDV", async () => {
      expect(await reminders.sendDueReminders(NOW)).toBe(0);
    });
  });
});
