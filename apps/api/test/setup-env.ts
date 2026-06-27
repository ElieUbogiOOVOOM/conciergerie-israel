/**
 * Valeurs d'environnement par défaut pour la suite de tests.
 * En CI, DATABASE_URL est fournie par le service postgres du workflow.
 * En local, on retombe sur la base docker-compose.
 */
process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://hymea:hymea@localhost:5432/hymea";
process.env.API_PORT ??= "4000";

// Secrets JWT obligatoires (≥ 32 caractères) — valeurs de test distinctes.
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-0123456789-abcdef-xyz";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-0123456789-abcdef-xyz";

// Rate-limit neutralisé par défaut (les suites POST ne doivent pas se gêner).
// La suite dédiée rdv-throttle.e2e-spec.ts abaisse cette limite pour tester le 429.
process.env.RDV_THROTTLE_LIMIT ??= "1000";
process.env.RDV_THROTTLE_TTL ??= "60";
// Throttlers global + auth neutralisés en test (limites très hautes).
process.env.API_THROTTLE_LIMIT ??= "1000000";
process.env.AUTH_THROTTLE_LIMIT ??= "1000000";
// Pas d'envoi réel en test : MailService reste en mode no-op (boîte d'envoi en mémoire).
delete process.env.RESEND_API_KEY;
delete process.env.TURNSTILE_SECRET;
// Crons neutralisés en test : les suites déclenchent les services à la main
// (sendDueReminders / purgeExpiredClients) pour des assertions déterministes.
process.env.REMINDERS_ENABLED ??= "false";
process.env.RGPD_PURGE_ENABLED ??= "false";
