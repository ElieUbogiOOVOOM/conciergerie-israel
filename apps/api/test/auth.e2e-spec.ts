import { type INestApplication } from "@nestjs/common";
import request from "supertest";

import type { KyselyDB } from "../src/database/database.module";
import { bearer, createTestApp, login, seedAdmin, truncateAll } from "./helpers";

const EMAIL = "admin@hymea.com";
const PASSWORD = "S3cr3t-pass!";

/** Extrait la valeur du cookie refresh depuis un en-tête Set-Cookie. */
function refreshValue(cookies: string[]): string {
  const cookie = cookies.find((c) => c.startsWith("hymea_refresh="));
  return cookie?.split(";")[0]?.split("=")[1] ?? "";
}

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let db: KyselyDB;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAll(db);
    await seedAdmin(db, EMAIL, PASSWORD);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/auth/login", () => {
    it("renvoie un access token et pose le cookie refresh httpOnly", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: EMAIL, password: PASSWORD })
        .expect(200);

      expect(typeof res.body.accessToken).toBe("string");
      const setCookie = res.headers["set-cookie"] as unknown as string[];
      const cookie = setCookie.find((c) => c.startsWith("hymea_refresh="));
      expect(cookie).toBeDefined();
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("Path=/api/auth");
    });

    it("accepte un email avec une casse différente", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: EMAIL.toUpperCase(), password: PASSWORD })
        .expect(200);
    });

    it("rejette un mauvais mot de passe (401)", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: EMAIL, password: "mauvais-mot-de-passe" })
        .expect(401);
    });

    it("rejette un email inconnu (401)", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "inconnu@hymea.com", password: PASSWORD })
        .expect(401);
    });

    it("valide le format de l'email (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "pas-un-email", password: PASSWORD })
        .expect(400);
    });

    it("rejette un mot de passe trop court (400)", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: EMAIL, password: "court" })
        .expect(400);
    });

    it("rejette un champ inattendu (400, forbidNonWhitelisted)", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: EMAIL, password: PASSWORD, role: "superadmin" })
        .expect(400);
    });
  });

  describe("POST /api/auth/refresh (rotation)", () => {
    it("émet un nouvel access token et un nouveau cookie", async () => {
      const { cookies } = await login(app, EMAIL, PASSWORD);
      const res = await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .set("Cookie", cookies)
        .expect(200);
      expect(typeof res.body.accessToken).toBe("string");
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("révoque l'ancien refresh token après rotation", async () => {
      const { cookies } = await login(app, EMAIL, PASSWORD);
      const first = refreshValue(cookies);

      await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .set("Cookie", cookies)
        .expect(200);

      // Réutiliser l'ancien token (déjà tourné) doit échouer.
      await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .set("Cookie", [`hymea_refresh=${first}`])
        .expect(401);
    });

    it("rejette une requête sans cookie (401)", async () => {
      await request(app.getHttpServer()).post("/api/auth/refresh").expect(401);
    });

    it("rejette un token inconnu (401)", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .set("Cookie", ["hymea_refresh=00000000-0000-0000-0000-000000000000"])
        .expect(401);
    });

    it("rejette un refresh token expiré (401)", async () => {
      const { cookies } = await login(app, EMAIL, PASSWORD);
      // Force l'expiration en base.
      await db
        .updateTable("refresh_tokens")
        .set({ expires_at: new Date(Date.now() - 1000) })
        .execute();
      await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .set("Cookie", cookies)
        .expect(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("révoque le refresh token et efface le cookie (204)", async () => {
      const { cookies } = await login(app, EMAIL, PASSWORD);
      await request(app.getHttpServer())
        .post("/api/auth/logout")
        .set("Cookie", cookies)
        .expect(204);

      // Le token révoqué ne permet plus de refresh.
      await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .set("Cookie", cookies)
        .expect(401);
    });

    it("est idempotent sans cookie (204)", async () => {
      await request(app.getHttpServer()).post("/api/auth/logout").expect(204);
    });
  });

  describe("Guard JWT", () => {
    it("rejette une route protégée sans token (401)", async () => {
      await request(app.getHttpServer()).get("/api/prestations").expect(401);
    });

    it("rejette un access token invalide (401)", async () => {
      await request(app.getHttpServer())
        .get("/api/prestations")
        .set(...bearer("token.bidon.invalide"))
        .expect(401);
    });

    it("autorise une route protégée avec un access token valide (200)", async () => {
      const { accessToken } = await login(app, EMAIL, PASSWORD);
      await request(app.getHttpServer())
        .get("/api/prestations")
        .set(...bearer(accessToken))
        .expect(200);
    });

    it("rejette si le compte a été supprimé après émission du token (401)", async () => {
      const { accessToken } = await login(app, EMAIL, PASSWORD);
      await db.deleteFrom("admins").execute();
      await request(app.getHttpServer())
        .get("/api/prestations")
        .set(...bearer(accessToken))
        .expect(401);
    });
  });

  describe("Seed admin", () => {
    it("est idempotent et met à jour le mot de passe", async () => {
      // Re-seed avec un nouveau mot de passe.
      await seedAdmin(db, EMAIL, "Nouveau-pass!");
      const count = await db
        .selectFrom("admins")
        .select(db.fn.countAll<string>().as("n"))
        .where("email", "=", EMAIL)
        .executeTakeFirstOrThrow();
      expect(Number(count.n)).toBe(1);

      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: EMAIL, password: "Nouveau-pass!" })
        .expect(200);
    });
  });
});
