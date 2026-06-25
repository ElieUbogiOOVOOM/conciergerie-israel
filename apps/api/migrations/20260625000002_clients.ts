import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("clients")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("nom", "text", (col) => col.notNull())
    .addColumn("prenom", "text", (col) => col.notNull())
    .addColumn("email", "text", (col) => col.notNull())
    .addColumn("telephone", "text", (col) => col.notNull())
    .addColumn("locale", "text", (col) => col.notNull().defaultTo("fr"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // Dédup : 1 fiche par email (insensible à la casse).
  await db.schema
    .createIndex("clients_email_unique")
    .on("clients")
    .expression(sql`lower(email)`)
    .unique()
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("clients").execute();
}
