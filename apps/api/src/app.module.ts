import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./auth/auth.module";
import { validateEnv } from "./config/env.validation";
import { DatabaseModule } from "./database/database.module";
import { DisponibilitesModule } from "./disponibilites/disponibilites.module";
import { HealthModule } from "./health/health.module";
import { PrestationsModule } from "./prestations/prestations.module";
import { SlotsModule } from "./slots/slots.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    PrestationsModule,
    DisponibilitesModule,
    SlotsModule,
  ],
})
export class AppModule {}
