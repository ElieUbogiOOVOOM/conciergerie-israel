import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AvailableSlots } from "@hymea/shared";

import { AvailableSlotsQuery } from "./dto/available-slots.query";
import { SlotsService } from "./slots.service";

@ApiTags("slots")
@Controller("slots")
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  /** Endpoint public : créneaux réellement libres pour une date/prestation. */
  @Get()
  @ApiOkResponse({ description: "Créneaux disponibles (instants UTC)." })
  getAvailable(@Query() query: AvailableSlotsQuery): Promise<AvailableSlots> {
    return this.slots.getAvailableSlots(query.date, query.prestationId);
  }
}
