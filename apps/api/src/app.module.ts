import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";

import { AuthModule } from "./auth/auth.module";
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
    ScheduleModule.forRoot(),
    DatabaseModule,
    MailModule,
    HealthModule,
    AuthModule,
    PrestationsModule,
    DisponibilitesModule,
    SlotsModule,
    ClientsModule,
    IntervenantsModule,
    RendezVousModule,
    RemindersModule,
    RgpdModule,
    CalendarModule,
  ],
})
export class AppModule {}
