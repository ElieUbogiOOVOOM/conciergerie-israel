/**
 * Runner de migrations Kysely (CLI).
 *
 *   pnpm --filter @hymea/api migrate           # applique toutes les migrations
 *   pnpm --filter @hymea/api migrate:down      # annule la dernière migration
 *   pnpm --filter @hymea/api migrate:make <nom> # crée un fichier de migration
 *
 * Les fichiers de migration vivent dans apps/api/migrations/.
 */
import { promises as fs } from "node:fs";
import * as path from "node:path";

import { FileMigrationProvider, Kysely, Migrator, PostgresDialect } from "kysely";
import { Pool } from "pg";

import type { Database } from "./database.types";

const MIGRATIONS_FOLDER = path.join(__dirname, "..", "..", "migrations");

function createDb(): Kysely<Database> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL est requis pour exécuter les migrations.");
  }
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool: new Pool({ connectionString }) }),
  });
}

function createMigrator(db: Kysely<Database>): Migrator {
  return new Migrator({
    db,
    provider: new FileMigrationProvider({ fs, path, migrationFolder: MIGRATIONS_FOLDER }),
  });
}

async function migrateToLatest(): Promise<void> {
  const db = createDb();
  try {
    const { error, results } = await createMigrator(db).migrateToLatest();
    results?.forEach((it) => {
      if (it.status === "Success") console.log(`✓ migration "${it.migrationName}" appliquée`);
      else if (it.status === "Error") console.error(`✗ échec migration "${it.migrationName}"`);
    });
    if (error) throw error;
    if (!results?.length) console.log("Aucune migration à appliquer.");
  } finally {
    await db.destroy();
  }
}

async function migrateDown(): Promise<void> {
  const db = createDb();
  try {
    const { error, results } = await createMigrator(db).migrateDown();
    results?.forEach((it) => {
      if (it.status === "Success") console.log(`✓ migration "${it.migrationName}" annulée`);
      else if (it.status === "Error") console.error(`✗ échec rollback "${it.migrationName}"`);
    });
    if (error) throw error;
    if (!results?.length) console.log("Aucune migration à annuler.");
  } finally {
    await db.destroy();
  }
}

async function makeMigration(name: string): Promise<void> {
  if (!name) throw new Error("Nom de migration requis : migrate:make <nom>");
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const file = path.join(MIGRATIONS_FOLDER, `${stamp}_${slug}.ts`);
  const template = `import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // TODO: implémenter la migration
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // TODO: implémenter le rollback
}
`;
  await fs.mkdir(MIGRATIONS_FOLDER, { recursive: true });
  await fs.writeFile(file, template, "utf8");
  console.log(`Migration créée : ${path.relative(process.cwd(), file)}`);
}

async function main(): Promise<void> {
  const [command, arg] = process.argv.slice(2);
  switch (command) {
    case "up":
      await migrateToLatest();
      break;
    case "down":
      await migrateDown();
      break;
    case "make":
      await makeMigration(arg ?? "");
      break;
    default:
      throw new Error(`Commande inconnue "${command ?? ""}" (attendu: up | down | make)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
