import {
  Body,
  Controller,
  Get,
  Header,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiTooManyRequestsResponse } from "@nestjs/swagger";
import type { Response } from "express";
import { Throttle } from "@nestjs/throttler";
import type { Paginated, RendezVous, RendezVousDetail } from "@hymea/shared";

// Limite IP de la demande publique (pilotable par env, lue à l'import — comme en test).
const RDV_THROTTLE_LIMIT = Number(process.env.RDV_THROTTLE_LIMIT ?? 5);
const RDV_THROTTLE_TTL_MS = Number(process.env.RDV_THROTTLE_TTL ?? 60) * 1000;

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
  @Throttle({ default: { limit: RDV_THROTTLE_LIMIT, ttl: RDV_THROTTLE_TTL_MS } })
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

  /** Export CSV des RDV (mêmes filtres que la liste). Déclaré avant `:id` pour le routage. */
  @Get("export.csv")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="rendez-vous.csv"')
  @ApiOkResponse({ description: "Fichier CSV des RDV filtrés." })
  async exportCsv(
    @Query() query: ListRendezVousQuery,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const csv = await this.rdv.exportCsv(query);
    res.setHeader("Content-Length", Buffer.byteLength(csv));
    return csv;
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
