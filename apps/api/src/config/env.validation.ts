import { z } from "zod";

/** Schéma de validation des variables d'environnement de l'API. */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),

  // --- Auth (issue #9) ---
  /** Secret de signature des access tokens (JWT court). */
  JWT_ACCESS_SECRET: z.string().min(16).default("dev-access-secret-change-me-please"),
  /** Secret distinct pour signer/identifier les refresh tokens. */
  JWT_REFRESH_SECRET: z.string().min(16).default("dev-refresh-secret-change-me-please"),
  /** Durée de vie de l'access token (format `jsonwebtoken`, ex. "15m"). */
  JWT_ACCESS_TTL: z.string().default("15m"),
  /** Durée de vie du refresh token, en jours. */
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
  /** Pose le cookie refresh avec l'attribut `Secure` (désactiver en HTTP local). */
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  // --- Disponibilités & créneaux (issue #12) ---
  /** Fuseau horaire métier pour le calcul des créneaux (IANA). */
  BUSINESS_TZ: z.string().default("Asia/Jerusalem"),
  /** Durée d'un créneau (minutes) quand aucune prestation n'est fournie. */
  DEFAULT_SLOT_MINUTES: z.coerce.number().int().positive().default(60),
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
