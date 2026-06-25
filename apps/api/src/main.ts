import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";

import { AppModule } from "./app.module";
import type { Env } from "./config/env.validation";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);

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

  const swaggerConfig = new DocumentBuilder()
    .setTitle("HYMEA API")
    .setDescription("API conciergerie & nettoyage premium (RDV, disponibilités, emails).")
    .setVersion("0.0.0")
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = config.get("API_PORT", { infer: true });
  await app.listen(port);
  console.log(`HYMEA API démarrée sur http://localhost:${port}/api`);
}

void bootstrap();
