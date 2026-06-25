import { type INestApplication } from "@nestjs/common";
import request from "supertest";

import type { KyselyDB } from "../src/database/database.module";
import {
  bearer,
  createTestApp,
  login,
  seedAdmin,
  seedClient,
  seedPrestation,
  seedRendezVous,
  truncateAll,
} from "./helpers";

const EMAIL = "admin@hymea.com";
const PASSWORD = "S3cr3t-pass!";
const UUID_ZERO = "00000000-0000-0000-0000-000000000000";

describe("Calendar iCal feed (e2e, #20)", () => {
  let app: INestApplication;
  let db: KyselyDB;
  let token: string;
  let prestationId: string;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAll(db);
    await seedAdmin(db, EMAIL, PASSWORD);
    ({ accessToken: token } = await login(app, EMAIL, PASSWORD));
    prestationId = await seedPrestation(db, { libelle: "Nettoyage premium" });
  });

  afterAll(async () => {
    await app.close();
  });

  async function createFeedToken(label = "Agenda test"): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/api/calendar-feeds")
      .set(...bearer(token))
      .send({ label })
      .expect(201);
    return res.body.token as string;
  }

  async function seedConfirmedRdv(overrides: Partial<Parameters<typeof seedRendezVous>[1]> = {}) {
    const clientId = await seedClient(db, { email: `c${Math.random()}@example.com` });
    return seedRendezVous(db, {
      clientId,
      prestationId,
      statut: "CONFIRME",
      debut: new Date("2026-07-01T09:00:00.000Z"),
      fin: new Date("2026-07-01T10:30:00.000Z"),
      adresse: "12 rue Herzl",
      ...overrides,
    });
  }

  // ───────────────────── Gestion des jetons (admin, JWT) ────────────────────

  describe("POST /api/calendar-feeds", () => {
    it("crée un jeton (201) avec token, label et createdAt", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/calendar-feeds")
        .set(...bearer(token))
        .send({ label: "Google Sarah" })
        .expect(201);
      expect(res.body).toMatchObject({ label: "Google Sarah", revokedAt: null });
      expect(typeof res.body.token).toBe("string");
      expect(res.body.token.length).toBeGreaterThan(20);
    });

    it("rejette sans authentification (401)", async () => {
      await request(app.getHttpServer())
        .post("/api/calendar-feeds")
        .send({ label: "x" })
        .expect(401);
    });

    it("rejette un label vide (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/calendar-feeds")
        .set(...bearer(token))
        .send({ label: "" })
        .expect(400);
    });

    it("rejette un label manquant (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/calendar-feeds")
        .set(...bearer(token))
        .send({})
        .expect(400);
    });

    it("rejette un champ inconnu (400, forbidNonWhitelisted)", async () => {
      await request(app.getHttpServer())
        .post("/api/calendar-feeds")
        .set(...bearer(token))
        .send({ label: "ok", role: "admin" })
        .expect(400);
    });
  });

  describe("GET /api/calendar-feeds", () => {
    it("liste les jetons (200)", async () => {
      await createFeedToken("A");
      await createFeedToken("B");
      const res = await request(app.getHttpServer())
        .get("/api/calendar-feeds")
        .set(...bearer(token))
        .expect(200);
      expect(res.body).toHaveLength(2);
    });

    it("rejette sans authentification (401)", async () => {
      await request(app.getHttpServer()).get("/api/calendar-feeds").expect(401);
    });
  });

  describe("DELETE /api/calendar-feeds/:id", () => {
    it("révoque un jeton (204)", async () => {
      await createFeedToken();
      const list = await request(app.getHttpServer())
        .get("/api/calendar-feeds")
        .set(...bearer(token))
        .expect(200);
      const id = list.body[0].id;
      await request(app.getHttpServer())
        .delete(`/api/calendar-feeds/${id}`)
        .set(...bearer(token))
        .expect(204);
      const row = await db
        .selectFrom("calendar_feed_tokens")
        .select("revoked_at")
        .where("id", "=", id)
        .executeTakeFirstOrThrow();
      expect(row.revoked_at).not.toBeNull();
    });

    it("renvoie 404 pour un id inexistant", async () => {
      await request(app.getHttpServer())
        .delete(`/api/calendar-feeds/${UUID_ZERO}`)
        .set(...bearer(token))
        .expect(404);
    });

    it("renvoie 400 pour un id non-UUID", async () => {
      await request(app.getHttpServer())
        .delete("/api/calendar-feeds/nope")
        .set(...bearer(token))
        .expect(400);
    });

    it("rejette sans authentification (401)", async () => {
      await request(app.getHttpServer()).delete(`/api/calendar-feeds/${UUID_ZERO}`).expect(401);
    });
  });

  // ───────────────────── Flux public .ics (token requis) ────────────────────

  describe("GET /api/calendar-feeds/:token.ics", () => {
    it("sert un VCALENDAR valide (200) sans authentification", async () => {
      const feedToken = await createFeedToken();
      await seedConfirmedRdv();
      const res = await request(app.getHttpServer())
        .get(`/api/calendar-feeds/${feedToken}.ics`)
        .expect(200);
      expect(res.headers["content-type"]).toContain("text/calendar");
      expect(res.text).toContain("BEGIN:VCALENDAR");
      expect(res.text).toContain("END:VCALENDAR");
      expect(res.text).toContain("BEGIN:VEVENT");
      expect(res.text).toContain("DTSTART:20260701T090000Z");
      expect(res.text).toContain("DTEND:20260701T103000Z");
      expect(res.text).toContain("SUMMARY:Nettoyage premium");
      expect(res.text).toContain("STATUS:CONFIRMED");
    });

    it("inclut CONFIRME et REPLANIFIE, exclut les autres statuts", async () => {
      const feedToken = await createFeedToken();
      await seedConfirmedRdv({ statut: "CONFIRME" });
      await seedConfirmedRdv({ statut: "REPLANIFIE" });
      await seedConfirmedRdv({ statut: "NOUVEAU" });
      await seedConfirmedRdv({ statut: "ANNULE" });
      await seedConfirmedRdv({ statut: "REALISE" });
      const res = await request(app.getHttpServer())
        .get(`/api/calendar-feeds/${feedToken}.ics`)
        .expect(200);
      const events = res.text.match(/BEGIN:VEVENT/g) ?? [];
      expect(events).toHaveLength(2);
    });

    it("exclut les RDV sans créneau (debut/fin null)", async () => {
      const feedToken = await createFeedToken();
      await seedConfirmedRdv({ debut: null, fin: null });
      const res = await request(app.getHttpServer())
        .get(`/api/calendar-feeds/${feedToken}.ics`)
        .expect(200);
      expect(res.text).not.toContain("BEGIN:VEVENT");
    });

    it("échappe les caractères spéciaux iCal dans SUMMARY/LOCATION", async () => {
      const feedToken = await createFeedToken();
      const clientId = await seedClient(db, { nom: "Le; Comte, Sr", email: "s@example.com" });
      await seedRendezVous(db, {
        clientId,
        prestationId,
        statut: "CONFIRME",
        debut: new Date("2026-07-01T09:00:00.000Z"),
        fin: new Date("2026-07-01T10:00:00.000Z"),
        adresse: "Rue; des, fleurs",
      });
      const res = await request(app.getHttpServer())
        .get(`/api/calendar-feeds/${feedToken}.ics`)
        .expect(200);
      expect(res.text).toContain("Le\\; Comte\\, Sr");
      expect(res.text).toContain("LOCATION:Rue\\; des\\, fleurs");
    });

    it("renvoie 403 pour un token inexistant", async () => {
      await request(app.getHttpServer()).get("/api/calendar-feeds/unknowntoken.ics").expect(403);
    });

    it("renvoie 403 pour un token révoqué", async () => {
      const feedToken = await createFeedToken();
      const list = await request(app.getHttpServer())
        .get("/api/calendar-feeds")
        .set(...bearer(token))
        .expect(200);
      await request(app.getHttpServer())
        .delete(`/api/calendar-feeds/${list.body[0].id}`)
        .set(...bearer(token))
        .expect(204);
      await request(app.getHttpServer()).get(`/api/calendar-feeds/${feedToken}.ics`).expect(403);
    });
  });
});
