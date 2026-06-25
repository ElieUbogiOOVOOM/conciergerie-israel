import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { ExceptionDisponibilite, RegleHebdomadaire } from "@hymea/shared";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DisponibilitesService } from "./disponibilites.service";
import { CreateExceptionDto } from "./dto/create-exception.dto";
import { CreateRegleDto } from "./dto/create-regle.dto";

/** Paramétrage des disponibilités — réservé au back-office (JWT). */
@ApiTags("disponibilites")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("disponibilites")
export class DisponibilitesController {
  constructor(private readonly disponibilites: DisponibilitesService) {}

  // --- Règles hebdomadaires ---

  @Post("regles")
  @ApiOkResponse({ description: "Règle d'ouverture créée." })
  createRegle(@Body() dto: CreateRegleDto): Promise<RegleHebdomadaire> {
    return this.disponibilites.createRegle(dto);
  }

  @Get("regles")
  @ApiOkResponse({ description: "Liste des règles hebdomadaires." })
  listRegles(): Promise<RegleHebdomadaire[]> {
    return this.disponibilites.listRegles();
  }

  @Delete("regles/:id")
  @HttpCode(204)
  @ApiOkResponse({ description: "Règle supprimée." })
  deleteRegle(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.disponibilites.deleteRegle(id);
  }

  // --- Exceptions / blocages ---

  @Post("exceptions")
  @ApiOkResponse({ description: "Exception/blocage créé." })
  createException(@Body() dto: CreateExceptionDto): Promise<ExceptionDisponibilite> {
    return this.disponibilites.createException(dto);
  }

  @Get("exceptions")
  @ApiOkResponse({ description: "Liste des exceptions/blocages." })
  listExceptions(): Promise<ExceptionDisponibilite[]> {
    return this.disponibilites.listExceptions();
  }

  @Delete("exceptions/:id")
  @HttpCode(204)
  @ApiOkResponse({ description: "Exception supprimée." })
  deleteException(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.disponibilites.deleteException(id);
  }
}
