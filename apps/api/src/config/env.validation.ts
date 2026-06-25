import { z } from "zod";

/** Schéma de validation des variables d'environnement de l'API. */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Valide et transforme l'env au démarrage (utilisé par @nestjs/config).
 * Lève une erreur explicite si une variable est manquante/invalide.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Configuration d'environnement invalide :\n${issues}`);
  }
  return result.data;
}
