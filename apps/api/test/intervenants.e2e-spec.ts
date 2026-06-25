import { type INestApplication } from "@nestjs/common";
import { sql } from "kysely";
import request from "supertest";

import type { KyselyDB } from "../src/database/database.module";
import { bearer, createTestApp, login, seedAdmin, truncateAll } from "./helpers";

const EMAIL = "admin@hymea.com";
const PASSWORD = "S3cr3t-pass!";

/** UUID syntaxiquement valide mais absent de la base. */
const MISSING_UUID = "00000000-0000-0000-0000-000000000000";

/** Insère une équipe directement en base. Retourne son id. */
async function seedEquipe(db: KyselyDB, nom = "Équipe Tel-Aviv"): Promise<string> {
  const row = await db
    .insertInto("equipes")
    .values({ nom })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

/** Insère un intervenant directement en base. Retourne son id. */
async function seedIntervenantRow(
  db: KyselyDB,
  overrides: {
    nom?: string;
    prenom?: string | null;
    equipeId?: string | null;
    actif?: boolean;
  } = {},
): Promise<string> {
  const row = await db
    .insertInto("intervenants")
    .values({
      nom: overrides.nom ?? "Levi",
      prenom: overrides.prenom ?? null,
      equipe_id: overrides.equipeId ?? null,
      actif: overrides.actif ?? true,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

describe("Intervenants & équipes (e2e)", () => {
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

  // ============================== ÉQUIPES ==============================

  describe("GET /api/equipes", () => {
    it("exige une authentification (401)", async () => {
      await request(app.getHttpServer()).get("/api/equipes").expect(401);
    });

    it("rejette un token invalide (401)", async () => {
      await request(app.getHttpServer())
        .get("/api/equipes")
        .set("Authorization", "Bearer not-a-jwt")
        .expect(401);
    });

    it("retourne la liste triée par nom", async () => {
      await seedEquipe(db, "Zenith");
      await seedEquipe(db, "Alpha");
      const res = await request(app.getHttpServer())
        .get("/api/equipes")
        .set(...bearer(token))
        .expect(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.map((e: { nom: string }) => e.nom)).toEqual(["Alpha", "Zenith"]);
      expect(res.body[0]).toEqual({ id: expect.any(String), nom: "Alpha" });
    });

    it("retourne un tableau vide sans équipe", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/equipes")
        .set(...bearer(token))
        .expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("POST /api/equipes", () => {
    it("exige une authentification (401)", async () => {
      await request(app.getHttpServer()).post("/api/equipes").send({ nom: "X" }).expect(401);
    });

    it("crée une équipe (201)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/equipes")
        .set(...bearer(token))
        .send({ nom: "Équipe Haïfa" })
        .expect(201);
      expect(res.body).toEqual({ id: expect.any(String), nom: "Équipe Haïfa" });
    });

    it("rejette un nom manquant (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/equipes")
        .set(...bearer(token))
        .send({})
        .expect(400);
    });

    it("rejette un nom vide (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/equipes")
        .set(...bearer(token))
        .send({ nom: "" })
        .expect(400);
    });

    it("rejette un nom non-string (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/equipes")
        .set(...bearer(token))
        .send({ nom: 42 })
        .expect(400);
    });

    it("rejette un champ inconnu (400, forbidNonWhitelisted)", async () => {
      await request(app.getHttpServer())
        .post("/api/equipes")
        .set(...bearer(token))
        .send({ nom: "Ok", inconnu: true })
        .expect(400);
    });

    it("ne crashe pas sur une charge d'injection (201, stockée telle quelle)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/equipes")
        .set(...bearer(token))
        .send({ nom: "' OR 1=1 --" })
        .expect(201);
      expect(res.body.nom).toBe("' OR 1=1 --");
    });
  });

  describe("PATCH /api/equipes/:id", () => {
    it("exige une authentification (401)", async () => {
      const id = await seedEquipe(db);
      await request(app.getHttpServer()).patch(`/api/equipes/${id}`).send({ nom: "Y" }).expect(401);
    });

    it("renomme une équipe", async () => {
      const id = await seedEquipe(db, "Avant");
      const res = await request(app.getHttpServer())
        .patch(`/api/equipes/${id}`)
        .set(...bearer(token))
        .send({ nom: "Après" })
        .expect(200);
      expect(res.body).toEqual({ id, nom: "Après" });
    });

    it("renvoie 404 pour un id inexistant", async () => {
      await request(app.getHttpServer())
        .patch(`/api/equipes/${MISSING_UUID}`)
        .set(...bearer(token))
        .send({ nom: "X" })
        .expect(404);
    });

    it("renvoie 400 pour un id non-uuid", async () => {
      await request(app.getHttpServer())
        .patch("/api/equipes/not-a-uuid")
        .set(...bearer(token))
        .send({ nom: "X" })
        .expect(400);
    });

    it("rejette un nom vide (400)", async () => {
      const id = await seedEquipe(db);
      await request(app.getHttpServer())
        .patch(`/api/equipes/${id}`)
        .set(...bearer(token))
        .send({ nom: "" })
        .expect(400);
    });
  });

  describe("DELETE /api/equipes/:id", () => {
    it("exige une authentification (401)", async () => {
      const id = await seedEquipe(db);
      await request(app.getHttpServer()).delete(`/api/equipes/${id}`).expect(401);
    });

    it("supprime une équipe (204)", async () => {
      const id = await seedEquipe(db);
      await request(app.getHttpServer())
        .delete(`/api/equipes/${id}`)
        .set(...bearer(token))
        .expect(204);
      const remaining = await db.selectFrom("equipes").selectAll().execute();
      expect(remaining).toHaveLength(0);
    });

    it("détache les intervenants rattachés (FK ON DELETE SET NULL)", async () => {
      const equipeId = await seedEquipe(db);
      const intervenantId = await seedIntervenantRow(db, { equipeId });
      await request(app.getHttpServer())
        .delete(`/api/equipes/${equipeId}`)
        .set(...bearer(token))
        .expect(204);
      const row = await db
        .selectFrom("intervenants")
        .select("equipe_id")
        .where("id", "=", intervenantId)
        .executeTakeFirstOrThrow();
      expect(row.equipe_id).toBeNull();
    });

    it("renvoie 404 pour un id inexistant", async () => {
      await request(app.getHttpServer())
        .delete(`/api/equipes/${MISSING_UUID}`)
        .set(...bearer(token))
        .expect(404);
    });

    it("renvoie 400 pour un id non-uuid", async () => {
      await request(app.getHttpServer())
        .delete("/api/equipes/not-a-uuid")
        .set(...bearer(token))
        .expect(400);
    });
  });

  // ============================ INTERVENANTS ============================

  describe("GET /api/intervenants", () => {
    it("exige une authentification (401)", async () => {
      await request(app.getHttpServer()).get("/api/intervenants").expect(401);
    });

    it("retourne la liste triée par nom puis prénom", async () => {
      await seedIntervenantRow(db, { nom: "Cohen", prenom: "Sarah" });
      await seedIntervenantRow(db, { nom: "Cohen", prenom: "Ari" });
      await seedIntervenantRow(db, { nom: "Abitbol", prenom: null });
      const res = await request(app.getHttpServer())
        .get("/api/intervenants")
        .set(...bearer(token))
        .expect(200);
      expect(
        res.body.map((i: { nom: string; prenom: string | null }) => `${i.nom}/${i.prenom}`),
      ).toEqual(["Abitbol/null", "Cohen/Ari", "Cohen/Sarah"]);
    });

    it("expose la forme d'entité attendue", async () => {
      const equipeId = await seedEquipe(db);
      await seedIntervenantRow(db, { nom: "Levi", prenom: "Dan", equipeId, actif: true });
      const res = await request(app.getHttpServer())
        .get("/api/intervenants")
        .set(...bearer(token))
        .expect(200);
      expect(res.body[0]).toEqual({
        id: expect.any(String),
        nom: "Levi",
        prenom: "Dan",
        equipeId,
        actif: true,
      });
    });

    it("filtre les intervenants actifs (?actif=true)", async () => {
      await seedIntervenantRow(db, { nom: "Actif", actif: true });
      await seedIntervenantRow(db, { nom: "Inactif", actif: false });
      const res = await request(app.getHttpServer())
        .get("/api/intervenants?actif=true")
        .set(...bearer(token))
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].nom).toBe("Actif");
    });

    it("filtre les intervenants inactifs (?actif=false)", async () => {
      await seedIntervenantRow(db, { nom: "Actif", actif: true });
      await seedIntervenantRow(db, { nom: "Inactif", actif: false });
      const res = await request(app.getHttpServer())
        .get("/api/intervenants?actif=false")
        .set(...bearer(token))
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].nom).toBe("Inactif");
    });

    it("rejette un filtre actif non-booléen (400)", async () => {
      await request(app.getHttpServer())
        .get("/api/intervenants?actif=peut-etre")
        .set(...bearer(token))
        .expect(400);
    });
  });

  describe("POST /api/intervenants", () => {
    it("exige une authentification (401)", async () => {
      await request(app.getHttpServer()).post("/api/intervenants").send({ nom: "X" }).expect(401);
    });

    it("crée un intervenant minimal (201, actif par défaut)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/intervenants")
        .set(...bearer(token))
        .send({ nom: "Cohen" })
        .expect(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        nom: "Cohen",
        prenom: null,
        equipeId: null,
        actif: true,
      });
    });

    it("crée un intervenant complet (201)", async () => {
      const equipeId = await seedEquipe(db);
      const res = await request(app.getHttpServer())
        .post("/api/intervenants")
        .set(...bearer(token))
        .send({ nom: "Levi", prenom: "Sarah", equipeId, actif: false })
        .expect(201);
      expect(res.body).toMatchObject({ nom: "Levi", prenom: "Sarah", equipeId, actif: false });
    });

    it("rejette un nom manquant (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/intervenants")
        .set(...bearer(token))
        .send({ prenom: "Sarah" })
        .expect(400);
    });

    it("rejette un nom vide (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/intervenants")
        .set(...bearer(token))
        .send({ nom: "" })
        .expect(400);
    });

    it("rejette un equipeId non-uuid (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/intervenants")
        .set(...bearer(token))
        .send({ nom: "Cohen", equipeId: "not-a-uuid" })
        .expect(400);
    });

    it("rejette un actif non-booléen (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/intervenants")
        .set(...bearer(token))
        .send({ nom: "Cohen", actif: "oui" })
        .expect(400);
    });

    it("rejette un champ inconnu (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/intervenants")
        .set(...bearer(token))
        .send({ nom: "Cohen", role: "chef" })
        .expect(400);
    });

    it("renvoie 404 si l'équipe référencée n'existe pas", async () => {
      await request(app.getHttpServer())
        .post("/api/intervenants")
        .set(...bearer(token))
        .send({ nom: "Cohen", equipeId: MISSING_UUID })
        .expect(404);
    });
  });

  describe("GET /api/intervenants/:id", () => {
    it("exige une authentification (401)", async () => {
      const id = await seedIntervenantRow(db);
      await request(app.getHttpServer()).get(`/api/intervenants/${id}`).expect(401);
    });

    it("retourne le détail d'un intervenant", async () => {
      const id = await seedIntervenantRow(db, { nom: "Cohen", prenom: "Sarah" });
      const res = await request(app.getHttpServer())
        .get(`/api/intervenants/${id}`)
        .set(...bearer(token))
        .expect(200);
      expect(res.body).toMatchObject({ id, nom: "Cohen", prenom: "Sarah" });
    });

    it("renvoie 404 pour un id inexistant", async () => {
      await request(app.getHttpServer())
        .get(`/api/intervenants/${MISSING_UUID}`)
        .set(...bearer(token))
        .expect(404);
    });

    it("renvoie 400 pour un id non-uuid", async () => {
      await request(app.getHttpServer())
        .get("/api/intervenants/not-a-uuid")
        .set(...bearer(token))
        .expect(400);
    });
  });

  describe("PATCH /api/intervenants/:id", () => {
    it("exige une authentification (401)", async () => {
      const id = await seedIntervenantRow(db);
      await request(app.getHttpServer())
        .patch(`/api/intervenants/${id}`)
        .send({ nom: "Y" })
        .expect(401);
    });

    it("met à jour les champs fournis", async () => {
      const id = await seedIntervenantRow(db, { nom: "Cohen", prenom: "Sarah" });
      const res = await request(app.getHttpServer())
        .patch(`/api/intervenants/${id}`)
        .set(...bearer(token))
        .send({ prenom: "Sara", actif: false })
        .expect(200);
      expect(res.body).toMatchObject({ id, nom: "Cohen", prenom: "Sara", actif: false });
    });

    it("détache l'équipe avec equipeId null", async () => {
      const equipeId = await seedEquipe(db);
      const id = await seedIntervenantRow(db, { equipeId });
      const res = await request(app.getHttpServer())
        .patch(`/api/intervenants/${id}`)
        .set(...bearer(token))
        .send({ equipeId: null })
        .expect(200);
      expect(res.body.equipeId).toBeNull();
    });

    it("renvoie 404 si la nouvelle équipe n'existe pas", async () => {
      const id = await seedIntervenantRow(db);
      await request(app.getHttpServer())
        .patch(`/api/intervenants/${id}`)
        .set(...bearer(token))
        .send({ equipeId: MISSING_UUID })
        .expect(404);
    });

    it("renvoie 404 pour un intervenant inexistant", async () => {
      await request(app.getHttpServer())
        .patch(`/api/intervenants/${MISSING_UUID}`)
        .set(...bearer(token))
        .send({ nom: "X" })
        .expect(404);
    });

    it("renvoie 400 pour un id non-uuid", async () => {
      await request(app.getHttpServer())
        .patch("/api/intervenants/not-a-uuid")
        .set(...bearer(token))
        .send({ nom: "X" })
        .expect(400);
    });
  });

  describe("DELETE /api/intervenants/:id", () => {
    it("exige une authentification (401)", async () => {
      const id = await seedIntervenantRow(db);
      await request(app.getHttpServer()).delete(`/api/intervenants/${id}`).expect(401);
    });

    it("désactive l'intervenant (200, soft-delete)", async () => {
      const id = await seedIntervenantRow(db, { actif: true });
      const res = await request(app.getHttpServer())
        .delete(`/api/intervenants/${id}`)
        .set(...bearer(token))
        .expect(200);
      expect(res.body.actif).toBe(false);
      const row = await db
        .selectFrom("intervenants")
        .select("actif")
        .where("id", "=", id)
        .executeTakeFirstOrThrow();
      expect(row.actif).toBe(false);
    });

    it("ne supprime pas physiquement la ligne", async () => {
      const id = await seedIntervenantRow(db);
      await request(app.getHttpServer())
        .delete(`/api/intervenants/${id}`)
        .set(...bearer(token))
        .expect(200);
      const count = await db
        .selectFrom("intervenants")
        .select(sql<number>`count(*)`.as("n"))
        .where("id", "=", id)
        .executeTakeFirstOrThrow();
      expect(Number(count.n)).toBe(1);
    });

    it("renvoie 404 pour un id inexistant", async () => {
      await request(app.getHttpServer())
        .delete(`/api/intervenants/${MISSING_UUID}`)
        .set(...bearer(token))
        .expect(404);
    });

    it("renvoie 400 pour un id non-uuid", async () => {
      await request(app.getHttpServer())
        .delete("/api/intervenants/not-a-uuid")
        .set(...bearer(token))
        .expect(400);
    });
  });
});
