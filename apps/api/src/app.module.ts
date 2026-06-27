import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AuthModule } from "./auth/auth.module";
import type { Env } from "./config/env.validation";
import { CalendarModule } from "./calendar/calendar.module";
import { ClientsModule } from "./clients/clients.module";
import { validateEnv } from "./config/env.validation";
import { DatabaseModule } from "./database/database.module";
import { DisponibilitesModule } from "./disponibilites/disponibilites.module";
import { HealthModule } from "./health/health.module";
import { IntervenantsModule } from "./intervenants/intervenants.module";
import { MailModule } from "./mail/mail.module";
import { PrestationsModule } from "./prestations/prestations.module";
import { RemindersModule } from "./reminders/reminders.module";
import { RendezVousModule } from "./rendez-vous/rendez-vous.module";
import { RgpdModule } from "./rgpd/rgpd.module";
import { SlotsModule } from "./slots/slots.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // Rate-limit global par défaut (toutes routes), surchargé par @Throttle sur
    // les endpoints publics coûteux (login, refresh, demande de RDV).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [
          {
            name: "default",
            ttl: config.get("API_THROTTLE_TTL", { infer: true }) * 1000,
            limit: config.get("API_THROTTLE_LIMIT", { infer: true }),
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    MailModule,
    HealthModule,
    AuthModule,
    PrestationsModule,
    IntervenantsModule,
    DisponibilitesModule,
    SlotsModule,
    ClientsModule,
    RendezVousModule,
    RemindersModule,
    RgpdModule,
    CalendarModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
