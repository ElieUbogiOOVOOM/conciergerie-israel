import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { IntervenantsController } from "./intervenants.controller";
import { IntervenantsService } from "./intervenants.service";

/** Lecture seule des intervenants/équipes pour le back-office (issue #36). */
@Module({
  imports: [AuthModule],
  controllers: [IntervenantsController],
  providers: [IntervenantsService],
  exports: [IntervenantsService],
})
export class IntervenantsModule {}
