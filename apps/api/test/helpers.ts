/**
 * Utilitaires partagés des suites e2e (vrai PostgreSQL).
 * Chaque suite migre le schéma (idempotent) puis repart d'une base vide.
 */
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import { sql } from "kysely";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { KYSELY, type KyselyDB } from "../src/database/database.module";
import { createMigrator } from "../src/database/migrator";
import { MailService, type SentEmail } from "../src/mail/mail.service";

type TypeClient = "mall" | "entreprise" | "particulier";

export interface TestContext {
  app: INestApplication;
  db: KyselyDB;
}

/** Démarre l'application Nest configurée comme en production + applique les migrations. */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  await app.init();

  const db = app.get<KyselyDB>(KYSELY);
  await createMigrator(db).migrateToLatest();
  return { app, db };
}

/** Vide toutes les tables métier (ordre géré par CASCADE). */
export async function truncateAll(db: KyselyDB): Promise<void> {
  await sql`
    truncate table
      refresh_tokens, rendez_vous, prestations,
      exceptions_disponibilite, regles_disponibilite,
      intervenants, equipes, clients, admins
    restart identity cascade
  `.execute(db);
}

/** Insère un admin (hash argon2). Retourne son email normalisé. */
export async function seedAdmin(db: KyselyDB, email: string, password: string): Promise<string> {
  const normalized = email.toLowerCase();
  const passwordHash = await argon2.hash(password);
  await db
    .insertInto("admins")
    .values({ email: normalized, password_hash: passwordHash })
    .onConflict((oc) => oc.column("email").doUpdateSet({ password_hash: passwordHash }))
    .execute();
  return normalized;
}

export interface LoginResult {
  accessToken: string;
  /** En-têtes Set-Cookie à réinjecter via `.set("Cookie", …)`. */
  cookies: string[];
}

/** Connecte un admin et renvoie son access token + le cookie refresh. */
export async function login(
  app: INestApplication,
  email: string,
  password: string,
): Promise<LoginResult> {
  const res = await request(app.getHttpServer())
    .post("/api/auth/login")
    .send({ email, password })
    .expect(200);
  const setCookie = res.headers["set-cookie"] as string | string[] | undefined;
  const cookies: string[] = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return { accessToken: res.body.accessToken as string, cookies };
}

/** Raccourci : en-tête Authorization Bearer. */
export function bearer(token: string): [string, string] {
  return ["Authorization", `Bearer ${token}`];
}

/** Insère une prestation directement en base. Retourne son id. */
export async function seedPrestation(
  db: KyselyDB,
  overrides: { cible?: TypeClient; dureeMinutes?: number; actif?: boolean; libelle?: string } = {},
): Promise<string> {
  const libelle = overrides.libelle ?? "Nettoyage premium";
  const row = await db
    .insertInto("prestations")
    .values({
      libelle: JSON.stringify({ fr: libelle, en: libelle, he: libelle }),
      description: null,
      cible: overrides.cible ?? "particulier",
      duree_minutes: overrides.dureeMinutes ?? 60,
      actif: overrides.actif ?? true,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

/** Insère un intervenant. Retourne son id. */
export async function seedIntervenant(db: KyselyDB, nom = "Levi"): Promise<string> {
  const row = await db
    .insertInto("intervenants")
    .values({ nom })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

/** Boîte d'envoi du MailService (emails déclenchés mais non envoyés en test). */
export function outbox(app: INestApplication): SentEmail[] {
  return app.get(MailService).outbox;
}

/** Vide la boîte d'envoi entre deux tests. */
export function clearOutbox(app: INestApplication): void {
  app.get(MailService).outbox.length = 0;
}
