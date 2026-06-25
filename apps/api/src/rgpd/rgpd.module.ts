import { Module } from "@nestjs/common";

import { ClientsModule } from "../clients/clients.module";
import { RgpdService } from "./rgpd.service";

/** Rétention RGPD : anonymisation automatique des données expirées (cron, issue #18). */
@Module({
  imports: [ClientsModule],
  providers: [RgpdService],
  exports: [RgpdService],
})
export class RgpdModule {}
