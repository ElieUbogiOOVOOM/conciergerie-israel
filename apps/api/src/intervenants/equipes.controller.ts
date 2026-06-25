import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Equipe } from "@hymea/shared";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateEquipeDto } from "./dto/create-equipe.dto";
import { UpdateEquipeDto } from "./dto/update-equipe.dto";
import { IntervenantsService } from "./intervenants.service";

@ApiTags("equipes")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("equipes")
export class EquipesController {
  constructor(private readonly intervenants: IntervenantsService) {}

  @Get()
  @ApiOkResponse({ description: "Liste des équipes." })
  findAll(): Promise<Equipe[]> {
    return this.intervenants.findAllEquipes();
  }

  @Post()
  @ApiOkResponse({ description: "Équipe créée." })
  create(@Body() dto: CreateEquipeDto): Promise<Equipe> {
    return this.intervenants.createEquipe(dto);
  }

  @Patch(":id")
  @ApiOkResponse({ description: "Équipe mise à jour." })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateEquipeDto): Promise<Equipe> {
    return this.intervenants.updateEquipe(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Équipe supprimée (intervenants détachés)." })
  remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.intervenants.deleteEquipe(id);
  }
}
