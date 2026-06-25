import { type INestApplication } from "@nestjs/common";
import request from "supertest";

import type { KyselyDB } from "../src/database/database.module";
import {
  bearer,
  createTestApp,
  login,
  seedAdmin,
  seedClient,
  seedIntervenant,
  seedPrestation,
  seedRendezVous,
  truncateAll,
} from "./helpers";

const EMAIL = "admin@hymea.com";
const PASSWORD = "S3cr3t-pass!";

describe("RDV CSV export (e2e, #19)", () => {
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

  async function seedOne(
    overrides: Partial<Parameters<typeof seedRendezVous>[1]> = {},
    clientOverrides: Parameters<typeof seedClient>[1] = {},
  ): Promise<void> {
    const clientId = await seedClient(db, {
      email: `c${Math.random()}@example.com`,
      ...clientOverrides,
    });
    await seedRendezVous(db, {
      clientId,
      prestationId,
      statut: "CONFIRME",
      debut: new Date("2026-07-01T09:00:00.000Z"),
      fin: new Date("2026-07-01T10:00:00.000Z"),
      adresse: "12 rue Herzl",
      ...overrides,
    });
  }

  describe("Authentification", () => {
    it("rejette sans token (401)", async () => {
      await request(app.getHttpServer()).get("/api/rendez-vous/export.csv").expect(401);
    });

    it("rejette un token invalide (401)", async () => {
      await request(app.getHttpServer())
        .get("/api/rendez-vous/export.csv")
        .set("Authorization", "Bearer nope")
        .expect(401);
    });
  });

  describe("Happy path", () => {
    it("renvoie un CSV avec en-tête, BOM et le bon Content-Type", async () => {
      await seedOne();
      const res = await request(app.getHttpServer())
        .get("/api/rendez-vous/export.csv")
        .set(...bearer(token))
        .expect(200);
      expect(res.headers["content-type"]).toContain("text/csv");
      expect(res.headers["content-disposition"]).toContain("rendez-vous.csv");
      expect(res.text.charCodeAt(0)).toBe(0xfeff); // BOM UTF-8
      const lines = res.text
        .replace(/^\uFEFF/, "")
        .trim()
        .split("\r\n");
      expect(lines[0]).toBe(
        "statut,type_client,prestation,client_nom,client_prenom,client_email,telephone,debut,fin,adresse,intervenant",
      );
      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain("CONFIRME");
      expect(lines[1]).toContain("Nettoyage premium");
    });

    it("inclut le nom de l'intervenant attribué", async () => {
      const intervenantId = await seedIntervenant(db, "Levi");
      const clientId = await seedClient(db, { email: "x@example.com" });
      await seedRendezVous(db, {
        clientId,
        prestationId,
        statut: "CONFIRME",
        debut: new Date("2026-07-01T09:00:00.000Z"),
        fin: new Date("2026-07-01T10:00:00.000Z"),
      });
      await db
        .updateTable("rendez_vous")
        .set({ intervenant_id: intervenantId })
        .where("client_id", "=", clientId)
        .execute();
      const res = await request(app.getHttpServer())
        .get("/api/rendez-vous/export.csv")
        .set(...bearer(token))
        .expect(200);
      expect(res.text).toContain("Levi");
    });

    it("renvoie seulement l'en-tête quand aucun RDV", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/rendez-vous/export.csv")
        .set(...bearer(token))
        .expect(200);
      const lines = res.text
        .replace(/^\uFEFF/, "")
        .trim()
        .split("\r\n");
      expect(lines).toHaveLength(1);
    });
  });

  describe("Filtres (cohérence avec la liste)", () => {
    it("filtre par statut", async () => {
      await seedOne({ statut: "CONFIRME" });
      await seedOne({ statut: "ANNULE" });
      const res = await request(app.getHttpServer())
        .get("/api/rendez-vous/export.csv?statut=ANNULE")
        .set(...bearer(token))
        .expect(200);
      const lines = res.text
        .replace(/^\uFEFF/, "")
        .trim()
        .split("\r\n");
      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain("ANNULE");
    });

    it("filtre par typeClient", async () => {
      await seedOne({ typeClient: "particulier" });
      await seedOne({ typeClient: "entreprise", debut: null, fin: null });
      const res = await request(app.getHttpServer())
        .get("/api/rendez-vous/export.csv?typeClient=entreprise")
        .set(...bearer(token))
        .expect(200);
      expect(
        res.text
          .replace(/^\uFEFF/, "")
          .trim()
          .split("\r\n"),
      ).toHaveLength(2);
    });

    it("filtre par prestationId", async () => {
      await seedOne();
      const other = await seedPrestation(db, { libelle: "Autre" });
      const c = await seedClient(db, { email: "z@example.com" });
      await seedRendezVous(db, { clientId: c, prestationId: other, statut: "CONFIRME" });
      const res = await request(app.getHttpServer())
        .get(`/api/rendez-vous/export.csv?prestationId=${prestationId}`)
        .set(...bearer(token))
        .expect(200);
      expect(
        res.text
          .replace(/^\uFEFF/, "")
          .trim()
          .split("\r\n"),
      ).toHaveLength(2);
    });

    it("filtre par plage de dates", async () => {
      await seedOne({ debut: new Date("2026-07-01T09:00:00.000Z") });
      const res = await request(app.getHttpServer())
        .get("/api/rendez-vous/export.csv?dateFrom=2026-08-01T00:00:00.000Z")
        .set(...bearer(token))
        .expect(200);
      expect(
        res.text
          .replace(/^\uFEFF/, "")
          .trim()
          .split("\r\n"),
      ).toHaveLength(1); // en-tête seul
    });

    it("recherche par nom du client", async () => {
      await seedOne({}, { nom: "Mizrahi", email: "m@example.com" });
      await seedOne({}, { nom: "Cohen", email: "co@example.com" });
      const res = await request(app.getHttpServer())
        .get("/api/rendez-vous/export.csv?search=mizrahi")
        .set(...bearer(token))
        .expect(200);
      const lines = res.text
        .replace(/^\uFEFF/, "")
        .trim()
        .split("\r\n");
      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain("Mizrahi");
    });

    it("rejette un filtre statut invalide (400)", async () => {
      await request(app.getHttpServer())
        .get("/api/rendez-vous/export.csv?statut=INCONNU")
        .set(...bearer(token))
        .expect(400);
    });
  });

  describe("Échappement CSV (RFC 4180)", () => {
    it("entoure et double les guillemets pour les champs spéciaux", async () => {
      await seedOne({ adresse: 'Rue "des, fleurs"' }, { nom: "Le, Comte" });
      const res = await request(app.getHttpServer())
        .get("/api/rendez-vous/export.csv")
        .set(...bearer(token))
        .expect(200);
      expect(res.text).toContain('"Le, Comte"');
      expect(res.text).toContain('"Rue ""des, fleurs"""');
    });
  });
});
