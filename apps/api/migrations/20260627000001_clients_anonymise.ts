import { type Kysely } from "kysely";

/**
 * RGPD : horodatage d'anonymisation d'une fiche client.
 * null = fiche active ; non-null = PII effacées sur demande (issue #14).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("clients").addColumn("anonymized_at", "timestamptz").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("clients").dropColumn("anonymized_at").execute();
}
