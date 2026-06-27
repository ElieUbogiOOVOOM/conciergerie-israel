import { type Kysely, sql } from "kysely";

/**
 * Durcissement flux iCal : le jeton porteur (qui donne accès aux PII des RDV) n'est
 * plus stocké en clair. On conserve un hash SHA-256 (`token_hash`) ; le jeton brut
 * n'est révélé qu'une seule fois, à la création. Ajoute aussi `expires_at` (optionnel).
 * Les jetons existants (en clair) sont purgés : ils seront recréés depuis le back-office.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`delete from calendar_feed_tokens`.execute(db);

  await db.schema
    .alterTable("calendar_feed_tokens")
    .addColumn("token_hash", "text", (col) => col.notNull().unique())
    .execute();

  await db.schema
    .alterTable("calendar_feed_tokens")
    .addColumn("expires_at", "timestamptz")
    .execute();

  await db.schema.alterTable("calendar_feed_tokens").dropColumn("token").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`delete from calendar_feed_tokens`.execute(db);
  await db.schema
    .alterTable("calendar_feed_tokens")
    .addColumn("token", "text", (col) => col.notNull().unique())
    .execute();
  await db.schema.alterTable("calendar_feed_tokens").dropColumn("expires_at").execute();
  await db.schema.alterTable("calendar_feed_tokens").dropColumn("token_hash").execute();
}
