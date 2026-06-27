import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";

import { AppModule } from "./app.module";
import type { Env } from "./config/env.validation";

async function bootstrap(): Promise<void> {
  // bodyParser désactivé ici pour le remplacer par une version bornée (anti-DoS) ci-dessous.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  const config = app.get(ConfigService<Env, true>);
  const isProd = config.get("NODE_ENV", { infer: true }) === "production";

  // En-têtes de sécurité (HSTS, nosniff, frameguard…). L'API ne sert que du JSON :
  // la CSP par défaut de helmet convient ; on coupe juste pour /api/docs (Swagger UI).
  app.use(helmet({ contentSecurityPolicy: false }));
  app.disable("x-powered-by");
  // Derrière le reverse-proxy (Dokploy) : un seul hop de confiance pour lire l'IP cliente
  // réelle (rate-limit, Turnstile) sans accepter un X-Forwarded-For arbitraire.
  app.set("trust proxy", 1);
  // Limite de taille des corps JSON/urlencoded (anti-DoS sur la surface publique).
  app.use(express.json({ limit: "32kb" }));
  app.use(express.urlencoded({ limit: "32kb", extended: true }));

  // Toutes les routes sont préfixées par /api (le reverse-proxy route /api).
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();
  // CORS avec credentials pour le back-office/la vitrine en dev (ports distincts).
  // En prod, admin/web/api sont same-origin via le reverse-proxy : CORS_ORIGINS reste vide.
  const corsOrigins = config.get("CORS_ORIGINS", { infer: true });
  if (corsOrigins) {
    app.enableCors({
      origin: corsOrigins
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
      credentials: true,
    });
  }
  // Lecture du cookie httpOnly portant le refresh token (module Auth).
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  // Swagger : exposé hors production uniquement (évite de cartographier l'API en prod).
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("HYMEA API")
      .setDescription("API conciergerie & nettoyage premium (RDV, disponibilités, emails).")
      .setVersion("0.0.0")
      .build();
    SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  const port = config.get("API_PORT", { infer: true });
  await app.listen(port);
  console.log(`HYMEA API démarrée sur http://localhost:${port}/api`);
}

void bootstrap();
