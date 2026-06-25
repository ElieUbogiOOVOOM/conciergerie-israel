import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";

import { AuthModule } from "../auth/auth.module";
import { ClientsModule } from "../clients/clients.module";
import type { Env } from "../config/env.validation";
import { RendezVousController } from "./rendez-vous.controller";
import { RendezVousService } from "./rendez-vous.service";
import { TurnstileService } from "./turnstile.service";

@Module({
  imports: [
    AuthModule,
    ClientsModule,
    // Rate-limit IP sur la demande publique (TTL en ms pour @nestjs/throttler v6).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [
          {
            ttl: config.get("RDV_THROTTLE_TTL", { infer: true }) * 1000,
            limit: config.get("RDV_THROTTLE_LIMIT", { infer: true }),
          },
        ],
      }),
    }),
  ],
  controllers: [RendezVousController],
  providers: [RendezVousService, TurnstileService],
  exports: [RendezVousService],
})
export class RendezVousModule {}
