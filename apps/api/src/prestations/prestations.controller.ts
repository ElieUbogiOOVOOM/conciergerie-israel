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
import type { Prestation } from "@hymea/shared";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreatePrestationDto } from "./dto/create-prestation.dto";
import { PublicPrestationsQuery } from "./dto/public-prestations.query";
import { UpdatePrestationDto } from "./dto/update-prestation.dto";
import { PrestationsService } from "./prestations.service";

@ApiTags("prestations")
@Controller("prestations")
export class PrestationsController {
  constructor(private readonly prestations: PrestationsService) {}

  /** Endpoint public : prestations actives filtrées par type de client. */
  @Get("public")
  @ApiOkResponse({ description: "Prestations actives de la cible demandée." })
  findPublic(@Query() query: PublicPrestationsQuery): Promise<Prestation[]> {
    return this.prestations.findPublic(query.cible);
  }

  // --- Routes admin (JWT requis) ---

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Prestation créée." })
  create(@Body() dto: CreatePrestationDto): Promise<Prestation> {
    return this.prestations.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Catalogue complet (actives + inactives)." })
  findAll(): Promise<Prestation[]> {
    return this.prestations.findAllAdmin();
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Détail d'une prestation." })
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Prestation> {
    return this.prestations.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Prestation mise à jour." })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrestationDto,
  ): Promise<Prestation> {
    return this.prestations.update(id, dto);
  }

  /** Soft-delete : désactive la prestation (pas de suppression physique). */
  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOkResponse({ description: "Prestation désactivée." })
  disable(@Param("id", ParseUUIDPipe) id: string): Promise<Prestation> {
    return this.prestations.disable(id);
  }
}
