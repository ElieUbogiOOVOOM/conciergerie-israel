/**
 * Valeurs d'environnement par défaut pour la suite de tests.
 * En CI, DATABASE_URL est fournie par le service postgres du workflow.
 * En local, on retombe sur la base docker-compose.
 */
process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://hymea:hymea@localhost:5432/hymea";
process.env.API_PORT ??= "4000";

// Rate-limit neutralisé par défaut (les suites POST ne doivent pas se gêner).
// La suite dédiée rdv-throttle.e2e-spec.ts abaisse cette limite pour tester le 429.
process.env.RDV_THROTTLE_LIMIT ??= "1000";
process.env.RDV_THROTTLE_TTL ??= "60";
// Pas d'envoi réel en test : MailService reste en mode no-op (boîte d'envoi en mémoire).
delete process.env.RESEND_API_KEY;
delete process.env.TURNSTILE_SECRET;
