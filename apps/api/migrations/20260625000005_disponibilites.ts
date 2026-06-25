import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Règles d'ouverture hebdomadaires.
  await db.schema
    .createTable("regles_disponibilite")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("jour", "integer", (col) => col.notNull())
    .addColumn("debut", "text", (col) => col.notNull())
    .addColumn("fin", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint("regles_jour_check", sql`jour between 0 and 6`)
    .execute();

  // Exceptions / blocages ponctuels.
  await db.schema
    .createTable("exceptions_disponibilite")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("debut", "timestamptz", (col) => col.notNull())
    .addColumn("fin", "timestamptz", (col) => col.notNull())
    .addColumn("bloque", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("motif", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint("exceptions_plage_check", sql`fin > debut`)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("exceptions_disponibilite").execute();
  await db.schema.dropTable("regles_disponibilite").execute();
}
