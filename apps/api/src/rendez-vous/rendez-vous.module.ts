import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ClientsModule } from "../clients/clients.module";
import { RendezVousController } from "./rendez-vous.controller";
import { RendezVousService } from "./rendez-vous.service";
import { TurnstileService } from "./turnstile.service";

@Module({
  imports: [AuthModule, ClientsModule],
  controllers: [RendezVousController],
  providers: [RendezVousService, TurnstileService],
  exports: [RendezVousService],
})
export class RendezVousModule {}
