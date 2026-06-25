import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, Matches } from "class-validator";

/** Requête publique des créneaux disponibles. */
export class AvailableSlotsQuery {
  @ApiProperty({ example: "2026-07-15", description: "Date au format YYYY-MM-DD." })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "date doit être au format YYYY-MM-DD." })
  date!: string;

  @ApiPropertyOptional({
    description: "Prestation ciblée : sa durée détermine le pas des créneaux.",
  })
  @IsOptional()
  @IsUUID()
  prestationId?: string;
}
