import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("prestations")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("libelle", "jsonb", (col) => col.notNull())
    .addColumn("description", "jsonb")
    .addColumn("cible", "text", (col) => col.notNull())
    .addColumn("duree_minutes", "integer", (col) => col.notNull())
    .addColumn("actif", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint(
      "prestations_cible_check",
      sql`cible in ('mall', 'entreprise', 'particulier')`,
    )
    .addCheckConstraint("prestations_duree_positive", sql`duree_minutes > 0`)
    .execute();

  await db.schema.createIndex("prestations_cible_idx").on("prestations").column("cible").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("prestations").execute();
}
