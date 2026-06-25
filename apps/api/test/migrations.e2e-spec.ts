import { Kysely, NO_MIGRATIONS, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";

import type { Database } from "../src/database/database.types";
import { createMigrator } from "../src/database/migrator";

const EXPECTED_TABLES = [
  "admins",
  "clients",
  "prestations",
  "equipes",
  "intervenants",
  "regles_disponibilite",
  "exceptions_disponibilite",
  "rendez_vous",
];

async function listPublicTables(db: Kysely<Database>): Promise<string[]> {
  const rows = await sql<{ table_name: string }>`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  `.execute(db);
  return rows.rows.map((r) => r.table_name);
}

describe("Migrations Kysely", () => {
  let db: Kysely<Database>;

  beforeAll(() => {
    db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new Pool({ connectionString: process.env.DATABASE_URL }),
      }),
    });
  });

  afterAll(async () => {
    // Repart d'une base propre pour ne pas polluer les autres suites.
    await createMigrator(db).migrateTo(NO_MIGRATIONS);
    await db.destroy();
  });

  it("migrateToLatest crée tout le schéma sans erreur", async () => {
    const { error, results } = await createMigrator(db).migrateToLatest();
    expect(error).toBeUndefined();
    expect(results?.every((r) => r.status === "Success")).toBe(true);

    const tables = await listPublicTables(db);
    for (const t of EXPECTED_TABLES) {
      expect(tables).toContain(t);
    }
  });

  it("applique les contraintes clés (unicité email, FK, statut)", async () => {
    const consent = { accepte: true, date: new Date(), version: "v1" };

    // Unicité de l'email client (insensible à la casse).
    await db
      .insertInto("clients")
      .values({
        nom: "Levi",
        prenom: "Dana",
        email: "dana@example.com",
        telephone: "+972500000000",
        locale: "he",
      })
      .execute();
    await expect(
      db
        .insertInto("clients")
        .values({
          nom: "Levi",
          prenom: "Autre",
          email: "DANA@example.com",
          telephone: "+972511111111",
          locale: "fr",
        })
        .execute(),
    ).rejects.toThrow();

    // FK : un RDV référence un client/prestation existants.
    await expect(
      db
        .insertInto("rendez_vous")
        .values({
          client_id: "00000000-0000-0000-0000-000000000000",
          prestation_id: "00000000-0000-0000-0000-000000000000",
          type_client: "particulier",
          locale: "fr",
          consentement_accepte: consent.accepte,
          consentement_date: consent.date,
          consentement_version: consent.version,
        })
        .execute(),
    ).rejects.toThrow();

    // Check : statut hors énumération refusé.
    const prestation = await db
      .insertInto("prestations")
      .values({
        libelle: sql`'{"fr":"Ménage","en":"Cleaning","he":"ניקיון"}'::jsonb`,
        cible: "particulier",
        duree_minutes: 120,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    const client = await db
      .selectFrom("clients")
      .select("id")
      .where("email", "=", "dana@example.com")
      .executeTakeFirstOrThrow();

    await expect(
      db
        .insertInto("rendez_vous")
        .values({
          client_id: client.id,
          prestation_id: prestation.id,
          type_client: "particulier",
          statut: "INCONNU" as never,
          locale: "fr",
          consentement_accepte: true,
          consentement_date: new Date(),
          consentement_version: "v1",
        })
        .execute(),
    ).rejects.toThrow();
  });

  it("migrateTo(NO_MIGRATIONS) annule tout le schéma (rollback)", async () => {
    const { error } = await createMigrator(db).migrateTo(NO_MIGRATIONS);
    expect(error).toBeUndefined();

    const tables = await listPublicTables(db);
    for (const t of EXPECTED_TABLES) {
      expect(tables).not.toContain(t);
    }
  });
});
