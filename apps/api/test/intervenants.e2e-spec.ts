import { type INestApplication } from "@nestjs/common";
import request from "supertest";

import type { KyselyDB } from "../src/database/database.module";
import { bearer, createTestApp, login, seedAdmin, truncateAll } from "./helpers";

const EMAIL = "admin@hymea.com";
const PASSWORD = "S3cr3t-pass!";

/** Insère une équipe et renvoie son id. */
async function seedEquipe(db: KyselyDB, nom: string): Promise<string> {
  const row = await db
    .insertInto("equipes")
    .values({ nom })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

describe("Intervenants (e2e, #36)", () => {
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

  it("exige une authentification (401)", async () => {
    await request(app.getHttpServer()).get("/api/intervenants").expect(401);
  });

  it("liste les intervenants actifs triés par nom puis prénom (200)", async () => {
    const equipeId = await seedEquipe(db, "Équipe A");
    await db
      .insertInto("intervenants")
      .values([
        { nom: "Levy", prenom: "David", equipe_id: equipeId, actif: true },
        { nom: "Azoulay", prenom: "Sarah", equipe_id: null, actif: true },
        { nom: "Azoulay", prenom: "Avi", equipe_id: null, actif: true },
        { nom: "Inactif", prenom: "Test", equipe_id: null, actif: false },
      ])
      .execute();

    const res = await request(app.getHttpServer())
      .get("/api/intervenants")
      .set(...bearer(token))
      .expect(200);

    // Inactif exclu ; ordre nom puis prénom (Azoulay Avi, Azoulay Sarah, Levy).
    expect(res.body.map((i: { nom: string; prenom: string }) => `${i.nom} ${i.prenom}`)).toEqual([
      "Azoulay Avi",
      "Azoulay Sarah",
      "Levy David",
    ]);
    expect(res.body[0]).toMatchObject({ actif: true });
  });

  it("renvoie un tableau vide sans intervenant (200)", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/intervenants")
      .set(...bearer(token))
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it("liste les équipes triées par nom (200)", async () => {
    await seedEquipe(db, "Zenith");
    await seedEquipe(db, "Alpha");

    const res = await request(app.getHttpServer())
      .get("/api/intervenants/equipes")
      .set(...bearer(token))
      .expect(200);

    expect(res.body.map((e: { nom: string }) => e.nom)).toEqual(["Alpha", "Zenith"]);
  });
});
