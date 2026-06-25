import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { CalendarController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";

/** Flux iCal lecture seule + gestion des jetons (issue #20). */
@Module({
  imports: [AuthModule],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
