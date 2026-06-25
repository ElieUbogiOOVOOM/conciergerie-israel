import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DisponibilitesController } from "./disponibilites.controller";
import { DisponibilitesService } from "./disponibilites.service";

@Module({
  imports: [AuthModule],
  controllers: [DisponibilitesController],
  providers: [DisponibilitesService],
  exports: [DisponibilitesService],
})
export class DisponibilitesModule {}
