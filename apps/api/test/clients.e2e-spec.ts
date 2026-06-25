import { type INestApplication } from "@nestjs/common";
import request from "supertest";

import type { KyselyDB } from "../src/database/database.module";
import { bearer, createTestApp, login, seedAdmin, seedPrestation, truncateAll } from "./helpers";

const EMAIL = "admin@hymea.com";
const PASSWORD = "S3cr3t-pass!";
const UUID_ZERO = "00000000-0000-0000-0000-000000000000";

/** Insère un client en base et retourne son id. */
async function seedClient(
  db: KyselyDB,
  overrides: Partial<{ nom: string; prenom: string; email: string; telephone: string }> = {},
): Promise<string> {
  const row = await db
    .insertInto("clients")
    .values({
      nom: overrides.nom ?? "Cohen",
      prenom: overrides.prenom ?? "David",
      email: overrides.email ?? "david.cohen@example.com",
      telephone: overrides.telephone ?? "+972500000000",
      locale: "fr",
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

describe("Clients (e2e)", () => {
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

  // ─────────────────────────── GET /api/clients ───────────────────────────

  describe("GET /api/clients (liste, admin)", () => {
    it("renvoie une page vide quand aucun client", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/clients")
        .set(...bearer(token))
        .expect(200);
      expect(res.body).toMatchObject({ items: [], total: 0, page: 1, pageSize: 20 });
    });

    it("liste les clients (pagination par défaut)", async () => {
      await seedClient(db, { email: "a@example.com" });
      await seedClient(db, { email: "b@example.com" });
      const res = await request(app.getHttpServer())
        .get("/api/clients")
        .set(...bearer(token))
        .expect(200);
      expect(res.body.total).toBe(2);
      expect(res.body.items).toHaveLength(2);
    });

    it("respecte page & pageSize", async () => {
      for (let i = 0; i < 3; i++) await seedClient(db, { email: `c${i}@example.com` });
      const res = await request(app.getHttpServer())
        .get("/api/clients?page=1&pageSize=2")
        .set(...bearer(token))
        .expect(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.total).toBe(3);
    });

    it("recherche par nom (insensible à la casse)", async () => {
      await seedClient(db, { nom: "Abitbol", email: "x@example.com" });
      await seedClient(db, { nom: "Cohen", email: "y@example.com" });
      const res = await request(app.getHttpServer())
        .get("/api/clients?search=abit")
        .set(...bearer(token))
        .expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].nom).toBe("Abitbol");
    });

    it("recherche par email", async () => {
      await seedClient(db, { email: "needle@example.com" });
      await seedClient(db, { email: "other@example.com" });
      const res = await request(app.getHttpServer())
        .get("/api/clients?search=needle")
        .set(...bearer(token))
        .expect(200);
      expect(res.body.total).toBe(1);
    });

    it("ne renvoie pas le hash ni de champ sensible", async () => {
      await seedClient(db);
      const res = await request(app.getHttpServer())
        .get("/api/clients")
        .set(...bearer(token))
        .expect(200);
      expect(res.body.items[0]).toHaveProperty("email");
      expect(res.body.items[0]).not.toHaveProperty("password_hash");
    });

    it("rejette page=0 (400)", async () => {
      await request(app.getHttpServer())
        .get("/api/clients?page=0")
        .set(...bearer(token))
        .expect(400);
    });

    it("rejette pageSize négatif (400)", async () => {
      await request(app.getHttpServer())
        .get("/api/clients?pageSize=-1")
        .set(...bearer(token))
        .expect(400);
    });

    it("rejette pageSize au-delà du max (400)", async () => {
      await request(app.getHttpServer())
        .get("/api/clients?pageSize=999999")
        .set(...bearer(token))
        .expect(400);
    });

    it("ignore une injection SQL dans search sans planter (200)", async () => {
      await seedClient(db);
      const res = await request(app.getHttpServer())
        .get(`/api/clients?search=${encodeURIComponent("' OR 1=1 --")}`)
        .set(...bearer(token))
        .expect(200);
      expect(res.body.total).toBe(0);
    });

    it("rejette sans authentification (401)", async () => {
      await request(app.getHttpServer()).get("/api/clients").expect(401);
    });

    it("rejette un token invalide (401)", async () => {
      await request(app.getHttpServer())
        .get("/api/clients")
        .set("Authorization", "Bearer not-a-token")
        .expect(401);
    });
  });

  // ─────────────────────────── GET /api/clients/:id ────────────────────────

  describe("GET /api/clients/:id (admin)", () => {
    it("renvoie la fiche (200)", async () => {
      const id = await seedClient(db);
      const res = await request(app.getHttpServer())
        .get(`/api/clients/${id}`)
        .set(...bearer(token))
        .expect(200);
      expect(res.body).toMatchObject({ id, nom: "Cohen", anonymizedAt: null });
    });

    it("renvoie 404 pour un id inexistant", async () => {
      await request(app.getHttpServer())
        .get(`/api/clients/${UUID_ZERO}`)
        .set(...bearer(token))
        .expect(404);
    });

    it("renvoie 400 pour un id non-UUID", async () => {
      await request(app.getHttpServer())
        .get("/api/clients/pas-un-uuid")
        .set(...bearer(token))
        .expect(400);
    });

    it("rejette sans authentification (401)", async () => {
      const id = await seedClient(db);
      await request(app.getHttpServer()).get(`/api/clients/${id}`).expect(401);
    });
  });

  // ──────────────────── GET /api/clients/:id/rendez-vous ───────────────────

  describe("GET /api/clients/:id/rendez-vous (historique)", () => {
    it("renvoie la fiche + un historique vide", async () => {
      const id = await seedClient(db);
      const res = await request(app.getHttpServer())
        .get(`/api/clients/${id}/rendez-vous`)
        .set(...bearer(token))
        .expect(200);
      expect(res.body.client.id).toBe(id);
      expect(res.body.rendezVous).toEqual([]);
    });

    it("renvoie l'historique des RDV du client", async () => {
      const prestationId = await seedPrestation(db);
      const clientId = await seedClient(db);
      await db
        .insertInto("rendez_vous")
        .values({
          client_id: clientId,
          prestation_id: prestationId,
          type_client: "particulier",
          statut: "NOUVEAU",
          locale: "fr",
          consentement_accepte: true,
          consentement_date: new Date(),
          consentement_version: "v1",
        })
        .execute();
      const res = await request(app.getHttpServer())
        .get(`/api/clients/${clientId}/rendez-vous`)
        .set(...bearer(token))
        .expect(200);
      expect(res.body.rendezVous).toHaveLength(1);
      expect(res.body.rendezVous[0].clientId).toBe(clientId);
    });

    it("renvoie 404 pour un client inexistant", async () => {
      await request(app.getHttpServer())
        .get(`/api/clients/${UUID_ZERO}/rendez-vous`)
        .set(...bearer(token))
        .expect(404);
    });

    it("rejette sans authentification (401)", async () => {
      const id = await seedClient(db);
      await request(app.getHttpServer()).get(`/api/clients/${id}/rendez-vous`).expect(401);
    });
  });

  // ─────────────────── POST /api/clients/:id/anonymisation ──────────────────

  describe("POST /api/clients/:id/anonymisation (RGPD)", () => {
    it("anonymise les PII et conserve l'historique (200)", async () => {
      const prestationId = await seedPrestation(db);
      const clientId = await seedClient(db);
      await db
        .insertInto("rendez_vous")
        .values({
          client_id: clientId,
          prestation_id: prestationId,
          type_client: "particulier",
          statut: "NOUVEAU",
          locale: "fr",
          consentement_accepte: true,
          consentement_date: new Date(),
          consentement_version: "v1",
        })
        .execute();

      const res = await request(app.getHttpServer())
        .post(`/api/clients/${clientId}/anonymisation`)
        .set(...bearer(token))
        .expect(200);
      expect(res.body.nom).toBe("Anonymisé");
      expect(res.body.email).not.toContain("cohen");
      expect(res.body.anonymizedAt).not.toBeNull();

      // L'historique RDV est conservé.
      const histo = await request(app.getHttpServer())
        .get(`/api/clients/${clientId}/rendez-vous`)
        .set(...bearer(token))
        .expect(200);
      expect(histo.body.rendezVous).toHaveLength(1);
    });

    it("est idempotent (réanonymisation 200)", async () => {
      const clientId = await seedClient(db);
      await request(app.getHttpServer())
        .post(`/api/clients/${clientId}/anonymisation`)
        .set(...bearer(token))
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/clients/${clientId}/anonymisation`)
        .set(...bearer(token))
        .expect(200);
    });

    it("renvoie 404 pour un id inexistant", async () => {
      await request(app.getHttpServer())
        .post(`/api/clients/${UUID_ZERO}/anonymisation`)
        .set(...bearer(token))
        .expect(404);
    });

    it("renvoie 400 pour un id non-UUID", async () => {
      await request(app.getHttpServer())
        .post("/api/clients/xxx/anonymisation")
        .set(...bearer(token))
        .expect(400);
    });

    it("rejette sans authentification (401)", async () => {
      const id = await seedClient(db);
      await request(app.getHttpServer()).post(`/api/clients/${id}/anonymisation`).expect(401);
    });
  });

  // ────────────────────────── DELETE /api/clients/:id ──────────────────────

  describe("DELETE /api/clients/:id (RGPD suppression)", () => {
    it("supprime définitivement (204) avec cascade sur les RDV", async () => {
      const prestationId = await seedPrestation(db);
      const clientId = await seedClient(db);
      await db
        .insertInto("rendez_vous")
        .values({
          client_id: clientId,
          prestation_id: prestationId,
          type_client: "particulier",
          statut: "NOUVEAU",
          locale: "fr",
          consentement_accepte: true,
          consentement_date: new Date(),
          consentement_version: "v1",
        })
        .execute();

      await request(app.getHttpServer())
        .delete(`/api/clients/${clientId}`)
        .set(...bearer(token))
        .expect(204);

      const gone = await db
        .selectFrom("clients")
        .select("id")
        .where("id", "=", clientId)
        .executeTakeFirst();
      expect(gone).toBeUndefined();

      const rdvGone = await db
        .selectFrom("rendez_vous")
        .select("id")
        .where("client_id", "=", clientId)
        .executeTakeFirst();
      expect(rdvGone).toBeUndefined();
    });

    it("renvoie 404 pour un id inexistant", async () => {
      await request(app.getHttpServer())
        .delete(`/api/clients/${UUID_ZERO}`)
        .set(...bearer(token))
        .expect(404);
    });

    it("renvoie 400 pour un id non-UUID", async () => {
      await request(app.getHttpServer())
        .delete("/api/clients/nope")
        .set(...bearer(token))
        .expect(400);
    });

    it("rejette sans authentification (401)", async () => {
      const id = await seedClient(db);
      await request(app.getHttpServer()).delete(`/api/clients/${id}`).expect(401);
    });
  });
});
