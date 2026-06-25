import { type INestApplication } from "@nestjs/common";
import request from "supertest";

import type { KyselyDB } from "../src/database/database.module";
import { bearer, createTestApp, login, seedAdmin, truncateAll } from "./helpers";

const EMAIL = "admin@hymea.com";
const PASSWORD = "S3cr3t-pass!";

describe("Disponibilités (e2e)", () => {
  let app: INestApplication;
  let db: KyselyDB;
  let token: string;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAll(db);
    await seedAdmin(db, EMAIL, PASSWORD);
    ({ accessToken: token } = await login(app, EMAIL, PASSWORD));
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Règles hebdomadaires", () => {
    it("crée une règle (201)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/disponibilites/regles")
        .set(...bearer(token))
        .send({ jour: 1, debut: "09:00", fin: "18:00" })
        .expect(201);
      expect(res.body).toMatchObject({ jour: 1, debut: "09:00", fin: "18:00" });
      expect(typeof res.body.id).toBe("string");
    });

    it("liste les règles triées (200)", async () => {
      await request(app.getHttpServer())
        .post("/api/disponibilites/regles")
        .set(...bearer(token))
        .send({ jour: 3, debut: "09:00", fin: "12:00" })
        .expect(201);
      await request(app.getHttpServer())
        .post("/api/disponibilites/regles")
        .set(...bearer(token))
        .send({ jour: 1, debut: "09:00", fin: "12:00" })
        .expect(201);
      const res = await request(app.getHttpServer())
        .get("/api/disponibilites/regles")
        .set(...bearer(token))
        .expect(200);
      expect(res.body.map((r: { jour: number }) => r.jour)).toEqual([1, 3]);
    });

    it("supprime une règle (204)", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/disponibilites/regles")
        .set(...bearer(token))
        .send({ jour: 1, debut: "09:00", fin: "18:00" })
        .expect(201);
      await request(app.getHttpServer())
        .delete(`/api/disponibilites/regles/${created.body.id}`)
        .set(...bearer(token))
        .expect(204);
    });

    it("renvoie 404 en supprimant une règle inexistante", async () => {
      await request(app.getHttpServer())
        .delete("/api/disponibilites/regles/00000000-0000-0000-0000-000000000000")
        .set(...bearer(token))
        .expect(404);
    });

    it("refuse un jour hors 0..6 (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/disponibilites/regles")
        .set(...bearer(token))
        .send({ jour: 7, debut: "09:00", fin: "18:00" })
        .expect(400);
    });

    it("refuse un format d'heure invalide (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/disponibilites/regles")
        .set(...bearer(token))
        .send({ jour: 1, debut: "9h", fin: "18:00" })
        .expect(400);
    });

    it("refuse fin <= debut (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/disponibilites/regles")
        .set(...bearer(token))
        .send({ jour: 1, debut: "18:00", fin: "09:00" })
        .expect(400);
    });

    it("rejette sans authentification (401)", async () => {
      await request(app.getHttpServer())
        .post("/api/disponibilites/regles")
        .send({ jour: 1, debut: "09:00", fin: "18:00" })
        .expect(401);
    });
  });

  describe("Exceptions / blocages", () => {
    it("crée une exception bloquante par défaut (201)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/disponibilites/exceptions")
        .set(...bearer(token))
        .send({ debut: "2026-07-14T00:00:00.000Z", fin: "2026-07-15T00:00:00.000Z" })
        .expect(201);
      expect(res.body.bloque).toBe(true);
      expect(res.body.motif).toBeNull();
    });

    it("crée une exception avec motif (201)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/disponibilites/exceptions")
        .set(...bearer(token))
        .send({
          debut: "2026-07-14T00:00:00.000Z",
          fin: "2026-07-15T00:00:00.000Z",
          bloque: true,
          motif: "Jour férié",
        })
        .expect(201);
      expect(res.body.motif).toBe("Jour férié");
    });

    it("liste les exceptions (200)", async () => {
      await request(app.getHttpServer())
        .post("/api/disponibilites/exceptions")
        .set(...bearer(token))
        .send({ debut: "2026-07-14T00:00:00.000Z", fin: "2026-07-15T00:00:00.000Z" })
        .expect(201);
      const res = await request(app.getHttpServer())
        .get("/api/disponibilites/exceptions")
        .set(...bearer(token))
        .expect(200);
      expect(res.body).toHaveLength(1);
    });

    it("supprime une exception (204)", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/disponibilites/exceptions")
        .set(...bearer(token))
        .send({ debut: "2026-07-14T00:00:00.000Z", fin: "2026-07-15T00:00:00.000Z" })
        .expect(201);
      await request(app.getHttpServer())
        .delete(`/api/disponibilites/exceptions/${created.body.id}`)
        .set(...bearer(token))
        .expect(204);
    });

    it("refuse fin <= debut (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/disponibilites/exceptions")
        .set(...bearer(token))
        .send({ debut: "2026-07-15T00:00:00.000Z", fin: "2026-07-14T00:00:00.000Z" })
        .expect(400);
    });

    it("refuse une date non ISO (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/disponibilites/exceptions")
        .set(...bearer(token))
        .send({ debut: "14/07/2026", fin: "2026-07-15T00:00:00.000Z" })
        .expect(400);
    });

    it("rejette sans authentification (401)", async () => {
      await request(app.getHttpServer()).get("/api/disponibilites/exceptions").expect(401);
    });
  });
});
