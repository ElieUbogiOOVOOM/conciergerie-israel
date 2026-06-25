import { type INestApplication } from "@nestjs/common";
import request from "supertest";

import type { KyselyDB } from "../src/database/database.module";
import { bearer, createTestApp, login, seedAdmin, truncateAll } from "./helpers";

const EMAIL = "admin@hymea.com";
const PASSWORD = "S3cr3t-pass!";

const i18n = (s: string) => ({ fr: s, en: s, he: s });

function validPrestation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    libelle: i18n("Nettoyage premium"),
    description: i18n("Description"),
    cible: "particulier",
    dureeMinutes: 120,
    ...overrides,
  };
}

describe("Prestations (e2e)", () => {
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

  describe("POST /api/prestations (admin)", () => {
    it("crée une prestation (200)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/prestations")
        .set(...bearer(token))
        .send(validPrestation())
        .expect(201);
      expect(res.body).toMatchObject({ cible: "particulier", dureeMinutes: 120, actif: true });
      expect(res.body.libelle.fr).toBe("Nettoyage premium");
      expect(typeof res.body.id).toBe("string");
    });

    it("accepte une description nulle/absente", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/prestations")
        .set(...bearer(token))
        .send(validPrestation({ description: undefined }))
        .expect(201);
      expect(res.body.description).toBeNull();
    });

    it("refuse une cible invalide (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/prestations")
        .set(...bearer(token))
        .send(validPrestation({ cible: "martien" }))
        .expect(400);
    });

    it("refuse une durée nulle ou négative (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/prestations")
        .set(...bearer(token))
        .send(validPrestation({ dureeMinutes: 0 }))
        .expect(400);
    });

    it("refuse un libellé i18n incomplet (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/prestations")
        .set(...bearer(token))
        .send(validPrestation({ libelle: { fr: "Seulement FR" } }))
        .expect(400);
    });

    it("refuse une clé i18n vide (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/prestations")
        .set(...bearer(token))
        .send(validPrestation({ libelle: { fr: "ok", en: "", he: "ok" } }))
        .expect(400);
    });

    it("rejette sans authentification (401)", async () => {
      await request(app.getHttpServer())
        .post("/api/prestations")
        .send(validPrestation())
        .expect(401);
    });
  });

  describe("GET /api/prestations (admin)", () => {
    it("liste actives et inactives", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/prestations")
        .set(...bearer(token))
        .send(validPrestation())
        .expect(201);
      await request(app.getHttpServer())
        .delete(`/api/prestations/${created.body.id}`)
        .set(...bearer(token))
        .expect(200);

      const res = await request(app.getHttpServer())
        .get("/api/prestations")
        .set(...bearer(token))
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].actif).toBe(false);
    });
  });

  describe("GET /api/prestations/:id (admin)", () => {
    it("renvoie le détail (200)", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/prestations")
        .set(...bearer(token))
        .send(validPrestation())
        .expect(201);
      await request(app.getHttpServer())
        .get(`/api/prestations/${created.body.id}`)
        .set(...bearer(token))
        .expect(200);
    });

    it("renvoie 404 pour un id inexistant", async () => {
      await request(app.getHttpServer())
        .get("/api/prestations/00000000-0000-0000-0000-000000000000")
        .set(...bearer(token))
        .expect(404);
    });

    it("renvoie 400 pour un id non-UUID", async () => {
      await request(app.getHttpServer())
        .get("/api/prestations/pas-un-uuid")
        .set(...bearer(token))
        .expect(400);
    });
  });

  describe("PATCH /api/prestations/:id (admin)", () => {
    it("met à jour partiellement (200)", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/prestations")
        .set(...bearer(token))
        .send(validPrestation())
        .expect(201);
      const res = await request(app.getHttpServer())
        .patch(`/api/prestations/${created.body.id}`)
        .set(...bearer(token))
        .send({ dureeMinutes: 90 })
        .expect(200);
      expect(res.body.dureeMinutes).toBe(90);
      expect(res.body.cible).toBe("particulier");
    });

    it("renvoie 404 pour un id inexistant", async () => {
      await request(app.getHttpServer())
        .patch("/api/prestations/00000000-0000-0000-0000-000000000000")
        .set(...bearer(token))
        .send({ dureeMinutes: 90 })
        .expect(404);
    });
  });

  describe("DELETE /api/prestations/:id (soft-disable)", () => {
    it("désactive sans supprimer physiquement (200)", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/prestations")
        .set(...bearer(token))
        .send(validPrestation())
        .expect(201);
      const res = await request(app.getHttpServer())
        .delete(`/api/prestations/${created.body.id}`)
        .set(...bearer(token))
        .expect(200);
      expect(res.body.actif).toBe(false);

      const stillThere = await db
        .selectFrom("prestations")
        .select("id")
        .where("id", "=", created.body.id)
        .executeTakeFirst();
      expect(stillThere).toBeDefined();
    });
  });

  describe("GET /api/prestations/public (public)", () => {
    beforeEach(async () => {
      // 2 actives particulier, 1 inactive particulier, 1 active entreprise.
      await request(app.getHttpServer())
        .post("/api/prestations")
        .set(...bearer(token))
        .send(validPrestation({ libelle: i18n("Active 1") }))
        .expect(201);
      await request(app.getHttpServer())
        .post("/api/prestations")
        .set(...bearer(token))
        .send(validPrestation({ libelle: i18n("Active 2") }))
        .expect(201);
      const inactive = await request(app.getHttpServer())
        .post("/api/prestations")
        .set(...bearer(token))
        .send(validPrestation({ libelle: i18n("Inactive") }))
        .expect(201);
      await request(app.getHttpServer())
        .delete(`/api/prestations/${inactive.body.id}`)
        .set(...bearer(token))
        .expect(200);
      await request(app.getHttpServer())
        .post("/api/prestations")
        .set(...bearer(token))
        .send(validPrestation({ cible: "entreprise", libelle: i18n("Entreprise") }))
        .expect(201);
    });

    it("ne renvoie que les actives de la cible demandée (sans auth)", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/prestations/public?cible=particulier")
        .expect(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.every((p: { actif: boolean; cible: string }) => p.actif)).toBe(true);
      expect(res.body.every((p: { cible: string }) => p.cible === "particulier")).toBe(true);
    });

    it("filtre par cible entreprise", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/prestations/public?cible=entreprise")
        .expect(200);
      expect(res.body).toHaveLength(1);
    });

    it("renvoie 400 sans paramètre cible", async () => {
      await request(app.getHttpServer()).get("/api/prestations/public").expect(400);
    });

    it("renvoie 400 pour une cible invalide", async () => {
      await request(app.getHttpServer()).get("/api/prestations/public?cible=martien").expect(400);
    });
  });
});
