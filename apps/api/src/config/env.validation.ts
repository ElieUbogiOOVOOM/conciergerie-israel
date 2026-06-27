import { z } from "zod";

/** Schéma de validation des variables d'environnement de l'API. */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().url(),

    // --- Auth (issue #9) ---
    /** Secret de signature des access tokens (JWT court). Obligatoire, ≥ 32 caractères. */
    JWT_ACCESS_SECRET: z.string().min(32),
    /** Secret distinct pour signer/identifier les refresh tokens. Obligatoire, ≥ 32 caractères. */
    JWT_REFRESH_SECRET: z.string().min(32),
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

    // --- RDV public : anti-spam (issue #13) ---
    /** Secret Cloudflare Turnstile. Si absent, la vérification est désactivée (dev/staging). */
    TURNSTILE_SECRET: z.string().optional(),
    /** Endpoint de vérification Turnstile. */
    TURNSTILE_VERIFY_URL: z
      .string()
      .url()
      .default("https://challenges.cloudflare.com/turnstile/v0/siteverify"),
    /** Fenêtre du rate-limit IP sur la demande publique (secondes). */
    RDV_THROTTLE_TTL: z.coerce.number().int().positive().default(60),
    /** Nombre max de demandes par IP sur la fenêtre. */
    RDV_THROTTLE_LIMIT: z.coerce.number().int().positive().default(5),
    /** Rate-limit global par défaut (toutes routes) : fenêtre en secondes. */
    API_THROTTLE_TTL: z.coerce.number().int().positive().default(60),
    /** Rate-limit global par défaut (toutes routes) : nombre de requêtes par IP/fenêtre. */
    API_THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
    /** Anti-brute-force login/refresh : fenêtre en secondes. */
    AUTH_THROTTLE_TTL: z.coerce.number().int().positive().default(900),
    /** Anti-brute-force login/refresh : nombre de tentatives par IP/fenêtre. */
    AUTH_THROTTLE_LIMIT: z.coerce.number().int().positive().default(10),
    /** Version du texte de consentement RGPD horodaté sur le RDV. */
    CONSENT_VERSION: z.string().default("2026-06-v1"),

    // --- Emails transactionnels (issue #16) ---
    /** Clé API Resend. Si absente, les emails sont journalisés (no-op) au lieu d'être envoyés. */
    RESEND_API_KEY: z.string().optional(),
    /** Expéditeur des emails (format `Nom <adresse>`). */
    MAIL_FROM: z.string().default("HYMEA <no-reply@hymea.com>"),
    /** Adresse de notification interne HYMEA (alertes RDV). */
    HYMEA_NOTIFICATION_EMAIL: z.string().email().default("contact@hymea.com"),
    /** URL publique de la vitrine (liens dans les emails). */
    PUBLIC_SITE_URL: z.string().url().default("https://hymea.com"),

    // --- Rappels automatiques (issue #17) ---
    /** Anticipation du rappel avant le créneau, en heures. */
    REMINDER_LEAD_HOURS: z.coerce.number().int().positive().default(24),
    /** Active le cron de rappels (désactivé en test pour piloter l'envoi à la main). */
    REMINDERS_ENABLED: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),

    // --- Rétention RGPD (issue #18) ---
    /** Durée de conservation des données après le dernier RDV, en mois. */
    RGPD_RETENTION_MONTHS: z.coerce.number().int().positive().default(12),
    /** Active le cron de purge/anonymisation RGPD (désactivé en test). */
    RGPD_PURGE_ENABLED: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),

    // --- Flux iCal (issue #20) ---
    /** URL de base publique de l'API (construction des URLs .ics côté admin). */
    PUBLIC_API_URL: z.string().url().default("https://hymea.com/api"),

    // --- Back-office (issues #32/#33) ---
    /**
     * Origines autorisées en CORS (liste séparée par des virgules) pour le back-office
     * et la vitrine en développement (ports distincts de l'API). Laisser vide en prod :
     * admin/web/api y sont same-origin via le reverse-proxy, la CORS y est inutile.
     */
    CORS_ORIGINS: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") {
      return;
    }
    // En production : interdire tout secret faible/exemple connu et forcer les protections.
    const weak = /change-me|dev-(access|refresh)-secret|^hymea$|secret|example|password/i;
    const guardSecret = (key: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET"): void => {
      if (weak.test(env[key])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} utilise une valeur faible/par défaut interdite en production.`,
        });
      }
    };
    guardSecret("JWT_ACCESS_SECRET");
    guardSecret("JWT_REFRESH_SECRET");
    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_REFRESH_SECRET"],
        message: "JWT_ACCESS_SECRET et JWT_REFRESH_SECRET doivent être distincts.",
      });
    }
    if (!env.COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["COOKIE_SECURE"],
        message: "COOKIE_SECURE doit valoir true en production.",
      });
    }
    if (!env.TURNSTILE_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TURNSTILE_SECRET"],
        message: "TURNSTILE_SECRET est obligatoire en production (anti-spam du formulaire public).",
      });
    }
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
