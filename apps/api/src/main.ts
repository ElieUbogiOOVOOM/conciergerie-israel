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

  // Toutes les routes sont préfixées par /api (le reverse-proxy route /api).
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();
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

  const config = app.get(ConfigService<Env, true>);
  const port = config.get("API_PORT", { infer: true });
  await app.listen(port);
  console.log(`HYMEA API démarrée sur http://localhost:${port}/api`);
}

void bootstrap();
