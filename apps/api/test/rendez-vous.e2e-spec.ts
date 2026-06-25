import { type INestApplication } from "@nestjs/common";
import request from "supertest";

import type { KyselyDB } from "../src/database/database.module";
import {
  bearer,
  clearOutbox,
  createTestApp,
  login,
  outbox,
  seedAdmin,
  seedIntervenant,
  seedPrestation,
  truncateAll,
} from "./helpers";

const EMAIL = "admin@hymea.com";
const PASSWORD = "S3cr3t-pass!";
const UUID_ZERO = "00000000-0000-0000-0000-000000000000";

describe("Rendez-vous (e2e)", () => {
  let app: INestApplication;
  let db: KyselyDB;
  let token: string;
  let prestationParticulier: string;
  let prestationEntreprise: string;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAll(db);
    clearOutbox(app);
    await seedAdmin(db, EMAIL, PASSWORD);
    ({ accessToken: token } = await login(app, EMAIL, PASSWORD));
    prestationParticulier = await seedPrestation(db, { cible: "particulier", dureeMinutes: 90 });
    prestationEntreprise = await seedPrestation(db, { cible: "entreprise", dureeMinutes: 60 });
  });

  afterAll(async () => {
    await app.close();
  });

  function validDemande(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      nom: "Cohen",
      prenom: "David",
      email: "david.cohen@example.com",
      telephone: "+972500000000",
      typeClient: "particulier",
      prestationId: prestationParticulier,
      debut: "2026-07-01T09:00:00.000Z",
      adresse: "12 rue Herzl, Tel Aviv",
      consentement: true,
      locale: "fr",
      ...overrides,
    };
  }

  // ─────────────────── POST /api/rendez-vous (public, #13) ──────────────────

  describe("POST /api/rendez-vous (public)", () => {
    it("crée une demande particulier valide (201, statut NOUVEAU)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande())
        .expect(201);
      expect(res.body).toMatchObject({ statut: "NOUVEAU", typeClient: "particulier" });
      expect(res.body.consentement).toMatchObject({ accepte: true, version: "2026-06-v1" });
      expect(typeof res.body.consentement.date).toBe("string");
      // fin = debut + 90 min.
      expect(res.body.fin).toBe("2026-07-01T10:30:00.000Z");
    });

    it("crée une demande avec tous les champs optionnels (201)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(
          validDemande({ message: "Merci de prévoir un parking", surfaceM2: 80, nombrePieces: 4 }),
        )
        .expect(201);
      expect(res.body).toMatchObject({ surfaceM2: 80, nombrePieces: 4 });
      expect(res.body.message).toContain("parking");
    });

    it("déclenche l'email « demande_recue » au client + notification HYMEA", async () => {
      await request(app.getHttpServer()).post("/api/rendez-vous").send(validDemande()).expect(201);
      const mails = outbox(app);
      const client = mails.find((m) => m.audience === "client");
      const hymea = mails.find((m) => m.audience === "hymea");
      expect(client?.type).toBe("demande_recue");
      expect(client?.to).toBe("david.cohen@example.com");
      expect(hymea?.audience).toBe("hymea");
      expect(client?.html).toContain("HYMEA");
    });

    it("envoie l'email du client dans sa langue (he → RTL)", async () => {
      await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande({ locale: "he" }))
        .expect(201);
      const client = outbox(app).find((m) => m.audience === "client");
      expect(client?.locale).toBe("he");
      expect(client?.html).toContain('dir="rtl"');
    });

    it("déduplique le client par email (réutilise la fiche)", async () => {
      await request(app.getHttpServer()).post("/api/rendez-vous").send(validDemande()).expect(201);
      await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande({ email: "DAVID.cohen@example.com", prenom: "Dav" }))
        .expect(201);
      const clients = await db.selectFrom("clients").selectAll().execute();
      expect(clients).toHaveLength(1);
      expect(clients[0]?.prenom).toBe("Dav"); // coordonnées rafraîchies
      const rdv = await db.selectFrom("rendez_vous").selectAll().execute();
      expect(rdv).toHaveLength(2);
    });

    it("entreprise : créneau optionnel (201 sans debut/adresse)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send({
          nom: "Société",
          prenom: "Contact",
          email: "contact@societe.com",
          telephone: "+972500000001",
          typeClient: "entreprise",
          prestationId: prestationEntreprise,
          consentement: true,
        })
        .expect(201);
      expect(res.body.debut).toBeNull();
      expect(res.body.fin).toBeNull();
    });

    // --- Anti-spam ---
    it("rejette si le honeypot est rempli (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande({ website: "http://spam.com" }))
        .expect(400);
    });

    it("accepte un honeypot vide", async () => {
      await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande({ website: "" }))
        .expect(201);
    });

    // --- Consentement ---
    it("rejette si consentement = false (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande({ consentement: false }))
        .expect(400);
    });

    it("rejette si consentement manquant (400)", async () => {
      const body = validDemande();
      delete body.consentement;
      await request(app.getHttpServer()).post("/api/rendez-vous").send(body).expect(400);
    });

    // --- Validation conditionnelle particulier ---
    it("rejette un particulier sans créneau (400)", async () => {
      const body = validDemande();
      delete body.debut;
      await request(app.getHttpServer()).post("/api/rendez-vous").send(body).expect(400);
    });

    it("rejette un particulier sans adresse (400)", async () => {
      const body = validDemande();
      delete body.adresse;
      await request(app.getHttpServer()).post("/api/rendez-vous").send(body).expect(400);
    });

    // --- Cohérence prestation / type client ---
    it("rejette si la prestation ne correspond pas au type de client (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande({ prestationId: prestationEntreprise }))
        .expect(400);
    });

    it("rejette une prestation inexistante (404)", async () => {
      await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande({ prestationId: UUID_ZERO }))
        .expect(404);
    });

    it("rejette une prestation désactivée (400)", async () => {
      const inactive = await seedPrestation(db, { cible: "particulier", actif: false });
      await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande({ prestationId: inactive }))
        .expect(400);
    });

    // --- Validation des champs ---
    it("rejette un email invalide (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande({ email: "pas-un-email" }))
        .expect(400);
    });

    it("rejette un typeClient hors enum (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande({ typeClient: "martien" }))
        .expect(400);
    });

    it("rejette un prestationId non-UUID (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande({ prestationId: "xxx" }))
        .expect(400);
    });

    it("rejette un debut non ISO (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande({ debut: "01/07/2026" }))
        .expect(400);
    });

    it("rejette une surfaceM2 négative (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande({ surfaceM2: -5 }))
        .expect(400);
    });

    it("rejette un nom manquant (400)", async () => {
      const body = validDemande();
      delete body.nom;
      await request(app.getHttpServer()).post("/api/rendez-vous").send(body).expect(400);
    });

    it("rejette un champ inconnu (400, forbidNonWhitelisted)", async () => {
      await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande({ role: "admin" }))
        .expect(400);
    });

    it("ne plante pas sur une charge XSS dans le message (201, échappé en mail)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande({ message: "<img src=x onerror=alert(1)>" }))
        .expect(201);
      expect(res.body.message).toContain("<img");
      // L'email échappe le HTML utilisateur.
      const mail = outbox(app).find((m) => m.audience === "hymea");
      expect(mail?.html).not.toContain("<img src=x onerror");
    });

    it("est public (aucune authentification requise)", async () => {
      await request(app.getHttpServer()).post("/api/rendez-vous").send(validDemande()).expect(201);
    });
  });

  // ─────────────────────── GET /api/rendez-vous (admin, #15) ────────────────

  describe("GET /api/rendez-vous (liste admin)", () => {
    async function createDemande(overrides: Record<string, unknown> = {}): Promise<string> {
      const res = await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande(overrides))
        .expect(201);
      return res.body.id as string;
    }

    it("liste paginée avec client + prestation imbriqués", async () => {
      await createDemande();
      const res = await request(app.getHttpServer())
        .get("/api/rendez-vous")
        .set(...bearer(token))
        .expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].client.email).toBe("david.cohen@example.com");
      expect(res.body.items[0].prestation.id).toBe(prestationParticulier);
      expect(res.body.items[0].intervenant).toBeNull();
    });

    it("filtre par statut", async () => {
      await createDemande();
      const confirmed = await createDemande({ email: "b@example.com" });
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${confirmed}/statut`)
        .set(...bearer(token))
        .send({ statut: "CONFIRME" })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get("/api/rendez-vous?statut=CONFIRME")
        .set(...bearer(token))
        .expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].statut).toBe("CONFIRME");
    });

    it("filtre par typeClient", async () => {
      await createDemande();
      await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send({
          nom: "Ent",
          prenom: "Reprise",
          email: "ent@example.com",
          telephone: "+972500000009",
          typeClient: "entreprise",
          prestationId: prestationEntreprise,
          consentement: true,
        })
        .expect(201);
      const res = await request(app.getHttpServer())
        .get("/api/rendez-vous?typeClient=entreprise")
        .set(...bearer(token))
        .expect(200);
      expect(res.body.total).toBe(1);
    });

    it("filtre par prestationId", async () => {
      await createDemande();
      const res = await request(app.getHttpServer())
        .get(`/api/rendez-vous?prestationId=${prestationParticulier}`)
        .set(...bearer(token))
        .expect(200);
      expect(res.body.total).toBe(1);
    });

    it("filtre par plage de dates", async () => {
      await createDemande(); // debut 2026-07-01
      const inside = await request(app.getHttpServer())
        .get("/api/rendez-vous?dateFrom=2026-06-30T00:00:00.000Z&dateTo=2026-07-02T00:00:00.000Z")
        .set(...bearer(token))
        .expect(200);
      expect(inside.body.total).toBe(1);
      const outside = await request(app.getHttpServer())
        .get("/api/rendez-vous?dateFrom=2026-08-01T00:00:00.000Z")
        .set(...bearer(token))
        .expect(200);
      expect(outside.body.total).toBe(0);
    });

    it("recherche par nom/email du client", async () => {
      await createDemande();
      const res = await request(app.getHttpServer())
        .get("/api/rendez-vous?search=cohen")
        .set(...bearer(token))
        .expect(200);
      expect(res.body.total).toBe(1);
    });

    it("rejette un statut de filtre invalide (400)", async () => {
      await request(app.getHttpServer())
        .get("/api/rendez-vous?statut=INCONNU")
        .set(...bearer(token))
        .expect(400);
    });

    it("rejette sans authentification (401)", async () => {
      await request(app.getHttpServer()).get("/api/rendez-vous").expect(401);
    });
  });

  // ──────────────────── GET /api/rendez-vous/:id (admin) ────────────────────

  describe("GET /api/rendez-vous/:id (détail)", () => {
    it("renvoie le détail complet (200)", async () => {
      const created = await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande())
        .expect(201);
      const res = await request(app.getHttpServer())
        .get(`/api/rendez-vous/${created.body.id}`)
        .set(...bearer(token))
        .expect(200);
      expect(res.body.id).toBe(created.body.id);
      expect(res.body.client).toBeDefined();
      expect(res.body.prestation).toBeDefined();
    });

    it("renvoie 404 pour un id inexistant", async () => {
      await request(app.getHttpServer())
        .get(`/api/rendez-vous/${UUID_ZERO}`)
        .set(...bearer(token))
        .expect(404);
    });

    it("renvoie 400 pour un id non-UUID", async () => {
      await request(app.getHttpServer())
        .get("/api/rendez-vous/nope")
        .set(...bearer(token))
        .expect(400);
    });

    it("rejette sans authentification (401)", async () => {
      await request(app.getHttpServer()).get(`/api/rendez-vous/${UUID_ZERO}`).expect(401);
    });
  });

  // ──────────────── PATCH /api/rendez-vous/:id/statut (admin) ───────────────

  describe("PATCH /api/rendez-vous/:id/statut (transitions)", () => {
    async function newRdv(): Promise<string> {
      const res = await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande())
        .expect(201);
      clearOutbox(app);
      return res.body.id as string;
    }

    it("NOUVEAU → CONFIRME (200) déclenche l'email de confirmation", async () => {
      const id = await newRdv();
      const res = await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${id}/statut`)
        .set(...bearer(token))
        .send({ statut: "CONFIRME" })
        .expect(200);
      expect(res.body.statut).toBe("CONFIRME");
      const client = outbox(app).find((m) => m.audience === "client");
      expect(client?.type).toBe("confirmation");
    });

    it("NOUVEAU → ANNULE (200) déclenche l'email d'annulation", async () => {
      const id = await newRdv();
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${id}/statut`)
        .set(...bearer(token))
        .send({ statut: "ANNULE" })
        .expect(200);
      expect(outbox(app).find((m) => m.audience === "client")?.type).toBe("annulation");
    });

    it("CONFIRME → REALISE (200, terminal, sans email client)", async () => {
      const id = await newRdv();
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${id}/statut`)
        .set(...bearer(token))
        .send({ statut: "CONFIRME" })
        .expect(200);
      clearOutbox(app);
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${id}/statut`)
        .set(...bearer(token))
        .send({ statut: "REALISE" })
        .expect(200);
      expect(outbox(app).find((m) => m.audience === "client")).toBeUndefined();
    });

    it("rejette une transition interdite NOUVEAU → REALISE (409)", async () => {
      const id = await newRdv();
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${id}/statut`)
        .set(...bearer(token))
        .send({ statut: "REALISE" })
        .expect(409);
    });

    it("rejette une transition depuis un statut terminal ANNULE (409)", async () => {
      const id = await newRdv();
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${id}/statut`)
        .set(...bearer(token))
        .send({ statut: "ANNULE" })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${id}/statut`)
        .set(...bearer(token))
        .send({ statut: "CONFIRME" })
        .expect(409);
    });

    it("rejette un passage vers le même statut (409)", async () => {
      const id = await newRdv();
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${id}/statut`)
        .set(...bearer(token))
        .send({ statut: "NOUVEAU" })
        .expect(409);
    });

    it("rejette un statut hors enum (400)", async () => {
      const id = await newRdv();
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${id}/statut`)
        .set(...bearer(token))
        .send({ statut: "WHATEVER" })
        .expect(400);
    });

    it("renvoie 404 pour un id inexistant", async () => {
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${UUID_ZERO}/statut`)
        .set(...bearer(token))
        .send({ statut: "CONFIRME" })
        .expect(404);
    });

    it("rejette sans authentification (401)", async () => {
      const id = await newRdv();
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${id}/statut`)
        .send({ statut: "CONFIRME" })
        .expect(401);
    });
  });

  // ────────────── PATCH /api/rendez-vous/:id/intervenant (admin) ────────────

  describe("PATCH /api/rendez-vous/:id/intervenant (attribution)", () => {
    let rdvId: string;
    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande())
        .expect(201);
      rdvId = res.body.id;
    });

    it("attribue un intervenant (200)", async () => {
      const intervenantId = await seedIntervenant(db);
      const res = await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${rdvId}/intervenant`)
        .set(...bearer(token))
        .send({ intervenantId })
        .expect(200);
      expect(res.body.intervenant.id).toBe(intervenantId);
      expect(res.body.intervenantId).toBe(intervenantId);
    });

    it("retire l'attribution avec null (200)", async () => {
      const intervenantId = await seedIntervenant(db);
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${rdvId}/intervenant`)
        .set(...bearer(token))
        .send({ intervenantId })
        .expect(200);
      const res = await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${rdvId}/intervenant`)
        .set(...bearer(token))
        .send({ intervenantId: null })
        .expect(200);
      expect(res.body.intervenant).toBeNull();
    });

    it("renvoie 404 pour un intervenant inexistant", async () => {
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${rdvId}/intervenant`)
        .set(...bearer(token))
        .send({ intervenantId: UUID_ZERO })
        .expect(404);
    });

    it("rejette un intervenantId non-UUID (400)", async () => {
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${rdvId}/intervenant`)
        .set(...bearer(token))
        .send({ intervenantId: "xxx" })
        .expect(400);
    });

    it("renvoie 404 pour un RDV inexistant", async () => {
      const intervenantId = await seedIntervenant(db);
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${UUID_ZERO}/intervenant`)
        .set(...bearer(token))
        .send({ intervenantId })
        .expect(404);
    });

    it("rejette sans authentification (401)", async () => {
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${rdvId}/intervenant`)
        .send({ intervenantId: null })
        .expect(401);
    });
  });

  // ──────────── PATCH /api/rendez-vous/:id/replanification (admin) ──────────

  describe("PATCH /api/rendez-vous/:id/replanification", () => {
    let rdvId: string;
    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/rendez-vous")
        .send(validDemande())
        .expect(201);
      rdvId = res.body.id;
      clearOutbox(app);
    });

    it("replanifie (200) → statut REPLANIFIE, nouveau créneau, email", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${rdvId}/replanification`)
        .set(...bearer(token))
        .send({ debut: "2026-07-05T10:00:00.000Z" })
        .expect(200);
      expect(res.body.statut).toBe("REPLANIFIE");
      expect(res.body.debut).toBe("2026-07-05T10:00:00.000Z");
      // fin = debut + 90 min (durée prestation).
      expect(res.body.fin).toBe("2026-07-05T11:30:00.000Z");
      expect(outbox(app).find((m) => m.audience === "client")?.type).toBe("replanification");
    });

    it("rejette un debut non ISO (400)", async () => {
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${rdvId}/replanification`)
        .set(...bearer(token))
        .send({ debut: "demain" })
        .expect(400);
    });

    it("refuse de replanifier un RDV annulé (409)", async () => {
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${rdvId}/statut`)
        .set(...bearer(token))
        .send({ statut: "ANNULE" })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${rdvId}/replanification`)
        .set(...bearer(token))
        .send({ debut: "2026-07-05T10:00:00.000Z" })
        .expect(409);
    });

    it("renvoie 404 pour un id inexistant", async () => {
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${UUID_ZERO}/replanification`)
        .set(...bearer(token))
        .send({ debut: "2026-07-05T10:00:00.000Z" })
        .expect(404);
    });

    it("rejette sans authentification (401)", async () => {
      await request(app.getHttpServer())
        .patch(`/api/rendez-vous/${rdvId}/replanification`)
        .send({ debut: "2026-07-05T10:00:00.000Z" })
        .expect(401);
    });
  });
});
