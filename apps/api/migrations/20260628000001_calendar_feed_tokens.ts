import { type Kysely, sql } from "kysely";

/**
 * Jetons d'abonnement au flux iCal lecture seule (issue #20).
 * Plusieurs jetons nommés, révocables (revoked_at) ; le jeton porte l'URL .ics.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("calendar_feed_tokens")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("label", "text", (col) => col.notNull())
    .addColumn("token", "text", (col) => col.notNull().unique())
    .addColumn("revoked_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("calendar_feed_tokens").execute();
}
