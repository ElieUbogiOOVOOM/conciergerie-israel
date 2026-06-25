import { ApiProperty } from "@nestjs/swagger";
import { IsISO8601 } from "class-validator";

/** Replanification d'un RDV : nouveau créneau (issue #15). */
export class RescheduleDto {
  @ApiProperty({ example: "2026-07-05T10:00:00.000Z", description: "Nouveau début de créneau." })
  @IsISO8601()
  debut!: string;
}
