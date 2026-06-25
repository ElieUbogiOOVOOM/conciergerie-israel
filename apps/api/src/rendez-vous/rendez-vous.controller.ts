import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiTooManyRequestsResponse } from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { Paginated, RendezVous, RendezVousDetail } from "@hymea/shared";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AssignIntervenantDto } from "./dto/assign-intervenant.dto";
import { ChangeStatutDto } from "./dto/change-statut.dto";
import { CreateRendezVousDto } from "./dto/create-rendez-vous.dto";
import { ListRendezVousQuery } from "./dto/list-rendez-vous.query";
import { RescheduleDto } from "./dto/reschedule.dto";
import { RendezVousService } from "./rendez-vous.service";

@ApiTags("rendez-vous")
@Controller("rendez-vous")
export class RendezVousController {
  constructor(private readonly rdv: RendezVousService) {}

  /** Endpoint public : création d'une demande (rate-limité par IP + Turnstile + honeypot). */
  @Post()
  @UseGuards(ThrottlerGuard)
  @ApiOkResponse({ description: "Demande de RDV créée (statut NOUVEAU)." })
  @ApiTooManyRequestsResponse({ description: "Trop de demandes depuis cette IP." })
  create(@Body() dto: CreateRendezVousDto, @Ip() ip: string): Promise<RendezVous> {
    return this.rdv.createPublic(dto, ip);
  }

  // --- Routes admin (JWT requis) ---

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Liste paginée des RDV (filtres + recherche)." })
  list(@Query() query: ListRendezVousQuery): Promise<Paginated<RendezVousDetail>> {
    return this.rdv.list(query);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Détail d'un RDV." })
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<RendezVousDetail> {
    return this.rdv.findOne(id);
  }

  @Patch(":id/statut")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Statut mis à jour (transition contrôlée)." })
  changeStatut(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatutDto,
  ): Promise<RendezVousDetail> {
    return this.rdv.changeStatut(id, dto.statut);
  }

  @Patch(":id/intervenant")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Intervenant attribué/retiré." })
  assignIntervenant(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignIntervenantDto,
  ): Promise<RendezVousDetail> {
    return this.rdv.assignIntervenant(id, dto.intervenantId);
  }

  @Patch(":id/replanification")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "RDV replanifié (nouveau créneau)." })
  reschedule(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RescheduleDto,
  ): Promise<RendezVousDetail> {
    return this.rdv.reschedule(id, dto.debut);
  }
}
