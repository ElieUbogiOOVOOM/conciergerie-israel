/**
 * Suite dédiée au rate-limit IP de la demande publique (issue #13).
 * On abaisse la limite AVANT la création de l'app (lue par ThrottlerModule).
 */
process.env.RDV_THROTTLE_LIMIT = "3";
process.env.RDV_THROTTLE_TTL = "60";

import { type INestApplication } from "@nestjs/common";
import request from "supertest";

import type { KyselyDB } from "../src/database/database.module";
import { createTestApp, seedPrestation, truncateAll } from "./helpers";

describe("Rendez-vous — rate-limit (e2e)", () => {
  let app: INestApplication;
  let db: KyselyDB;
  let prestationId: string;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
    await truncateAll(db);
    prestationId = await seedPrestation(db, { cible: "particulier", dureeMinutes: 60 });
  });

  afterAll(async () => {
    await app.close();
  });

  function demande(): Record<string, unknown> {
    return {
      nom: "Cohen",
      prenom: "David",
      email: "david.cohen@example.com",
      telephone: "+972500000000",
      typeClient: "particulier",
      prestationId,
      debut: "2026-07-01T09:00:00.000Z",
      adresse: "12 rue Herzl",
      consentement: true,
    };
  }

  it("autorise jusqu'à la limite puis renvoie 429 (Too Many Requests)", async () => {
    // 3 requêtes autorisées (limite = 3).
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer()).post("/api/rendez-vous").send(demande()).expect(201);
    }
    // La 4ᵉ depuis la même IP est rejetée.
    await request(app.getHttpServer()).post("/api/rendez-vous").send(demande()).expect(429);
  });
});
