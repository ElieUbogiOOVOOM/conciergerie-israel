import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { PrestationsController } from "./prestations.controller";
import { PrestationsService } from "./prestations.service";

@Module({
  imports: [AuthModule],
  controllers: [PrestationsController],
  providers: [PrestationsService],
  exports: [PrestationsService],
})
export class PrestationsModule {}
