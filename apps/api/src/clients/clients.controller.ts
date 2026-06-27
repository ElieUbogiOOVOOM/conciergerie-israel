import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Client, ClientAvecHistorique, Paginated } from "@hymea/shared";

import { type AuthenticatedRequest, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ClientsService } from "./clients.service";
import { ListClientsQuery } from "./dto/list-clients.query";

/** Gestion des clients — réservé au back-office (JWT). */
@ApiTags("clients")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("clients")
export class ClientsController {
  private readonly audit = new Logger("ClientsAudit");

  constructor(private readonly clients: ClientsService) {}

  @Get()
  @ApiOkResponse({ description: "Liste paginée des clients." })
  list(@Query() query: ListClientsQuery): Promise<Paginated<Client>> {
    return this.clients.list({ page: query.page, pageSize: query.pageSize, search: query.search });
  }

  @Get(":id")
  @ApiOkResponse({ description: "Fiche d'un client." })
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Client> {
    return this.clients.findOne(id);
  }

  @Get(":id/rendez-vous")
  @ApiOkResponse({ description: "Fiche client + historique de ses RDV." })
  findHistorique(@Param("id", ParseUUIDPipe) id: string): Promise<ClientAvecHistorique> {
    return this.clients.findHistorique(id);
  }

  /** RGPD : anonymise les PII en conservant l'historique RDV. */
  @Post(":id/anonymisation")
  @HttpCode(200)
  @ApiOkResponse({ description: "Client anonymisé (PII effacées)." })
  anonymize(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Client> {
    this.audit.warn(`anonymisation client=${id} par admin=${req.admin.id} (${req.admin.email})`);
    return this.clients.anonymize(id);
  }

  /** RGPD : suppression définitive (cascade sur les RDV). */
  @Delete(":id")
  @HttpCode(204)
  @ApiOkResponse({ description: "Client supprimé." })
  remove(@Param("id", ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest): Promise<void> {
    this.audit.warn(`suppression client=${id} par admin=${req.admin.id} (${req.admin.email})`);
    return this.clients.remove(id);
  }
}
