import { Module } from "@nestjs/common";

import { RemindersService } from "./reminders.service";

/** Rappels automatiques de RDV (cron horaire, issue #17). MailModule est global. */
@Module({
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
