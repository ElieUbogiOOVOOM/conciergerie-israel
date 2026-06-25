import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { CalendarFeedToken } from "@hymea/shared";
import type { Response } from "express";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CalendarService } from "./calendar.service";
import { CreateFeedTokenDto } from "./dto/create-feed-token.dto";

@ApiTags("calendar-feeds")
@Controller("calendar-feeds")
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  // --- Gestion des jetons (back-office, JWT requis) ---

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Jeton d'abonnement iCal créé." })
  createToken(@Body() dto: CreateFeedTokenDto): Promise<CalendarFeedToken> {
    return this.calendar.createToken(dto.label);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: "Liste des jetons d'abonnement iCal." })
  listTokens(): Promise<CalendarFeedToken[]> {
    return this.calendar.listTokens();
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOkResponse({ description: "Jeton révoqué." })
  revokeToken(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.calendar.revokeToken(id);
  }

  // --- Flux public (lecture seule, protégé par le jeton dans l'URL) ---

  /** `.ics` public : 403 si le jeton est absent/révoqué. */
  @Get(":token.ics")
  @Header("Content-Type", "text/calendar; charset=utf-8")
  @ApiOkResponse({ description: "Flux iCal des RDV confirmés/replanifiés." })
  async feed(
    @Param("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const ics = await this.calendar.buildIcs(token);
    res.setHeader("Content-Length", Buffer.byteLength(ics));
    return ics;
  }
}
