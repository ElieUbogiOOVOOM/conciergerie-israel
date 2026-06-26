import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { EquipesController } from "./equipes.controller";
import { IntervenantsController } from "./intervenants.controller";
import { IntervenantsService } from "./intervenants.service";

@Module({
  imports: [AuthModule],
  controllers: [IntervenantsController, EquipesController],
  providers: [IntervenantsService],
  exports: [IntervenantsService],
})
export class IntervenantsModule {}
