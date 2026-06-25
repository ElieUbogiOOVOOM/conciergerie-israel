import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./auth/auth.module";
import { ClientsModule } from "./clients/clients.module";
import { validateEnv } from "./config/env.validation";
import { DatabaseModule } from "./database/database.module";
import { DisponibilitesModule } from "./disponibilites/disponibilites.module";
import { HealthModule } from "./health/health.module";
import { MailModule } from "./mail/mail.module";
import { PrestationsModule } from "./prestations/prestations.module";
import { RendezVousModule } from "./rendez-vous/rendez-vous.module";
import { SlotsModule } from "./slots/slots.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    MailModule,
    HealthModule,
    AuthModule,
    PrestationsModule,
    DisponibilitesModule,
    SlotsModule,
    ClientsModule,
    RendezVousModule,
  ],
})
export class AppModule {}
