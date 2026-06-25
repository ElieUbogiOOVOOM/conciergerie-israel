/**
 * Seed/CLI de création d'un compte admin (pas d'inscription publique — SPEC §3).
 *
 * Usage :
 *   pnpm --filter @hymea/api seed:admin --email admin@hymea.com --password 'S3cr3t!'
 * ou via l'environnement :
 *   SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… pnpm --filter @hymea/api seed:admin
 *
 * Idempotent : ré-exécuté pour un même email, met à jour le hash du mot de passe.
 */
import * as argon2 from "argon2";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import type { Database } from "./database.types";

/** Lit une option `--clé valeur` depuis argv. */
function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const email = (readFlag("email") ?? process.env.SEED_ADMIN_EMAIL)?.toLowerCase();
  const password = readFlag("password") ?? process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Email et mot de passe requis (--email / --password ou SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD).",
    );
  }
  if (password.length < 8) {
    throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL manquante.");
  }

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool: new Pool({ connectionString }) }),
  });

  try {
    const passwordHash = await argon2.hash(password);
    await db
      .insertInto("admins")
      .values({ email, password_hash: passwordHash })
      .onConflict((oc) =>
        oc.column("email").doUpdateSet({ password_hash: passwordHash, updated_at: new Date() }),
      )
      .execute();
    console.log(`✅ Admin « ${email} » créé/mis à jour.`);
  } finally {
    await db.destroy();
  }
}

main().catch((error: unknown) => {
  console.error("❌ Échec du seed admin :", error instanceof Error ? error.message : error);
  process.exit(1);
});
