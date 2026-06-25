import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("refresh_tokens")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("admin_id", "uuid", (col) =>
      col.notNull().references("admins.id").onDelete("cascade"),
    )
    // Hash argon2 du refresh token brut (le token en clair ne vit que dans le cookie client).
    .addColumn("token_hash", "text", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    // Renseignée lors d'une rotation (refresh) ou d'un logout : un token révoqué est rejeté.
    .addColumn("revoked_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("refresh_tokens_admin_id_idx")
    .on("refresh_tokens")
    .column("admin_id")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("refresh_tokens").execute();
}
