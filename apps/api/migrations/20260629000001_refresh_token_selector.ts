import { type Kysely, sql } from "kysely";

/**
 * Durcissement auth : ajoute un `selector` public indexé aux refresh tokens
 * (token brut = `<selector>.<secret>`, seul le secret est hashé). Permet un lookup
 * O(1) au refresh/logout (fin du scan O(n) + amplification DoS argon2) et la
 * détection de réutilisation. Les sessions antérieures (sans selector) sont
 * invalidées de fait : les admins se reconnectent.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // Purge des anciens tokens (sans selector) : ils ne pourront plus être validés.
  await sql`delete from refresh_tokens`.execute(db);

  await db.schema
    .alterTable("refresh_tokens")
    .addColumn("selector", "text", (col) => col.notNull().unique())
    .execute();

  // Index pour la purge périodique des tokens expirés.
  await db.schema
    .createIndex("refresh_tokens_expires_at_idx")
    .on("refresh_tokens")
    .column("expires_at")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("refresh_tokens_expires_at_idx").execute();
  await db.schema.alterTable("refresh_tokens").dropColumn("selector").execute();
}
