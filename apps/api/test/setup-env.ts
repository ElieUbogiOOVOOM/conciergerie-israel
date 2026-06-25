/**
 * Valeurs d'environnement par défaut pour la suite de tests.
 * En CI, DATABASE_URL est fournie par le service postgres du workflow.
 * En local, on retombe sur la base docker-compose.
 */
process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://hymea:hymea@localhost:5432/hymea";
process.env.API_PORT ??= "4000";
