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
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Intervenant } from "@hymea/shared";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateIntervenantDto } from "./dto/create-intervenant.dto";
import { ListIntervenantsQuery } from "./dto/list-intervenants.query";
import { UpdateIntervenantDto } from "./dto/update-intervenant.dto";
import { IntervenantsService } from "./intervenants.service";

@ApiTags("intervenants")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("intervenants")
export class IntervenantsController {
  constructor(private readonly intervenants: IntervenantsService) {}

  @Get()
  @ApiOkResponse({ description: "Liste des intervenants (filtre actif optionnel)." })
  findAll(@Query() query: ListIntervenantsQuery): Promise<Intervenant[]> {
    return this.intervenants.findAllIntervenants(query.actif);
  }

  @Post()
  @ApiOkResponse({ description: "Intervenant créé." })
  create(@Body() dto: CreateIntervenantDto): Promise<Intervenant> {
    return this.intervenants.createIntervenant(dto);
  }

  @Get(":id")
  @ApiOkResponse({ description: "Détail d'un intervenant." })
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Intervenant> {
    return this.intervenants.findOneIntervenant(id);
  }

  @Patch(":id")
  @ApiOkResponse({ description: "Intervenant mis à jour." })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateIntervenantDto,
  ): Promise<Intervenant> {
    return this.intervenants.updateIntervenant(id, dto);
  }

  /** Soft-delete : désactive l'intervenant (plus assignable, mais historisé). */
  @Delete(":id")
  @HttpCode(200)
  @ApiOkResponse({ description: "Intervenant désactivé." })
  disable(@Param("id", ParseUUIDPipe) id: string): Promise<Intervenant> {
    return this.intervenants.disableIntervenant(id);
  }
}
