import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Equipe, Intervenant } from "@hymea/shared";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { IntervenantsService } from "./intervenants.service";

/** Intervenants/équipes en lecture seule — réservé au back-office (JWT, issue #36). */
@ApiTags("intervenants")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("intervenants")
export class IntervenantsController {
  constructor(private readonly intervenants: IntervenantsService) {}

  @Get()
  @ApiOkResponse({ description: "Liste des intervenants actifs." })
  list(): Promise<Intervenant[]> {
    return this.intervenants.listActifs();
  }

  @Get("equipes")
  @ApiOkResponse({ description: "Liste des équipes." })
  listEquipes(): Promise<Equipe[]> {
    return this.intervenants.listEquipes();
  }
}
