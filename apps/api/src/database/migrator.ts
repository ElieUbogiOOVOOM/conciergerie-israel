import { promises as fs } from "node:fs";
import * as path from "node:path";

import { FileMigrationProvider, type Kysely, Migrator } from "kysely";

import type { Database } from "./database.types";

/** Dossier des migrations, résolu identiquement en ts-node (src/) et compilé (dist/). */
export const MIGRATIONS_FOLDER = path.join(__dirname, "..", "..", "migrations");

export function createMigrator(db: Kysely<Database>): Migrator {
  return new Migrator({
    db,
    provider: new FileMigrationProvider({ fs, path, migrationFolder: MIGRATIONS_FOLDER }),
  });
}
