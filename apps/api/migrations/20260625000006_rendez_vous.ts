import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("rendez_vous")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("client_id", "uuid", (col) =>
      col.notNull().references("clients.id").onDelete("cascade"),
    )
    .addColumn("prestation_id", "uuid", (col) =>
      col.notNull().references("prestations.id").onDelete("restrict"),
    )
    .addColumn("intervenant_id", "uuid", (col) =>
      col.references("intervenants.id").onDelete("set null"),
    )
    .addColumn("type_client", "text", (col) => col.notNull())
    .addColumn("statut", "text", (col) => col.notNull().defaultTo("NOUVEAU"))
    .addColumn("debut", "timestamptz")
    .addColumn("fin", "timestamptz")
    .addColumn("adresse", "text")
    .addColumn("message", "text")
    .addColumn("surface_m2", "integer")
    .addColumn("nombre_pieces", "integer")
    .addColumn("locale", "text", (col) => col.notNull().defaultTo("fr"))
    // Consentement RGPD horodaté (valeur + date + version du texte).
    .addColumn("consentement_accepte", "boolean", (col) => col.notNull())
    .addColumn("consentement_date", "timestamptz", (col) => col.notNull())
    .addColumn("consentement_version", "text", (col) => col.notNull())
    .addColumn("reminder_sent_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint(
      "rdv_type_client_check",
      sql`type_client in ('mall', 'entreprise', 'particulier')`,
    )
    .addCheckConstraint(
      "rdv_statut_check",
      sql`statut in ('NOUVEAU', 'CONFIRME', 'REPLANIFIE', 'REALISE', 'ANNULE')`,
    )
    .execute();

  await db.schema.createIndex("rdv_client_id_idx").on("rendez_vous").column("client_id").execute();
  await db.schema.createIndex("rdv_statut_idx").on("rendez_vous").column("statut").execute();
  await db.schema.createIndex("rdv_debut_idx").on("rendez_vous").column("debut").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("rendez_vous").execute();
}
