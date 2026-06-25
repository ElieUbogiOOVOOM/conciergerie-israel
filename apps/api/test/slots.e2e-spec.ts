import { type INestApplication } from "@nestjs/common";
import request from "supertest";

import type { KyselyDB } from "../src/database/database.module";
import { createTestApp, truncateAll } from "./helpers";

const i18n = (s: string) => ({ fr: s, en: s, he: s });

/** Date calendaire (YYYY-MM-DD) à `offsetDays` du jour, sans dépendance TZ. */
function dateAtOffset(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

function weekday(dateIso: string): number {
  const [y, m, d] = dateIso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// Une date clairement future (≈ 1 an) et une date passée du MÊME jour de semaine
// (écart multiple de 7 jours) pour que la même règle hebdo s'applique.
const FUTURE_DATE = dateAtOffset(370);
const PAST_DATE = dateAtOffset(370 - 7 * 54); // −8 jours : dans le passé, même weekday.
const OTHER_WEEKDAY_DATE = dateAtOffset(371);

async function insertRegle(db: KyselyDB, jour: number, debut: string, fin: string): Promise<void> {
  await db.insertInto("regles_disponibilite").values({ jour, debut, fin }).execute();
}

async function insertPrestation(db: KyselyDB, dureeMinutes: number, actif = true): Promise<string> {
  const row = await db
    .insertInto("prestations")
    .values({
      libelle: JSON.stringify(i18n("Prestation")),
      description: null,
      cible: "particulier",
      duree_minutes: dureeMinutes,
      actif,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

async function insertRdv(
  db: KyselyDB,
  prestationId: string,
  statut: "NOUVEAU" | "CONFIRME" | "ANNULE",
  debut: string,
  fin: string,
): Promise<void> {
  const client = await db
    .insertInto("clients")
    .values({
      nom: "Test",
      prenom: "Client",
      email: `client-${statut}-${debut}@example.com`,
      telephone: "+972500000000",
      locale: "fr",
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  await db
    .insertInto("rendez_vous")
    .values({
      client_id: client.id,
      prestation_id: prestationId,
      type_client: "particulier",
      statut,
      debut: new Date(debut),
      fin: new Date(fin),
      locale: "fr",
      consentement_accepte: true,
      consentement_date: new Date(),
      consentement_version: "v1",
    })
    .execute();
}

describe("Slots (e2e)", () => {
  let app: INestApplication;
  let db: KyselyDB;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Génération de base", () => {
    it("découpe la plage d'ouverture selon la durée de la prestation", async () => {
      await insertRegle(db, weekday(FUTURE_DATE), "09:00", "13:00");
      const prestationId = await insertPrestation(db, 120);

      const res = await request(app.getHttpServer())
        .get(`/api/slots?date=${FUTURE_DATE}&prestationId=${prestationId}`)
        .expect(200);

      expect(res.body.dureeMinutes).toBe(120);
      expect(res.body.slots).toHaveLength(2); // 09–11, 11–13
      for (const slot of res.body.slots) {
        expect(new Date(slot.fin).getTime() - new Date(slot.debut).getTime()).toBe(120 * 60 * 1000);
      }
    });

    it("utilise la durée par défaut (60 min) sans prestation", async () => {
      await insertRegle(db, weekday(FUTURE_DATE), "09:00", "13:00");
      const res = await request(app.getHttpServer())
        .get(`/api/slots?date=${FUTURE_DATE}`)
        .expect(200);
      expect(res.body.dureeMinutes).toBe(60);
      expect(res.body.slots).toHaveLength(4);
    });

    it("renvoie une liste vide si aucune règle ce jour-là", async () => {
      await insertRegle(db, weekday(FUTURE_DATE), "09:00", "13:00");
      const res = await request(app.getHttpServer())
        .get(`/api/slots?date=${OTHER_WEEKDAY_DATE}`)
        .expect(200);
      expect(res.body.slots).toHaveLength(0);
    });

    it("exclut les créneaux déjà passés", async () => {
      await insertRegle(db, weekday(PAST_DATE), "09:00", "13:00");
      const res = await request(app.getHttpServer())
        .get(`/api/slots?date=${PAST_DATE}`)
        .expect(200);
      expect(res.body.slots).toHaveLength(0);
    });
  });

  describe("Exceptions / blocages", () => {
    it("masque les créneaux couverts par une exception bloquante", async () => {
      await insertRegle(db, weekday(FUTURE_DATE), "09:00", "13:00");
      // Bloque toute la journée (large fenêtre UTC).
      await db
        .insertInto("exceptions_disponibilite")
        .values({
          debut: new Date(`${FUTURE_DATE}T00:00:00.000Z`),
          fin: new Date(`${FUTURE_DATE}T23:59:59.000Z`),
          bloque: true,
          motif: "Fermé",
        })
        .execute();

      const res = await request(app.getHttpServer())
        .get(`/api/slots?date=${FUTURE_DATE}`)
        .expect(200);
      expect(res.body.slots).toHaveLength(0);
    });

    it("ignore une exception non bloquante", async () => {
      await insertRegle(db, weekday(FUTURE_DATE), "09:00", "13:00");
      await db
        .insertInto("exceptions_disponibilite")
        .values({
          debut: new Date(`${FUTURE_DATE}T00:00:00.000Z`),
          fin: new Date(`${FUTURE_DATE}T23:59:59.000Z`),
          bloque: false,
          motif: "Ouverture exceptionnelle",
        })
        .execute();
      const res = await request(app.getHttpServer())
        .get(`/api/slots?date=${FUTURE_DATE}`)
        .expect(200);
      expect(res.body.slots.length).toBeGreaterThan(0);
    });
  });

  describe("Créneaux déjà pris", () => {
    it("masque un créneau occupé par un RDV NOUVEAU", async () => {
      await insertRegle(db, weekday(FUTURE_DATE), "09:00", "13:00");
      const prestationId = await insertPrestation(db, 120);

      const before = await request(app.getHttpServer())
        .get(`/api/slots?date=${FUTURE_DATE}&prestationId=${prestationId}`)
        .expect(200);
      const taken = before.body.slots[0];

      await insertRdv(db, prestationId, "NOUVEAU", taken.debut, taken.fin);

      const after = await request(app.getHttpServer())
        .get(`/api/slots?date=${FUTURE_DATE}&prestationId=${prestationId}`)
        .expect(200);
      expect(after.body.slots).toHaveLength(before.body.slots.length - 1);
      expect(
        after.body.slots.find((s: { debut: string }) => s.debut === taken.debut),
      ).toBeUndefined();
    });

    it("masque aussi un créneau occupé par un RDV CONFIRME", async () => {
      await insertRegle(db, weekday(FUTURE_DATE), "09:00", "13:00");
      const prestationId = await insertPrestation(db, 120);
      const before = await request(app.getHttpServer())
        .get(`/api/slots?date=${FUTURE_DATE}&prestationId=${prestationId}`)
        .expect(200);
      const taken = before.body.slots[0];
      await insertRdv(db, prestationId, "CONFIRME", taken.debut, taken.fin);
      const after = await request(app.getHttpServer())
        .get(`/api/slots?date=${FUTURE_DATE}&prestationId=${prestationId}`)
        .expect(200);
      expect(after.body.slots).toHaveLength(before.body.slots.length - 1);
    });

    it("n'est pas masqué par un RDV ANNULE", async () => {
      await insertRegle(db, weekday(FUTURE_DATE), "09:00", "13:00");
      const prestationId = await insertPrestation(db, 120);
      const before = await request(app.getHttpServer())
        .get(`/api/slots?date=${FUTURE_DATE}&prestationId=${prestationId}`)
        .expect(200);
      const taken = before.body.slots[0];
      await insertRdv(db, prestationId, "ANNULE", taken.debut, taken.fin);
      const after = await request(app.getHttpServer())
        .get(`/api/slots?date=${FUTURE_DATE}&prestationId=${prestationId}`)
        .expect(200);
      expect(after.body.slots).toHaveLength(before.body.slots.length);
    });
  });

  describe("Validation & erreurs", () => {
    it("renvoie 404 pour une prestation inconnue", async () => {
      await insertRegle(db, weekday(FUTURE_DATE), "09:00", "13:00");
      await request(app.getHttpServer())
        .get(`/api/slots?date=${FUTURE_DATE}&prestationId=00000000-0000-0000-0000-000000000000`)
        .expect(404);
    });

    it("renvoie 400 pour une prestation désactivée", async () => {
      const prestationId = await insertPrestation(db, 120, false);
      await request(app.getHttpServer())
        .get(`/api/slots?date=${FUTURE_DATE}&prestationId=${prestationId}`)
        .expect(400);
    });

    it("renvoie 400 pour une date au mauvais format", async () => {
      await request(app.getHttpServer()).get("/api/slots?date=15-07-2026").expect(400);
    });

    it("renvoie 400 sans paramètre date", async () => {
      await request(app.getHttpServer()).get("/api/slots").expect(400);
    });

    it("renvoie 400 pour un prestationId non-UUID", async () => {
      await request(app.getHttpServer())
        .get(`/api/slots?date=${FUTURE_DATE}&prestationId=pas-un-uuid`)
        .expect(400);
    });
  });
});
